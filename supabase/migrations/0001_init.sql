-- Nous & Chill — schema initial Supabase (remplace n8n/Airtable + login par code)
-- À exécuter une fois dans le SQL Editor de Supabase Studio.

create extension if not exists pgcrypto;

-- ============================================================
-- profiles (lié à auth.users — pas de magic_token/session_token,
-- Supabase Auth gère déjà email/mot de passe/sessions)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('aventurier','ami')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================
-- invite_codes — reprend les 4 codes secrets actuels comme
-- codes d'invitation déterminant le rôle attribué à l'inscription
-- ============================================================
create table public.invite_codes (
  code text primary key,
  role text not null check (role in ('aventurier','ami')),
  single_use boolean not null default false,
  used_by uuid references auth.users(id),
  used_at timestamptz
);

alter table public.invite_codes enable row level security;
-- Pas de policy publique : uniquement lu/écrit par le trigger SECURITY DEFINER ci-dessous.

insert into public.invite_codes (code, role, single_use) values
  ('lesmeilleurs', 'ami', false),
  ('quelcourage', 'ami', false);

-- Crée le profil au moment de l'inscription. Deux parcours possibles,
-- distingués par raw_user_meta_data->>'mode' :
--   - 'create' : fonder l'aventure — devient 'aventurier' (rôle organisateur,
--     n'importe qui peut fonder, pas de limite ni de code requis).
--   - 'join' (par défaut) : rejoindre l'aventure — un code d'invitation
--     valide est requis et attribue le rôle 'ami' (suiveur).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_code text;
  v_name text;
  v_invite record;
begin
  v_mode := coalesce(new.raw_user_meta_data->>'mode', 'join');
  v_name := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));

  if v_mode = 'create' then
    insert into public.profiles (id, name, role) values (new.id, v_name, 'aventurier');
  else
    v_code := new.raw_user_meta_data->>'invite_code';

    if v_code is null then
      raise exception 'invite_code_required';
    end if;

    select * into v_invite from public.invite_codes where code = v_code for update;

    if v_invite is null then
      raise exception 'invalid_invite_code';
    end if;

    if v_invite.single_use and v_invite.used_by is not null then
      raise exception 'invite_code_already_used';
    end if;

    insert into public.profiles (id, name, role) values (new.id, v_name, v_invite.role);

    if v_invite.single_use then
      update public.invite_codes set used_by = new.id, used_at = now() where code = v_code;
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger générique pour maintenir updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- settings — ligne unique (saison débloquée / date de fin)
-- créée avant `reviews` car sa policy de lecture s'appuie dessus
-- ============================================================
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  season_unlocked boolean not null default false,
  season_end_date date
);

alter table public.settings enable row level security;

create policy "settings_select_authenticated" on public.settings
  for select to authenticated using (true);

create policy "settings_update_admin" on public.settings
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  );

insert into public.settings (season_unlocked, season_end_date) values (false, '2025-06-30');

-- ============================================================
-- episodes
-- ============================================================
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  number int4 not null unique,
  title text not null,
  date date not null,
  place text not null,
  duration text,
  tags text[],
  cover_url text,
  notes text,
  music_url text,
  created_at timestamptz not null default now()
);

alter table public.episodes enable row level security;

create policy "episodes_select_authenticated" on public.episodes
  for select to authenticated using (true);

create policy "episodes_insert_admin" on public.episodes
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  );

create policy "episodes_update_admin" on public.episodes
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  );

-- ============================================================
-- episode_media (upload de fichiers — bucket Storage `episode-media`)
-- ============================================================
create table public.episode_media (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  url text not null,
  filename text not null,
  type text not null check (type in ('image','video','file')),
  content_type text,
  size int8,
  created_at timestamptz not null default now()
);

alter table public.episode_media enable row level security;

create policy "episode_media_select_authenticated" on public.episode_media
  for select to authenticated using (true);

create policy "episode_media_insert_admin" on public.episode_media
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  );

-- ============================================================
-- episode_likes
-- ============================================================
create table public.episode_likes (
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (episode_id, user_id)
);

alter table public.episode_likes enable row level security;

create policy "episode_likes_select_authenticated" on public.episode_likes
  for select to authenticated using (true);

create policy "episode_likes_insert_own" on public.episode_likes
  for insert to authenticated with check (user_id = auth.uid());

create policy "episode_likes_delete_own" on public.episode_likes
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- reviews — confidentialité : chacun voit toujours sa propre review,
-- celle du partenaire seulement si settings.season_unlocked = true.
-- author_role rempli automatiquement depuis profiles (jamais du payload).
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null,
  rating int4 not null check (rating between 1 and 5),
  favorite_moment text,
  awkward_moment text,
  funny_quote text,
  summary text,
  would_redo text check (would_redo in ('yes','no','maybe')),
  song text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id, author_id)
);

create or replace function public.set_review_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select p.name, p.role into new.author_name, new.author_role
    from public.profiles p where p.id = new.author_id;
  return new;
end;
$$;

create trigger reviews_set_author
  before insert or update on public.reviews
  for each row execute function public.set_review_author();

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

create policy "reviews_select_own_or_unlocked" on public.reviews
  for select to authenticated using (
    author_id = auth.uid()
    or coalesce((select season_unlocked from public.settings limit 1), false)
  );

create policy "reviews_insert_own" on public.reviews
  for insert to authenticated with check (author_id = auth.uid());

create policy "reviews_update_own" on public.reviews
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ============================================================
-- episode_comments — author_name/author_role remplis depuis profiles
-- ============================================================
create table public.episode_comments (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select p.name, p.role into new.author_name, new.author_role
    from public.profiles p where p.id = new.author_id;
  return new;
end;
$$;

create trigger episode_comments_set_author
  before insert on public.episode_comments
  for each row execute function public.set_comment_author();

alter table public.episode_comments enable row level security;

create policy "episode_comments_select_authenticated" on public.episode_comments
  for select to authenticated using (true);

create policy "episode_comments_insert_own" on public.episode_comments
  for insert to authenticated with check (author_id = auth.uid());

-- ============================================================
-- comment_reactions (emoji)
-- ============================================================
create table public.comment_reactions (
  comment_id uuid not null references public.episode_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);

alter table public.comment_reactions enable row level security;

create policy "comment_reactions_select_authenticated" on public.comment_reactions
  for select to authenticated using (true);

create policy "comment_reactions_insert_own" on public.comment_reactions
  for insert to authenticated with check (user_id = auth.uid());

create policy "comment_reactions_delete_own" on public.comment_reactions
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- ideas
-- ============================================================
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'voting' check (status in ('voting','selected','scheduled','done')),
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create policy "ideas_select_authenticated" on public.ideas
  for select to authenticated using (true);

create policy "ideas_insert_own" on public.ideas
  for insert to authenticated with check (proposed_by = auth.uid());

create policy "ideas_update_status_admin" on public.ideas
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  );

-- ============================================================
-- idea_votes (like/dislike — un vote par idée et par personne)
-- ============================================================
create table public.idea_votes (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('like','dislike')),
  voted_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.idea_votes enable row level security;

create policy "idea_votes_select_authenticated" on public.idea_votes
  for select to authenticated using (true);

create policy "idea_votes_insert_own" on public.idea_votes
  for insert to authenticated with check (user_id = auth.uid());

create policy "idea_votes_update_own" on public.idea_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "idea_votes_delete_own" on public.idea_votes
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- vote_questions / vote_ballots / vote_results
-- Anonymat préservé : vote_ballots ne stocke PAS le choix (sert
-- uniquement à empêcher le double-vote) ; les deux tables ne sont
-- mutées que via la fonction cast_vote() (SECURITY DEFINER).
-- ============================================================
create table public.vote_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

alter table public.vote_questions enable row level security;

create policy "vote_questions_select_authenticated" on public.vote_questions
  for select to authenticated using (true);

create table public.vote_ballots (
  question_id uuid not null references public.vote_questions(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (question_id, voter_id)
);

alter table public.vote_ballots enable row level security;

create policy "vote_ballots_select_own" on public.vote_ballots
  for select to authenticated using (voter_id = auth.uid());
-- Pas de policy insert : lignes créées exclusivement par cast_vote().

create table public.vote_results (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.vote_questions(id) on delete cascade,
  option text not null,
  count int4 not null default 0,
  unique (question_id, option)
);

alter table public.vote_results enable row level security;

create policy "vote_results_select_authenticated" on public.vote_results
  for select to authenticated using (true);
-- Pas de policy insert/update : compteurs mutés exclusivement par cast_vote().

create or replace function public.cast_vote(p_question_id uuid, p_option text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
  v_valid_option boolean;
begin
  select active, (options @> to_jsonb(p_option))
    into v_active, v_valid_option
    from public.vote_questions where id = p_question_id;

  if v_active is null then
    raise exception 'question_not_found';
  end if;
  if not v_active then
    raise exception 'question_closed';
  end if;
  if not v_valid_option then
    raise exception 'invalid_option';
  end if;

  insert into public.vote_ballots (question_id, voter_id) values (p_question_id, auth.uid());
  -- lève unique_violation (23505) si cette personne a déjà voté sur cette question

  insert into public.vote_results (question_id, option, count)
  values (p_question_id, p_option, 1)
  on conflict (question_id, option) do update set count = public.vote_results.count + 1;
end;
$$;

grant execute on function public.cast_vote(uuid, text) to authenticated;

-- ============================================================
-- synthese (résumé IA de la saison — ligne unique)
-- ============================================================
create table public.synthese (
  id uuid primary key default gen_random_uuid(),
  body_md text,
  generated_at timestamptz,
  avg_rating numeric,
  best_episode_id uuid references public.episodes(id)
);

alter table public.synthese enable row level security;

create policy "synthese_select_authenticated" on public.synthese
  for select to authenticated using (true);

create policy "synthese_admin_write" on public.synthese
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  );

insert into public.synthese (body_md, generated_at) values (null, null);

-- ============================================================
-- Storage : bucket pour les médias d'épisodes
-- ============================================================
insert into storage.buckets (id, name, public)
values ('episode-media', 'episode-media', true)
on conflict (id) do nothing;

create policy "episode_media_storage_read" on storage.objects
  for select using (bucket_id = 'episode-media');

create policy "episode_media_storage_write_admin" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'episode-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'aventurier')
  );

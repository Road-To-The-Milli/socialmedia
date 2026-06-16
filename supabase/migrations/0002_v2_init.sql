-- Nous & Chill v2 — Schéma multi-espaces
-- À exécuter après 0000_reset.sql dans le SQL Editor de Supabase Studio.
--
-- Architecture : tout est scopé à un `space_id`.
-- Un utilisateur peut appartenir à plusieurs espaces avec des rôles différents.
-- Rôles : owner (admin), member (participant actif), observer (lecture seule).

create extension if not exists pgcrypto;

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Maintient updated_at automatiquement sur les tables qui en ont besoin.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PROFILES
-- Étendu à partir de auth.users. Créé automatiquement à l'inscription.
-- ============================================================
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  name       text        not null,
  avatar_url text,
  bio        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Crée le profil à l'inscription. Le nom est lu depuis raw_user_meta_data->>'name'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );
  insert into public.profiles (id, name) values (new.id, v_name);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SPACES
-- L'unité centrale : une aventure partagée entre N personnes.
-- Exemples : un couple, un groupe en vacances, un mariage, une famille.
-- ============================================================
create table public.spaces (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        not null unique,
  name             text        not null,
  description      text,
  cover_url        text,
  -- type est un indice UI uniquement (pas de logique métier dessus)
  type             text        not null default 'other'
                               check (type in ('couple','friends','family','event','other')),
  season_start     date,
  season_end       date,
  season_unlocked  boolean     not null default false,
  created_by       uuid        not null references public.profiles(id) on delete restrict,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

alter table public.spaces enable row level security;

-- Les policies de spaces qui référencent space_members sont définies
-- plus bas, après la création de space_members (contrainte d'ordre SQL).

-- ============================================================
-- SPACE_MEMBERS
-- Appartenance d'un utilisateur à un espace avec son rôle.
-- ============================================================
create table public.space_members (
  space_id   uuid        not null references public.spaces(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  role       text        not null check (role in ('owner','member','observer')),
  invited_by uuid        references public.profiles(id) on delete set null,
  joined_at  timestamptz not null default now(),
  primary key (space_id, user_id)
);

-- Index pour les requêtes fréquentes : "tous les espaces d'un user" et
-- "tous les membres d'un espace".
create index on public.space_members(user_id);
create index on public.space_members(space_id);

alter table public.space_members enable row level security;

-- Un membre voit les autres membres des espaces dont il fait partie.
create policy "space_members_select_member" on public.space_members
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm2
      where sm2.space_id = space_id and sm2.user_id = auth.uid()
    )
  );

-- L'owner peut ajouter des membres. La fonction join_space() peut aussi insérer
-- (elle est SECURITY DEFINER et contourne les RLS).
create policy "space_members_insert_owner" on public.space_members
  for insert to authenticated with check (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- L'owner peut changer le rôle d'un membre. Un membre peut se retirer lui-même.
create policy "space_members_update_owner" on public.space_members
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create policy "space_members_delete_owner_or_self" on public.space_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- Policies de spaces (définies ici car elles référencent space_members).
-- Un utilisateur ne voit que les espaces dont il est membre.
create policy "spaces_select_member" on public.spaces
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = id and sm.user_id = auth.uid()
    )
  );

-- N'importe quel utilisateur connecté peut créer un espace (via create_space()).
create policy "spaces_insert_authenticated" on public.spaces
  for insert to authenticated with check (created_by = auth.uid());

-- Seul l'owner peut modifier l'espace.
create policy "spaces_update_owner" on public.spaces
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- Seul l'owner peut supprimer l'espace.
create policy "spaces_delete_owner" on public.spaces
  for delete to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- ============================================================
-- INVITE_CODES
-- Codes d'invitation scopés à un espace, avec contrôle de validité.
-- ============================================================
create table public.invite_codes (
  id         uuid        primary key default gen_random_uuid(),
  code       text        not null unique,
  space_id   uuid        not null references public.spaces(id) on delete cascade,
  role       text        not null check (role in ('member','observer')),
  max_uses   int,        -- null = illimité
  use_count  int         not null default 0,
  expires_at timestamptz,
  created_by uuid        not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index on public.invite_codes(space_id);
create index on public.invite_codes(code);

alter table public.invite_codes enable row level security;

-- Les membres d'un espace voient ses codes d'invitation.
create policy "invite_codes_select_member" on public.invite_codes
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid()
    )
  );

-- Seul l'owner peut créer ou supprimer des codes.
create policy "invite_codes_insert_owner" on public.invite_codes
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create policy "invite_codes_delete_owner" on public.invite_codes
  for delete to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- ============================================================
-- EPISODES
-- Un moment vécu par le groupe. Appartient à un espace.
-- ============================================================
create table public.episodes (
  id         uuid        primary key default gen_random_uuid(),
  space_id   uuid        not null references public.spaces(id) on delete cascade,
  number     int         not null,
  title      text        not null,
  date       date        not null,
  place      text        not null,
  duration   text,
  tags       text[],
  cover_url  text,
  notes      text,
  music_url  text,
  created_by uuid        not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, number)
);

create index on public.episodes(space_id);
create index on public.episodes(space_id, date desc);

create trigger episodes_set_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();

alter table public.episodes enable row level security;

create policy "episodes_select_member" on public.episodes
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid()
    )
  );

-- Owner et member peuvent créer des épisodes. L'observer ne peut pas.
create policy "episodes_insert_owner_member" on public.episodes
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

-- Seul l'owner peut modifier ou supprimer un épisode.
create policy "episodes_update_owner" on public.episodes
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create policy "episodes_delete_owner" on public.episodes
  for delete to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- ============================================================
-- EPISODE_MEDIA
-- Photos et vidéos uploadées dans un épisode.
-- space_id est dénormalisé pour éviter une jointure dans les RLS.
-- ============================================================
create table public.episode_media (
  id           uuid        primary key default gen_random_uuid(),
  episode_id   uuid        not null references public.episodes(id) on delete cascade,
  space_id     uuid        not null references public.spaces(id) on delete cascade,
  url          text        not null,
  filename     text        not null,
  type         text        not null check (type in ('image','video','file')),
  content_type text,
  size         int8,
  uploaded_by  uuid        not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now()
);

create index on public.episode_media(episode_id);
create index on public.episode_media(space_id);

alter table public.episode_media enable row level security;

create policy "episode_media_select_member" on public.episode_media
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid()
    )
  );

-- Owner et member peuvent uploader des médias.
create policy "episode_media_insert_owner_member" on public.episode_media
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

-- Uploader ou owner peut supprimer.
create policy "episode_media_delete_uploader_or_owner" on public.episode_media
  for delete to authenticated using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- ============================================================
-- EPISODE_LIKES
-- ============================================================
create table public.episode_likes (
  episode_id uuid        not null references public.episodes(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (episode_id, user_id)
);

create index on public.episode_likes(episode_id);

alter table public.episode_likes enable row level security;

create policy "episode_likes_select_member" on public.episode_likes
  for select to authenticated using (
    exists (
      select 1 from public.episodes e
      join public.space_members sm on sm.space_id = e.space_id
      where e.id = episode_id and sm.user_id = auth.uid()
    )
  );

create policy "episode_likes_insert_own" on public.episode_likes
  for insert to authenticated with check (user_id = auth.uid());

create policy "episode_likes_delete_own" on public.episode_likes
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- REVIEWS
-- Review privée de chaque membre pour un épisode.
-- Visible par tous seulement quand season_unlocked = true sur l'espace.
-- author_name est un snapshot pris au moment de l'écriture.
-- ============================================================
create table public.reviews (
  id               uuid        primary key default gen_random_uuid(),
  episode_id       uuid        not null references public.episodes(id) on delete cascade,
  space_id         uuid        not null references public.spaces(id) on delete cascade,
  author_id        uuid        not null references public.profiles(id) on delete cascade,
  author_name      text        not null,
  rating           int         not null check (rating between 1 and 5),
  favorite_moment  text,
  awkward_moment   text,
  funny_quote      text,
  summary          text,
  would_redo       text        check (would_redo in ('yes','no','maybe')),
  song             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (episode_id, author_id)
);

create index on public.reviews(episode_id);
create index on public.reviews(space_id);
create index on public.reviews(author_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Snapshot automatique du nom de l'auteur à l'insertion/mise à jour.
create or replace function public.set_review_author_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select name into new.author_name from public.profiles where id = new.author_id;
  return new;
end;
$$;

create trigger reviews_set_author
  before insert or update on public.reviews
  for each row execute function public.set_review_author_snapshot();

alter table public.reviews enable row level security;

-- Sa propre review : toujours visible.
-- Celle des autres : uniquement si la saison est débloquée pour cet espace.
create policy "reviews_select_own_or_unlocked" on public.reviews
  for select to authenticated using (
    author_id = auth.uid()
    or exists (
      select 1 from public.spaces s
      join public.space_members sm on sm.space_id = s.id
      where s.id = space_id
        and sm.user_id = auth.uid()
        and s.season_unlocked = true
    )
  );

-- Owner et member peuvent écrire une review. L'observer ne peut pas.
create policy "reviews_insert_owner_member" on public.reviews
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

create policy "reviews_update_own" on public.reviews
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ============================================================
-- EPISODE_COMMENTS
-- Commentaires publics sur un épisode (visibles par tous les membres).
-- ============================================================
create table public.episode_comments (
  id          uuid        primary key default gen_random_uuid(),
  episode_id  uuid        not null references public.episodes(id) on delete cascade,
  space_id    uuid        not null references public.spaces(id) on delete cascade,
  author_id   uuid        not null references public.profiles(id) on delete cascade,
  author_name text        not null,
  body        text        not null,
  created_at  timestamptz not null default now()
);

create index on public.episode_comments(episode_id);
create index on public.episode_comments(space_id);

-- Snapshot du nom de l'auteur à l'insertion.
create or replace function public.set_comment_author_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select name into new.author_name from public.profiles where id = new.author_id;
  return new;
end;
$$;

create trigger episode_comments_set_author
  before insert on public.episode_comments
  for each row execute function public.set_comment_author_snapshot();

alter table public.episode_comments enable row level security;

create policy "episode_comments_select_member" on public.episode_comments
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid()
    )
  );

-- Owner et member peuvent commenter. L'observer ne peut pas.
create policy "episode_comments_insert_owner_member" on public.episode_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

-- L'auteur ou l'owner peut supprimer un commentaire.
create policy "episode_comments_delete_author_or_owner" on public.episode_comments
  for delete to authenticated using (
    author_id = auth.uid()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- ============================================================
-- COMMENT_REACTIONS
-- Réactions emoji sur les commentaires.
-- ============================================================
create table public.comment_reactions (
  comment_id uuid        not null references public.episode_comments(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  emoji      text        not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);

create index on public.comment_reactions(comment_id);

alter table public.comment_reactions enable row level security;

create policy "comment_reactions_select_member" on public.comment_reactions
  for select to authenticated using (
    exists (
      select 1 from public.episode_comments ec
      join public.space_members sm on sm.space_id = ec.space_id
      where ec.id = comment_id and sm.user_id = auth.uid()
    )
  );

create policy "comment_reactions_insert_own" on public.comment_reactions
  for insert to authenticated with check (user_id = auth.uid());

create policy "comment_reactions_delete_own" on public.comment_reactions
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- IDEAS
-- Idées d'aventures proposées par les membres, avec statut.
-- ============================================================
create table public.ideas (
  id          uuid        primary key default gen_random_uuid(),
  space_id    uuid        not null references public.spaces(id) on delete cascade,
  title       text        not null,
  description text,
  proposed_by uuid        not null references public.profiles(id) on delete cascade,
  status      text        not null default 'voting'
                          check (status in ('voting','selected','scheduled','done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on public.ideas(space_id);

create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

alter table public.ideas enable row level security;

create policy "ideas_select_member" on public.ideas
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid()
    )
  );

-- Owner et member peuvent proposer des idées.
create policy "ideas_insert_owner_member" on public.ideas
  for insert to authenticated with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

-- Seul l'owner peut changer le statut d'une idée.
create policy "ideas_update_owner" on public.ideas
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- ============================================================
-- IDEA_VOTES
-- Un vote par idée par utilisateur (like ou dislike).
-- ============================================================
create table public.idea_votes (
  idea_id  uuid        not null references public.ideas(id) on delete cascade,
  user_id  uuid        not null references public.profiles(id) on delete cascade,
  kind     text        not null check (kind in ('like','dislike')),
  voted_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create index on public.idea_votes(idea_id);

alter table public.idea_votes enable row level security;

create policy "idea_votes_select_member" on public.idea_votes
  for select to authenticated using (
    exists (
      select 1 from public.ideas i
      join public.space_members sm on sm.space_id = i.space_id
      where i.id = idea_id and sm.user_id = auth.uid()
    )
  );

create policy "idea_votes_insert_own" on public.idea_votes
  for insert to authenticated with check (user_id = auth.uid());

create policy "idea_votes_update_own" on public.idea_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "idea_votes_delete_own" on public.idea_votes
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- VOTE_QUESTIONS / VOTE_BALLOTS / VOTE_RESULTS
-- Sondages anonymes scopés à un espace.
-- L'anonymat est garanti : vote_ballots ne stocke PAS le choix,
-- uniquement le fait d'avoir voté. Toutes les mutations passent
-- par la fonction cast_vote() (SECURITY DEFINER).
-- ============================================================
create table public.vote_questions (
  id         uuid        primary key default gen_random_uuid(),
  space_id   uuid        not null references public.spaces(id) on delete cascade,
  question   text        not null,
  options    jsonb       not null default '[]'::jsonb,
  active     boolean     not null default true,
  created_by uuid        not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index on public.vote_questions(space_id);

alter table public.vote_questions enable row level security;

create policy "vote_questions_select_member" on public.vote_questions
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid()
    )
  );

-- Seul l'owner peut créer des questions.
create policy "vote_questions_insert_owner" on public.vote_questions
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create policy "vote_questions_update_owner" on public.vote_questions
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create table public.vote_ballots (
  question_id uuid        not null references public.vote_questions(id) on delete cascade,
  voter_id    uuid        not null references public.profiles(id) on delete cascade,
  voted_at    timestamptz not null default now(),
  primary key (question_id, voter_id)
);

alter table public.vote_ballots enable row level security;

-- Un électeur peut voir qu'il a voté (pour l'UI), mais pas les autres.
create policy "vote_ballots_select_own" on public.vote_ballots
  for select to authenticated using (voter_id = auth.uid());
-- Pas de policy INSERT : géré exclusivement par cast_vote().

create table public.vote_results (
  id          uuid  primary key default gen_random_uuid(),
  question_id uuid  not null references public.vote_questions(id) on delete cascade,
  option      text  not null,
  count       int   not null default 0,
  unique (question_id, option)
);

create index on public.vote_results(question_id);

alter table public.vote_results enable row level security;

create policy "vote_results_select_member" on public.vote_results
  for select to authenticated using (
    exists (
      select 1 from public.vote_questions vq
      join public.space_members sm on sm.space_id = vq.space_id
      where vq.id = question_id and sm.user_id = auth.uid()
    )
  );
-- Pas de policy INSERT/UPDATE : géré exclusivement par cast_vote().

-- Vote atomique et anonyme : vérifie la validité, insère le ballot,
-- incrémente le compteur. Une exception est levée si l'user a déjà voté.
create or replace function public.cast_vote(p_question_id uuid, p_option text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active       boolean;
  v_valid_option boolean;
begin
  select active, (options @> to_jsonb(p_option))
    into v_active, v_valid_option
    from public.vote_questions where id = p_question_id;

  if v_active is null    then raise exception 'question_not_found'; end if;
  if not v_active        then raise exception 'question_closed';    end if;
  if not v_valid_option  then raise exception 'invalid_option';     end if;

  -- Lève unique_violation (23505) si l'user a déjà voté → double-vote bloqué.
  insert into public.vote_ballots (question_id, voter_id) values (p_question_id, auth.uid());

  insert into public.vote_results (question_id, option, count)
  values (p_question_id, p_option, 1)
  on conflict (question_id, option) do update set count = public.vote_results.count + 1;
end;
$$;

grant execute on function public.cast_vote(uuid, text) to authenticated;

-- ============================================================
-- SYNTHESE
-- Résumé IA généré à la fin de la saison. Une ligne par espace.
-- Contient aussi l'URL de la vidéo souvenir une fois générée.
-- ============================================================
create table public.synthese (
  id               uuid        primary key default gen_random_uuid(),
  space_id         uuid        not null unique references public.spaces(id) on delete cascade,
  body_md          text,
  generated_at     timestamptz,
  avg_rating       numeric,
  best_episode_id  uuid        references public.episodes(id) on delete set null,
  video_url        text,
  video_generated_at timestamptz
);

alter table public.synthese enable row level security;

create policy "synthese_select_member" on public.synthese
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid()
    )
  );

-- Seul l'owner peut écrire/modifier la synthèse (ou une edge function via service role).
create policy "synthese_write_owner" on public.synthese
  for all to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  ) with check (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- ============================================================
-- FONCTIONS MÉTIER
-- ============================================================

-- Crée un espace et ajoute automatiquement le créateur comme owner.
-- Usage : select create_space('Vacances Grèce', 'Notre été 2026', 'friends', '2026-07-01', '2026-08-31', null);
create or replace function public.create_space(
  p_name        text,
  p_description text        default null,
  p_type        text        default 'other',
  p_season_start date       default current_date,
  p_season_end  date        default null,
  p_cover_url   text        default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_id uuid;
  v_slug     text;
  v_suffix   text;
begin
  -- Génère un slug URL-safe à partir du nom + 8 chars aléatoires pour l'unicité.
  v_slug := lower(regexp_replace(
    regexp_replace(p_name, '[^a-zA-Z0-9\s\-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  v_suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_slug := v_slug || '-' || v_suffix;

  insert into public.spaces (name, slug, description, type, cover_url, season_start, season_end, created_by)
  values (p_name, v_slug, p_description, p_type, p_cover_url, p_season_start, p_season_end, auth.uid())
  returning id into v_space_id;

  -- Le créateur devient owner automatiquement.
  insert into public.space_members (space_id, user_id, role)
  values (v_space_id, auth.uid(), 'owner');

  -- Crée une ligne synthese vide pour cet espace.
  insert into public.synthese (space_id) values (v_space_id);

  return v_space_id;
end;
$$;

grant execute on function public.create_space(text, text, text, date, date, text) to authenticated;

-- Rejoint un espace via un code d'invitation.
-- Valide le code, vérifie l'expiration et le quota, ajoute le membre.
-- Retourne un JSON avec les infos de l'espace rejoint.
-- Usage : select join_space('ABCD1234');
create or replace function public.join_space(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_space  record;
begin
  select * into v_invite
  from public.invite_codes
  where code = p_code
  for update;

  if v_invite is null then
    raise exception 'invalid_invite_code';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'invite_code_expired';
  end if;

  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'invite_code_exhausted';
  end if;

  if exists (
    select 1 from public.space_members
    where space_id = v_invite.space_id and user_id = auth.uid()
  ) then
    raise exception 'already_member';
  end if;

  insert into public.space_members (space_id, user_id, role, invited_by)
  values (v_invite.space_id, auth.uid(), v_invite.role, v_invite.created_by);

  update public.invite_codes
  set use_count = use_count + 1
  where id = v_invite.id;

  select row_to_json(s) into v_space from public.spaces s where s.id = v_invite.space_id;
  return v_space;
end;
$$;

grant execute on function public.join_space(text) to authenticated;

-- ============================================================
-- STORAGE — bucket episode-media
-- ============================================================
insert into storage.buckets (id, name, public)
values ('episode-media', 'episode-media', true)
on conflict (id) do nothing;

-- Lecture publique (les médias sont servis depuis des URL publiques).
create policy "episode_media_storage_read" on storage.objects
  for select using (bucket_id = 'episode-media');

-- Écriture : owner ou member du space correspondant.
-- La structure du path doit être : {space_id}/{episode_id}/{filename}
create policy "episode_media_storage_write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'episode-media'
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = (storage.foldername(name))[1]::uuid
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

-- Suppression : uploader uniquement (géré côté applicatif).
create policy "episode_media_storage_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'episode-media' and owner = auth.uid()
  );

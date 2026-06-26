-- Système de logs métier pour tracer les événements importants de l'app.
-- Les logs sont conservés indéfiniment, scopés par espace, lisibles par l'owner.
-- Tous les inserts passent par log_event() (SECURITY DEFINER) — jamais directement.

-- ============================================================
-- TABLE AUDIT_LOGS
-- ============================================================
create table public.audit_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references public.profiles(id) on delete set null,
  space_id   uuid        references public.spaces(id) on delete cascade,
  action     text        not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index on public.audit_logs(space_id, created_at desc);
create index on public.audit_logs(user_id, created_at desc);
create index on public.audit_logs(action);

alter table public.audit_logs enable row level security;

-- Un utilisateur voit ses propres logs et les logs des espaces où il est owner.
create policy "audit_logs_select" on public.audit_logs
  for select to authenticated using (
    user_id = auth.uid()
    or public.my_space_role(space_id) = 'owner'
  );

-- Aucun insert direct depuis le client — uniquement via log_event().
create policy "audit_logs_insert_deny" on public.audit_logs
  for insert to authenticated with check (false);

-- ============================================================
-- FONCTION log_event
-- Point d'entrée unique pour tous les logs. SECURITY DEFINER
-- pour contourner la policy d'insert ci-dessus.
-- ============================================================
create or replace function public.log_event(
  p_action   text,
  p_space_id uuid  default null,
  p_metadata jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (user_id, space_id, action, metadata)
  values (auth.uid(), p_space_id, p_action, p_metadata);
$$;

grant execute on function public.log_event(text, uuid, jsonb) to authenticated;

-- ============================================================
-- TRIGGERS sur les tables à fort intérêt métier
-- Les triggers appellent log_event() après chaque opération.
-- ============================================================

-- episodes : log à la création
create or replace function public._log_episode_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_event(
    'episode_created',
    new.space_id,
    jsonb_build_object('episode_id', new.id, 'title', new.title, 'number', new.number)
  );
  return null;
end;
$$;

create trigger log_episode_created
  after insert on public.episodes
  for each row execute function public._log_episode_created();

-- reviews : log à la création et à la mise à jour
create or replace function public._log_review_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_event(
      'review_submitted',
      new.space_id,
      jsonb_build_object('episode_id', new.episode_id, 'rating', new.rating)
    );
  else
    perform public.log_event(
      'review_updated',
      new.space_id,
      jsonb_build_object('episode_id', new.episode_id, 'rating', new.rating)
    );
  end if;
  return null;
end;
$$;

create trigger log_review_event
  after insert or update on public.reviews
  for each row execute function public._log_review_event();

-- spaces : log quand season_unlocked passe à true
create or replace function public._log_season_unlocked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.season_unlocked = false and new.season_unlocked = true then
    perform public.log_event(
      'season_unlocked',
      new.id,
      jsonb_build_object('space_name', new.name)
    );
  end if;
  return null;
end;
$$;

create trigger log_season_unlocked
  after update on public.spaces
  for each row execute function public._log_season_unlocked();

-- invite_codes : log à la création
create or replace function public._log_invite_code_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_event(
    'invite_code_created',
    new.space_id,
    jsonb_build_object('role', new.role, 'max_uses', new.max_uses)
  );
  return null;
end;
$$;

create trigger log_invite_code_created
  after insert on public.invite_codes
  for each row execute function public._log_invite_code_created();

-- ============================================================
-- MISE À JOUR DES RPCs EXISTANTES
-- On ajoute perform log_event() là où le trigger ne suffit pas.
-- ============================================================

-- join_space : log membre rejoint avec son rôle
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

  perform public.log_event(
    'member_joined',
    v_invite.space_id,
    jsonb_build_object('role', v_invite.role)
  );

  select row_to_json(s) into v_space from public.spaces s where s.id = v_invite.space_id;
  return v_space;
end;
$$;

grant execute on function public.join_space(text) to authenticated;

-- create_space : log création d'espace
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
  v_slug := lower(regexp_replace(
    regexp_replace(p_name, '[^a-zA-Z0-9\s\-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  v_suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_slug := v_slug || '-' || v_suffix;

  insert into public.spaces (name, slug, description, type, cover_url, season_start, season_end, created_by)
  values (p_name, v_slug, p_description, p_type, p_cover_url, p_season_start, p_season_end, auth.uid())
  returning id into v_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (v_space_id, auth.uid(), 'owner');

  insert into public.synthese (space_id) values (v_space_id);

  perform public.log_event(
    'space_created',
    v_space_id,
    jsonb_build_object('name', p_name, 'type', p_type)
  );

  return v_space_id;
end;
$$;

grant execute on function public.create_space(text, text, text, date, date, text) to authenticated;

-- set_member_episode_permission : log promotion / rétrogradation
create or replace function public.set_member_episode_permission(
  p_space_id  uuid,
  p_user_id   uuid,
  p_can_create boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.space_members
    where space_id = p_space_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'only the owner can change episode permissions';
  end if;

  update public.space_members
  set can_create_episodes = p_can_create
  where space_id = p_space_id
    and user_id = p_user_id
    and role = 'member';

  perform public.log_event(
    case when p_can_create then 'member_promoted' else 'member_demoted' end,
    p_space_id,
    jsonb_build_object('target_user_id', p_user_id)
  );
end;
$$;

grant execute on function public.set_member_episode_permission(uuid, uuid, boolean) to authenticated;

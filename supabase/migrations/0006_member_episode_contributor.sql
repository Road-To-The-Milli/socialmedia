-- Permet au owner d'une aventure de "promouvoir" un member pour qu'il puisse
-- lui aussi ajouter des épisodes (sans devenir owner). Les observers ne sont
-- pas concernés : ils suivent l'aventure sans pouvoir y participer.

alter table public.space_members
  add column if not exists can_create_episodes boolean not null default false;

-- Remplace la policy d'insertion d'épisodes pour inclure les members promus.
drop policy if exists "episodes_insert_owner" on public.episodes;

create policy "episodes_insert_owner_or_contributor" on public.episodes
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id
        and sm.user_id = auth.uid()
        and (sm.role = 'owner' or (sm.role = 'member' and sm.can_create_episodes))
    )
  );

-- RPC sécurisée : seul le owner de l'espace peut changer la permission
-- "can_create_episodes" d'un member (jamais la sienne, jamais celle d'un observer).
create or replace function public.set_member_episode_permission(
  p_space_id uuid,
  p_user_id uuid,
  p_can_create boolean
) returns void
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
end;
$$;

grant execute on function public.set_member_episode_permission(uuid, uuid, boolean) to authenticated;

-- Permet d'afficher qui a déjà rempli son compte rendu pour un épisode et
-- qui ne l'a pas encore fait, SANS révéler le contenu des comptes rendus
-- avant le déblocage de la saison (reviews_select_own_or_unlocked empêche
-- de lire les lignes des autres tant que season_unlocked = false).
--
-- SECURITY DEFINER : la fonction lit la table `reviews` en contournant cette
-- restriction, mais ne renvoie jamais que oui/non — jamais le contenu.
create or replace function public.episode_review_status(p_episode_id uuid)
returns table(user_id uuid, name text, avatar_url text, role text, submitted boolean)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_space_id uuid;
begin
  select space_id into v_space_id from public.episodes where id = p_episode_id;
  if v_space_id is null then
    raise exception 'episode_not_found';
  end if;
  if public.my_space_role(v_space_id) is null then
    raise exception 'not_a_member';
  end if;

  return query
    select
      sm.user_id,
      p.name,
      p.avatar_url,
      sm.role,
      exists (
        select 1 from public.reviews r
        where r.episode_id = p_episode_id and r.author_id = sm.user_id
      ) as submitted
    from public.space_members sm
    join public.profiles p on p.id = sm.user_id
    where sm.space_id = v_space_id
      and sm.role in ('owner', 'member')
    order by sm.joined_at asc;
end;
$$;

grant execute on function public.episode_review_status(uuid) to authenticated;

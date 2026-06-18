-- Nouveau modèle de permission : un "member" normal (non promu) est
-- désormais traité comme un observateur pour toute action de participation
-- (créer un épisode, écrire un compte rendu, commenter, uploader un média,
-- proposer une idée). Seuls le owner et les members promus
-- (can_create_episodes = true) peuvent participer activement.

create or replace function public.my_is_contributor(p_space_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space_id
      and user_id = auth.uid()
      and (role = 'owner' or (role = 'member' and can_create_episodes))
  );
$$;

grant execute on function public.my_is_contributor(uuid) to authenticated;

-- EPISODES (simple alignement sur le helper, comportement inchangé)
drop policy if exists "episodes_insert_owner_or_contributor" on public.episodes;
create policy "episodes_insert_owner_or_contributor" on public.episodes
  for insert to authenticated with check (
    created_by = auth.uid() and public.my_is_contributor(space_id)
  );

-- EPISODE_MEDIA
drop policy if exists "episode_media_insert_owner_member" on public.episode_media;
create policy "episode_media_insert_owner_member" on public.episode_media
  for insert to authenticated with check (
    uploaded_by = auth.uid() and public.my_is_contributor(space_id)
  );

-- REVIEWS
drop policy if exists "reviews_insert_owner_member" on public.reviews;
create policy "reviews_insert_owner_member" on public.reviews
  for insert to authenticated with check (
    author_id = auth.uid() and public.my_is_contributor(space_id)
  );

-- EPISODE_COMMENTS
drop policy if exists "episode_comments_insert_owner_member" on public.episode_comments;
create policy "episode_comments_insert_owner_member" on public.episode_comments
  for insert to authenticated with check (
    author_id = auth.uid() and public.my_is_contributor(space_id)
  );

-- IDEAS
drop policy if exists "ideas_insert_owner_member" on public.ideas;
create policy "ideas_insert_owner_member" on public.ideas
  for insert to authenticated with check (
    proposed_by = auth.uid() and public.my_is_contributor(space_id)
  );

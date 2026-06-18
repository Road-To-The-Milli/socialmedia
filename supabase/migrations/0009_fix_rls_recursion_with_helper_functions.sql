-- 0007/0008 ont corrigé la référence ambiguë à `space_id`, mais ont révélé un
-- second problème : une policy sur `space_members` qui re-interroge
-- `space_members` dans sa propre sous-requête déclenche une erreur Postgres
-- "infinite recursion detected in policy" (42P17), puisque lire la table
-- réévalue sa propre policy, qui relit la table, etc.
--
-- La version buguée (non corrélée) ne déclenchait pas cette erreur, par
-- accident, mais elle était fausse. La version corrigée est correcte mais
-- requiert de casser la boucle : on sort le test d'appartenance dans une
-- fonction SECURITY DEFINER. Une fonction SECURITY DEFINER s'exécute avec
-- les droits de son propriétaire (qui possède les tables et n'est donc pas
-- soumis à RLS), donc l'appel interne à `space_members` ne réévalue pas la
-- policy — la récursion est cassée.

create or replace function public.my_space_role(p_space_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.space_members
  where space_id = p_space_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.my_can_create_episodes(p_space_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(can_create_episodes, false) from public.space_members
  where space_id = p_space_id and user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.my_space_role(uuid) to authenticated;
grant execute on function public.my_can_create_episodes(uuid) to authenticated;

-- SPACE_MEMBERS
drop policy if exists "space_members_select_member" on public.space_members;
create policy "space_members_select_member" on public.space_members
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "space_members_insert_owner" on public.space_members;
create policy "space_members_insert_owner" on public.space_members
  for insert to authenticated with check (
    public.my_space_role(space_id) = 'owner'
  );

drop policy if exists "space_members_update_owner" on public.space_members;
create policy "space_members_update_owner" on public.space_members
  for update to authenticated using (
    public.my_space_role(space_id) = 'owner'
  );

drop policy if exists "space_members_delete_owner_or_self" on public.space_members;
create policy "space_members_delete_owner_or_self" on public.space_members
  for delete to authenticated using (
    user_id = auth.uid()
    or public.my_space_role(space_id) = 'owner'
  );

-- INVITE_CODES
drop policy if exists "invite_codes_select_member" on public.invite_codes;
create policy "invite_codes_select_member" on public.invite_codes
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "invite_codes_insert_owner" on public.invite_codes;
create policy "invite_codes_insert_owner" on public.invite_codes
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.my_space_role(space_id) = 'owner'
  );

drop policy if exists "invite_codes_delete_owner" on public.invite_codes;
create policy "invite_codes_delete_owner" on public.invite_codes
  for delete to authenticated using (
    public.my_space_role(space_id) = 'owner'
  );

-- EPISODES
drop policy if exists "episodes_select_member" on public.episodes;
create policy "episodes_select_member" on public.episodes
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "episodes_update_owner" on public.episodes;
create policy "episodes_update_owner" on public.episodes
  for update to authenticated using (
    public.my_space_role(space_id) = 'owner'
  );

drop policy if exists "episodes_delete_owner" on public.episodes;
create policy "episodes_delete_owner" on public.episodes
  for delete to authenticated using (
    public.my_space_role(space_id) = 'owner'
  );

drop policy if exists "episodes_insert_owner_or_contributor" on public.episodes;
create policy "episodes_insert_owner_or_contributor" on public.episodes
  for insert to authenticated with check (
    created_by = auth.uid()
    and (
      public.my_space_role(space_id) = 'owner'
      or (public.my_space_role(space_id) = 'member' and public.my_can_create_episodes(space_id))
    )
  );

-- EPISODE_MEDIA
drop policy if exists "episode_media_select_member" on public.episode_media;
create policy "episode_media_select_member" on public.episode_media
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "episode_media_insert_owner_member" on public.episode_media;
create policy "episode_media_insert_owner_member" on public.episode_media
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and public.my_space_role(space_id) in ('owner', 'member')
  );

drop policy if exists "episode_media_delete_uploader_or_owner" on public.episode_media;
create policy "episode_media_delete_uploader_or_owner" on public.episode_media
  for delete to authenticated using (
    uploaded_by = auth.uid()
    or public.my_space_role(space_id) = 'owner'
  );

-- REVIEWS
drop policy if exists "reviews_select_own_or_unlocked" on public.reviews;
create policy "reviews_select_own_or_unlocked" on public.reviews
  for select to authenticated using (
    author_id = auth.uid()
    or (
      public.my_space_role(space_id) is not null
      and exists (
        select 1 from public.spaces s
        where s.id = reviews.space_id and s.season_unlocked = true
      )
    )
  );

drop policy if exists "reviews_insert_owner_member" on public.reviews;
create policy "reviews_insert_owner_member" on public.reviews
  for insert to authenticated with check (
    author_id = auth.uid()
    and public.my_space_role(space_id) in ('owner', 'member')
  );

-- EPISODE_COMMENTS
drop policy if exists "episode_comments_select_member" on public.episode_comments;
create policy "episode_comments_select_member" on public.episode_comments
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "episode_comments_insert_owner_member" on public.episode_comments;
create policy "episode_comments_insert_owner_member" on public.episode_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and public.my_space_role(space_id) in ('owner', 'member')
  );

drop policy if exists "episode_comments_delete_author_or_owner" on public.episode_comments;
create policy "episode_comments_delete_author_or_owner" on public.episode_comments
  for delete to authenticated using (
    author_id = auth.uid()
    or public.my_space_role(space_id) = 'owner'
  );

-- IDEAS
drop policy if exists "ideas_select_member" on public.ideas;
create policy "ideas_select_member" on public.ideas
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "ideas_insert_owner_member" on public.ideas;
create policy "ideas_insert_owner_member" on public.ideas
  for insert to authenticated with check (
    proposed_by = auth.uid()
    and public.my_space_role(space_id) in ('owner', 'member')
  );

drop policy if exists "ideas_update_owner" on public.ideas;
create policy "ideas_update_owner" on public.ideas
  for update to authenticated using (
    public.my_space_role(space_id) = 'owner'
  );

-- VOTE_QUESTIONS
drop policy if exists "vote_questions_select_member" on public.vote_questions;
create policy "vote_questions_select_member" on public.vote_questions
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "vote_questions_insert_owner" on public.vote_questions;
create policy "vote_questions_insert_owner" on public.vote_questions
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.my_space_role(space_id) = 'owner'
  );

drop policy if exists "vote_questions_update_owner" on public.vote_questions;
create policy "vote_questions_update_owner" on public.vote_questions
  for update to authenticated using (
    public.my_space_role(space_id) = 'owner'
  );

-- SYNTHESE
drop policy if exists "synthese_select_member" on public.synthese;
create policy "synthese_select_member" on public.synthese
  for select to authenticated using (
    public.my_space_role(space_id) is not null
  );

drop policy if exists "synthese_write_owner" on public.synthese;
create policy "synthese_write_owner" on public.synthese
  for all to authenticated using (
    public.my_space_role(space_id) = 'owner'
  ) with check (
    public.my_space_role(space_id) = 'owner'
  );

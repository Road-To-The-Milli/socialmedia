-- Correctif de sécurité/correction : plusieurs policies RLS écrites comme
-- `exists (select 1 from space_members sm where sm.space_id = space_id ...)`
-- contiennent une référence non qualifiée à `space_id` côté droit. Quand la
-- table protégée a elle-même une colonne `space_id`, Postgres résout cette
-- référence non qualifiée sur l'alias interne `sm` (portée la plus proche)
-- au lieu de la ligne de la table protégée — la corrélation est cassée.
--
-- Conséquences concrètes observées/déduites :
--   - SELECT sur space_members (et d'autres tables "_select_member") :
--     trop RESTRICTIF — un owner ne voyait que sa propre ligne, jamais
--     celles des autres membres (bug rapporté par l'utilisateur).
--   - INSERT/UPDATE/DELETE ("_insert_owner", "_update_owner", etc.) :
--     trop PERMISSIF — être owner d'UN espace suffisait théoriquement à
--     passer le check pour N'IMPORTE QUEL AUTRE espace, indépendamment du
--     space_id réellement ciblé par la requête.
--
-- Correctif : qualifier explicitement la colonne de la ligne protégée avec
-- le nom de sa table, pour lever toute ambiguïté.

-- SPACE_MEMBERS
drop policy if exists "space_members_insert_owner" on public.space_members;
create policy "space_members_insert_owner" on public.space_members
  for insert to authenticated with check (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_members.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

drop policy if exists "space_members_update_owner" on public.space_members;
create policy "space_members_update_owner" on public.space_members
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = space_members.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

drop policy if exists "space_members_delete_owner_or_self" on public.space_members;
create policy "space_members_delete_owner_or_self" on public.space_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = space_members.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- INVITE_CODES
drop policy if exists "invite_codes_select_member" on public.invite_codes;
create policy "invite_codes_select_member" on public.invite_codes
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = invite_codes.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "invite_codes_insert_owner" on public.invite_codes;
create policy "invite_codes_insert_owner" on public.invite_codes
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = invite_codes.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

drop policy if exists "invite_codes_delete_owner" on public.invite_codes;
create policy "invite_codes_delete_owner" on public.invite_codes
  for delete to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = invite_codes.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- EPISODES
drop policy if exists "episodes_select_member" on public.episodes;
create policy "episodes_select_member" on public.episodes
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = episodes.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "episodes_update_owner" on public.episodes;
create policy "episodes_update_owner" on public.episodes
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = episodes.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

drop policy if exists "episodes_delete_owner" on public.episodes;
create policy "episodes_delete_owner" on public.episodes
  for delete to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = episodes.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- Policy d'insertion actuellement active (créée par 0006), à corriger aussi.
drop policy if exists "episodes_insert_owner_or_contributor" on public.episodes;
create policy "episodes_insert_owner_or_contributor" on public.episodes
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = episodes.space_id
        and sm.user_id = auth.uid()
        and (sm.role = 'owner' or (sm.role = 'member' and sm.can_create_episodes))
    )
  );

-- EPISODE_MEDIA
drop policy if exists "episode_media_select_member" on public.episode_media;
create policy "episode_media_select_member" on public.episode_media
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = episode_media.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "episode_media_insert_owner_member" on public.episode_media;
create policy "episode_media_insert_owner_member" on public.episode_media
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = episode_media.space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

drop policy if exists "episode_media_delete_uploader_or_owner" on public.episode_media;
create policy "episode_media_delete_uploader_or_owner" on public.episode_media
  for delete to authenticated using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = episode_media.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- REVIEWS
drop policy if exists "reviews_select_own_or_unlocked" on public.reviews;
create policy "reviews_select_own_or_unlocked" on public.reviews
  for select to authenticated using (
    author_id = auth.uid()
    or exists (
      select 1 from public.spaces s
      join public.space_members sm on sm.space_id = s.id
      where s.id = reviews.space_id
        and sm.user_id = auth.uid()
        and s.season_unlocked = true
    )
  );

drop policy if exists "reviews_insert_owner_member" on public.reviews;
create policy "reviews_insert_owner_member" on public.reviews
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = reviews.space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

-- EPISODE_COMMENTS
drop policy if exists "episode_comments_select_member" on public.episode_comments;
create policy "episode_comments_select_member" on public.episode_comments
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = episode_comments.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "episode_comments_insert_owner_member" on public.episode_comments;
create policy "episode_comments_insert_owner_member" on public.episode_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = episode_comments.space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

drop policy if exists "episode_comments_delete_author_or_owner" on public.episode_comments;
create policy "episode_comments_delete_author_or_owner" on public.episode_comments
  for delete to authenticated using (
    author_id = auth.uid()
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = episode_comments.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- IDEAS
drop policy if exists "ideas_select_member" on public.ideas;
create policy "ideas_select_member" on public.ideas
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = ideas.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "ideas_insert_owner_member" on public.ideas;
create policy "ideas_insert_owner_member" on public.ideas
  for insert to authenticated with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = ideas.space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'member')
    )
  );

drop policy if exists "ideas_update_owner" on public.ideas;
create policy "ideas_update_owner" on public.ideas
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = ideas.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- VOTE_QUESTIONS
drop policy if exists "vote_questions_select_member" on public.vote_questions;
create policy "vote_questions_select_member" on public.vote_questions
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = vote_questions.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "vote_questions_insert_owner" on public.vote_questions;
create policy "vote_questions_insert_owner" on public.vote_questions
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = vote_questions.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

drop policy if exists "vote_questions_update_owner" on public.vote_questions;
create policy "vote_questions_update_owner" on public.vote_questions
  for update to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = vote_questions.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- SYNTHESE
drop policy if exists "synthese_select_member" on public.synthese;
create policy "synthese_select_member" on public.synthese
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = synthese.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "synthese_write_owner" on public.synthese;
create policy "synthese_write_owner" on public.synthese
  for all to authenticated using (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = synthese.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  ) with check (
    exists (
      select 1 from public.space_members sm
      where sm.space_id = synthese.space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

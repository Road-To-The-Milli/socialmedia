-- Seul le créateur de l'aventure (owner) peut créer des épisodes.
-- Avant ce correctif, un "member" (rôle par défaut attribué via le code
-- d'invitation auto-généré) pouvait aussi créer des épisodes, ce qui ne
-- correspond plus au modèle : "mes aventures" (créateur) vs "aventures amis"
-- (spectateur, qui suit sans pouvoir publier d'épisode).

drop policy if exists "episodes_insert_owner_member" on public.episodes;

create policy "episodes_insert_owner" on public.episodes
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

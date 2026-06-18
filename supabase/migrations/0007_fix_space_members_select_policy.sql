-- Bug : dans la policy "space_members_select_member", la colonne `space_id`
-- du côté droit du EXISTS n'était pas qualifiée. Postgres la résolvait sur
-- l'alias interne `sm2` (le plus proche dans la portée) au lieu de la ligne
-- externe en cours d'évaluation. Le test devenait donc "sm2.space_id =
-- sm2.space_id" (toujours vrai) combiné à "sm2.user_id = auth.uid()" sans
-- lien avec la ligne réellement testée — résultat : un owner ne voyait que
-- SA PROPRE ligne dans la liste des membres, jamais celles des autres.

drop policy if exists "space_members_select_member" on public.space_members;

create policy "space_members_select_member" on public.space_members
  for select to authenticated using (
    exists (
      select 1 from public.space_members sm2
      where sm2.space_id = space_members.space_id and sm2.user_id = auth.uid()
    )
  );

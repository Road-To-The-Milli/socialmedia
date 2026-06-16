-- RESET COMPLET — supprime toutes les tables, fonctions et triggers (v1 + v2).
-- ⚠️ DESTRUCTIF : toutes les données applicatives sont perdues.
-- Les comptes auth.users ne sont PAS supprimés.
-- À exécuter dans le SQL Editor de Supabase Studio avant de relancer le schéma.

-- ============================================================
-- Triggers (seul auth.users survit aux drop table ci-dessous ;
-- les autres triggers partent automatiquement avec leurs tables via cascade)
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;

-- ============================================================
-- Tables v2
-- ============================================================
drop table if exists public.synthese          cascade;
drop table if exists public.vote_results      cascade;
drop table if exists public.vote_ballots      cascade;
drop table if exists public.vote_questions    cascade;
drop table if exists public.idea_votes        cascade;
drop table if exists public.ideas             cascade;
drop table if exists public.comment_reactions cascade;
drop table if exists public.episode_comments  cascade;
drop table if exists public.reviews           cascade;
drop table if exists public.episode_likes     cascade;
drop table if exists public.episode_media     cascade;
drop table if exists public.episodes          cascade;
drop table if exists public.invite_codes      cascade;
drop table if exists public.space_members     cascade;
drop table if exists public.spaces            cascade;
drop table if exists public.profiles          cascade;

-- ============================================================
-- Tables v1 (si encore présentes)
-- ============================================================
drop table if exists public.settings          cascade;

-- ============================================================
-- Fonctions
-- ============================================================
drop function if exists public.handle_new_user()                    cascade;
drop function if exists public.set_updated_at()                     cascade;
drop function if exists public.set_review_author()                  cascade;
drop function if exists public.set_review_author_snapshot()         cascade;
drop function if exists public.set_comment_author()                 cascade;
drop function if exists public.set_comment_author_snapshot()        cascade;
drop function if exists public.cast_vote(uuid, text)                cascade;
drop function if exists public.join_space(text)                     cascade;
drop function if exists public.create_space(text,text,text,date,date,text) cascade;

-- ============================================================
-- Storage policies (le bucket n'est pas supprimé — see note below)
-- ============================================================
drop policy if exists "episode_media_storage_read"        on storage.objects;
drop policy if exists "episode_media_storage_write_admin" on storage.objects;
drop policy if exists "episode_media_storage_write"       on storage.objects;
drop policy if exists "episode_media_storage_delete"      on storage.objects;

-- Note : Supabase bloque la suppression directe des buckets via SQL.
-- Pour supprimer le bucket "episode-media", utiliser le Storage UI de Supabase Studio.
-- Le schéma v2 fera un "insert ... on conflict do nothing" et réutilisera le bucket existant.
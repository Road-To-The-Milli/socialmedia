-- Nous & Chill — RESET COMPLET du schéma applicatif.
-- ⚠️ DESTRUCTIF : supprime toutes les tables/fonctions/triggers créés par
-- 0001_init.sql et les données qu'elles contiennent (profils, épisodes,
-- avis, commentaires, idées, votes...). Les comptes auth.users eux-mêmes
-- ne sont PAS supprimés (gérés par Supabase Auth), mais leurs profils le
-- seront (cascade) — il faudra recréer les comptes ou les reconnecter.
--
-- À utiliser uniquement pour repartir d'une base propre avant de relancer
-- 0001_init.sql (qui contient déjà le modèle générique aventurier/ami).

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.vote_results cascade;
drop table if exists public.vote_ballots cascade;
drop table if exists public.vote_questions cascade;
drop table if exists public.idea_votes cascade;
drop table if exists public.ideas cascade;
drop table if exists public.comment_reactions cascade;
drop table if exists public.episode_comments cascade;
drop table if exists public.reviews cascade;
drop table if exists public.episode_likes cascade;
drop table if exists public.episode_media cascade;
drop table if exists public.episodes cascade;
drop table if exists public.synthese cascade;
drop table if exists public.settings cascade;
drop table if exists public.invite_codes cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.set_review_author() cascade;
drop function if exists public.set_comment_author() cascade;
drop function if exists public.cast_vote(uuid, text) cascade;

drop policy if exists "episode_media_storage_read" on storage.objects;
drop policy if exists "episode_media_storage_write_admin" on storage.objects;
-- Le bucket lui-même n'est pas supprimé (Supabase bloque le DELETE direct sur
-- storage.buckets : "Use the Storage API instead"). Ce n'est pas gênant :
-- 0001_init.sql fait `insert ... on conflict (id) do nothing`, donc il sera
-- simplement réutilisé tel quel s'il existe déjà.

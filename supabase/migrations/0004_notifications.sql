-- Notifications in-app — flux de notifications par utilisateur.
-- Alimenté via la fonction notify_space(), appelée en plus du push web
-- existant à chaque événement notable (épisode, commentaire, idée...).

create table public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  space_id   uuid        references public.spaces(id) on delete cascade,
  title      text        not null,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Crée une notification pour chaque membre du space, sauf l'expéditeur.
-- SECURITY DEFINER : un membre n'a normalement pas le droit d'insérer une
-- notification au nom d'un autre utilisateur, cette fonction contourne ça
-- de façon contrôlée (uniquement pour les membres du space concerné).
create or replace function public.notify_space(
  p_space_id uuid,
  p_title    text,
  p_body     text default null,
  p_url      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, space_id, title, body, url)
  select sm.user_id, p_space_id, p_title, p_body, p_url
  from public.space_members sm
  where sm.space_id = p_space_id
    and sm.user_id <> auth.uid();
end;
$$;

grant execute on function public.notify_space(uuid, text, text, text) to authenticated;

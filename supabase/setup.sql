-- =====================================================
-- Muro de Ideas en Vivo — configuración de la base de datos
-- Pega TODO este archivo en Supabase → SQL Editor → Run.
-- Se puede correr más de una vez sin romper nada.
-- =====================================================

-- 1. Tabla de ideas
create table if not exists public.ideas (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  content     text not null check (char_length(btrim(content)) between 1 and 280),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ideas_created_at_idx on public.ideas (created_at desc);

-- 2. Al publicar: el dueño y el nombre salen de la cuenta (nadie se hace pasar por otro)
create or replace function public.ideas_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(u.email, '@', 1))
    into new.author_name
    from auth.users u
   where u.id = new.user_id;
  new.content    := btrim(new.content);
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ideas_before_insert on public.ideas;
create trigger ideas_before_insert
  before insert on public.ideas
  for each row execute function public.ideas_before_insert();

-- 3. Al editar: solo cambia el texto; se guarda la hora de edición
create or replace function public.ideas_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id          := old.id;
  new.user_id     := old.user_id;
  new.author_name := old.author_name;
  new.created_at  := old.created_at;
  new.content     := btrim(new.content);
  new.updated_at  := now();
  return new;
end;
$$;

drop trigger if exists ideas_before_update on public.ideas;
create trigger ideas_before_update
  before update on public.ideas
  for each row execute function public.ideas_before_update();

-- 4. Seguridad: quién puede hacer qué
alter table public.ideas enable row level security;

drop policy if exists "Ver ideas (con sesión)"    on public.ideas;
drop policy if exists "Publicar ideas propias"    on public.ideas;
drop policy if exists "Editar ideas propias"      on public.ideas;
drop policy if exists "Borrar ideas propias"      on public.ideas;

create policy "Ver ideas (con sesión)" on public.ideas
  for select to authenticated using (true);

create policy "Publicar ideas propias" on public.ideas
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Editar ideas propias" on public.ideas
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Borrar ideas propias" on public.ideas
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 5. Tiempo real: avisar a todos cuando se crea, edita o borra una idea
alter table public.ideas replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ideas'
  ) then
    alter publication supabase_realtime add table public.ideas;
  end if;
end;
$$;

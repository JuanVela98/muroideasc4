-- =====================================================
-- Muro de Ideas en Vivo (canvas) — configuración de la base de datos
-- Pega TODO este archivo en Supabase → SQL Editor → Run.
-- Se puede correr más de una vez sin romper nada (también si ya habías
-- corrido la versión anterior: solo agrega posición y color).
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

-- 1b. Posición en el canvas y color de cada nota
alter table public.ideas
  add column if not exists x double precision not null default (random() * 900)
    check (x between -100000 and 100000);
alter table public.ideas
  add column if not exists y double precision not null default (random() * 600)
    check (y between -100000 and 100000);
alter table public.ideas
  add column if not exists color text not null default 'amarillo'
    check (color in ('amarillo', 'rosa', 'azul', 'verde', 'naranja', 'morado'));

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

-- 3. Al actualizar: cualquiera puede mover y pintar; el texto solo lo cambia el dueño
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

  if auth.uid() is distinct from old.user_id then
    new.content := old.content;            -- los demás no pueden editar el texto
  else
    new.content := btrim(new.content);
  end if;

  if new.content is distinct from old.content then
    new.updated_at := now();               -- "editada" solo si cambió el texto
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists ideas_before_update on public.ideas;
create trigger ideas_before_update
  before update on public.ideas
  for each row execute function public.ideas_before_update();

-- 4. Seguridad: quién puede hacer qué
alter table public.ideas enable row level security;

drop policy if exists "Ver ideas (con sesión)"       on public.ideas;
drop policy if exists "Publicar ideas propias"       on public.ideas;
drop policy if exists "Editar ideas propias"         on public.ideas;
drop policy if exists "Mover y pintar cualquier idea" on public.ideas;
drop policy if exists "Borrar ideas propias"         on public.ideas;

create policy "Ver ideas (con sesión)" on public.ideas
  for select to authenticated using (true);

create policy "Publicar ideas propias" on public.ideas
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Todos pueden mover/pintar; el trigger de arriba protege el texto.
create policy "Mover y pintar cualquier idea" on public.ideas
  for update to authenticated using (true) with check (true);

create policy "Borrar ideas propias" on public.ideas
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 5. Tiempo real: avisar a todos cuando se crea, mueve, pinta o borra una idea
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

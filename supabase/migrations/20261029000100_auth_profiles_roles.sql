-- Fase 2B.1: perfiles de aplicacion y autorizacion.
-- Este archivo no crea usuarios de Auth. El trigger crea un perfil customer
-- para cada identidad creada por Supabase Auth, incluidos email/password y OAuth.
-- Supabase CLI aplica cada archivo de migracion en una transaccion salvo que
-- incluya la directiva `-- pg-delta: transaction=false`; este archivo no la usa.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create type public.app_role as enum ('customer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de aplicacion vinculado 1:1 con auth.users. No almacena credenciales.';
comment on column public.profiles.role is
  'Rol de autorizacion. Los registros publicos siempre se crean como customer.';

create function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    'customer'::public.app_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.app_role
  );
$$;

comment on function private.is_admin() is
  'Helper SECURITY DEFINER para politicas RLS. Solo authenticated puede ejecutarla.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

create policy profiles_update_own_contact
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy profiles_admin_update_contact
on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;


-- Fase 2B.3: bloqueos puntuales globales o por profesional.
-- Supabase CLI aplica este archivo en una transaccion; no usa pg-delta: transaction=false.

create type public.calendar_block_scope as enum ('business', 'professional');

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  scope public.calendar_block_scope not null,
  professional_id uuid references public.professionals (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  internal_reason text,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (scope = 'business'::public.calendar_block_scope and professional_id is null)
    or (scope = 'professional'::public.calendar_block_scope and professional_id is not null)
  ),
  check (internal_reason is null or btrim(internal_reason) <> ''),
  check (archived_at is null or not is_active)
);

comment on table public.calendar_blocks is
  'Bloqueos absolutos [starts_at, ends_at). internal_reason es exclusivamente administrativo.';

create index calendar_blocks_active_period_idx
on public.calendar_blocks using gist (tstzrange(starts_at, ends_at, '[)'))
where is_active and archived_at is null;

create index calendar_blocks_active_scope_lookup_idx
on public.calendar_blocks (scope, professional_id, starts_at)
where is_active and archived_at is null;

create trigger calendar_blocks_set_updated_at
before update on public.calendar_blocks
for each row execute function private.set_updated_at();

alter table public.calendar_blocks enable row level security;

revoke all on table public.calendar_blocks from public, anon, authenticated;

grant select, insert, update, delete on table public.calendar_blocks to authenticated;

create policy calendar_blocks_admin_manage
on public.calendar_blocks
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Fase 2B.1: configuracion operativa singleton.
-- booking_enabled inicia en false para que no pueda existir un flujo de reservas
-- antes de crear sus dependencias y validar sus reglas en una fase posterior.
-- Supabase CLI aplica cada archivo de migracion en una transaccion salvo que
-- incluya la directiva `-- pg-delta: transaction=false`; este archivo no la usa.

create type public.professional_assignment_mode as enum (
  'customer_choice',
  'automatic'
);

create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  currency_code char(3) not null default 'PEN' check (currency_code = 'PEN'),
  business_timezone text not null default 'America/Lima',
  booking_enabled boolean not null default false,
  professional_assignment_mode public.professional_assignment_mode,
  minimum_notice_minutes integer not null default 1440 check (minimum_notice_minutes > 0),
  booking_horizon_days integer not null default 30 check (booking_horizon_days > 0),
  approval_max_pending_minutes integer check (approval_max_pending_minutes > 0),
  approval_cutoff_before_start_minutes integer check (approval_cutoff_before_start_minutes > 0),
  cancellation_notice_minutes integer check (cancellation_notice_minutes > 0),
  reschedule_proposal_ttl_minutes integer check (reschedule_proposal_ttl_minutes > 0),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    booking_enabled = false
    or (
      professional_assignment_mode is not null
      and approval_max_pending_minutes is not null
      and approval_cutoff_before_start_minutes is not null
      and cancellation_notice_minutes is not null
      and reschedule_proposal_ttl_minutes is not null
    )
  )
);

comment on table public.business_settings is
  'Configuracion operativa singleton. Los cambios afectan solicitudes futuras; las reservas conservaran snapshots.';
comment on column public.business_settings.professional_assignment_mode is
  'Debe elegirse antes de habilitar reservas. No se asume una modalidad inicial.';
comment on column public.business_settings.approval_max_pending_minutes is
  'Pendiente de configuracion administrativa antes de habilitar reservas.';
comment on column public.business_settings.business_timezone is
  'Zona horaria inicial confirmada. No es editable por roles de aplicacion hasta definir su validacion y politica de cambio.';

insert into public.business_settings (id)
values (1);

create function private.audit_business_settings_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Solo un administrador puede actualizar la configuracion operativa';
  end if;

  new.updated_by = (select auth.uid());
  new.updated_at = now();
  return new;
end;
$$;

create trigger business_settings_audit_update
before update on public.business_settings
for each row execute function private.audit_business_settings_update();

alter table public.business_settings enable row level security;

revoke all on table public.business_settings from public, anon, authenticated;
grant select on table public.business_settings to authenticated;
grant update (
  booking_enabled,
  professional_assignment_mode,
  minimum_notice_minutes,
  booking_horizon_days,
  approval_max_pending_minutes,
  approval_cutoff_before_start_minutes,
  cancellation_notice_minutes,
  reschedule_proposal_ttl_minutes
) on table public.business_settings to authenticated;

create policy business_settings_admin_select
on public.business_settings
for select
to authenticated
using ((select private.is_admin()));

create policy business_settings_admin_update
on public.business_settings
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on function private.audit_business_settings_update() from public, anon, authenticated;


-- Solo los datos operativos necesarios para presentar el formulario público.
-- El resto de business_settings conserva su RLS administrativa.
create function public.get_booking_public_settings()
returns table (
  booking_enabled boolean,
  professional_assignment_mode public.professional_assignment_mode,
  business_timezone text
)
language sql stable security definer set search_path = ''
as $$
  select s.booking_enabled, s.professional_assignment_mode, s.business_timezone
  from public.business_settings s
  where s.id = 1;
$$;

revoke all on function public.get_booking_public_settings() from public, anon, authenticated;
grant execute on function public.get_booking_public_settings() to anon, authenticated;

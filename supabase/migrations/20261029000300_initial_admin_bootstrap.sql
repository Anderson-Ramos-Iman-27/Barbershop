-- Fase 2B.1: bootstrap unico del primer administrador.
-- Supabase CLI aplica cada archivo de migracion en una transaccion salvo que
-- incluya la directiva `-- pg-delta: transaction=false`; este archivo no la usa.
-- Procedimiento manual posterior a la aplicacion de migraciones:
--   1. Crear una identidad existente mediante Supabase Auth Dashboard o una operacion
--      administrativa autorizada (nunca desde esta migracion).
--   2. Confirmar que el trigger creo su fila en public.profiles.
--   3. Desde SQL Editor con una cuenta propietaria del proyecto, ejecutar:
--      select private.bootstrap_initial_admin('<uuid-del-usuario>'::uuid);
-- La funcion falla si ya existe cualquier administrador y no tiene permisos para
-- anon ni authenticated. No incluir UUIDs, correos, claves ni contrasenas en Git.

create function private.bootstrap_initial_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('original_wave_initial_admin_bootstrap'));

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
  ) then
    raise exception 'El perfil objetivo no existe';
  end if;

  if exists (
    select 1
    from public.profiles
    where role = 'admin'::public.app_role
  ) then
    raise exception 'Ya existe un administrador inicial';
  end if;

  update public.profiles
  set role = 'admin'
  where id = target_user_id;
end;
$$;

revoke all on function private.bootstrap_initial_admin(uuid) from public, anon, authenticated;


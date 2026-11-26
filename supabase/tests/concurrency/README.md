# Concurrencia local — Fase 2B.4

Ejecuta exclusivamente contra Supabase local y Docker Desktop iniciado:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/concurrency/run-phase-2b4.ps1
```

El arnés usa dos procesos `psql` independientes dentro de `supabase_db_barbershop`.
No lee ni imprime credenciales, no usa `supabase link` ni se conecta a proyectos remotos.

Cada escenario crea fixtures locales desechables, inicia la sesión A, espera 300 ms,
inicia B y mantiene A abierta dos segundos. La salida se guarda bajo el directorio
temporal del sistema y el arnés valida que no haya más de una ocupación activa por slot.

Antes de una ejecución desde una base limpia, ejecute `npx.cmd supabase db reset`.
El script no activa `booking_enabled`; esa configuración debe prepararse explícitamente
en una fixture de concurrencia autorizada y siempre se restaura mediante el reset local.

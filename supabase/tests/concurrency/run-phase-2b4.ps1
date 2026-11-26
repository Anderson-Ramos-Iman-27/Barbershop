param([string]$Container = 'supabase_db_barbershop')

$ErrorActionPreference = 'Stop'
if (-not (docker ps --format '{{.Names}}' | Select-String -Quiet "^$Container$")) { throw 'Supabase local no esta iniciado.' }
$scriptRoot = Split-Path -Parent $PSCommandPath
$fixture = Join-Path $scriptRoot 'fixture-phase-2b4.fixture'

function Invoke-LocalSql([string]$Sql) {
  & docker exec $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc $Sql
  if ($LASTEXITCODE -ne 0) { throw 'psql local fallo.' }
}

function Invoke-Race([string]$Name, [string]$SessionA, [string]$SessionB) {
  $tempRoot = Join-Path ([IO.Path]::GetTempPath()) "original-wave-$Name-$([guid]::NewGuid())"
  New-Item -ItemType Directory -Path $tempRoot | Out-Null
  $jobA = Start-Job { param($c,$q) & docker exec $c psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $q 2>&1 } -ArgumentList $Container,$SessionA
  Start-Sleep -Milliseconds 300
  $jobB = Start-Job { param($c,$q) & docker exec $c psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $q 2>&1 } -ArgumentList $Container,$SessionB
  Wait-Job $jobA,$jobB | Out-Null
  $outA = Receive-Job $jobA | Out-String; $outB = Receive-Job $jobB | Out-String
  Remove-Job $jobA,$jobB
  Set-Content -LiteralPath (Join-Path $tempRoot 'session-a.log') -Value $outA
  Set-Content -LiteralPath (Join-Path $tempRoot 'session-b.log') -Value $outB
  [pscustomobject]@{ Scenario=$Name; SessionA=$outA; SessionB=$outB; LogDirectory=$tempRoot }
}

& docker cp $fixture "${Container}:/tmp/original-wave-phase-2b4-fixture.sql"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo cargar la fixture local.' }
& docker exec $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/original-wave-phase-2b4-fixture.sql
if ($LASTEXITCODE -ne 0) { throw 'La fixture local fallo.' }

$start = (Invoke-LocalSql "with candidates as (select date_trunc('minute',clock_timestamp()+interval '2 days') + make_interval(mins => n) as starts_at from generate_series(0,1000,35) n) select c.starts_at from candidates c where not exists (select 1 from public.professional_time_allocations a where a.professional_id='70000000-0000-0000-0000-000000000020' and a.state='active' and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.starts_at,c.starts_at+interval '30 minutes','[)')) and not exists (select 1 from public.calendar_blocks b where b.is_active and (b.professional_id is null or b.professional_id='70000000-0000-0000-0000-000000000020') and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(c.starts_at,c.starts_at+interval '30 minutes','[)')) order by c.starts_at limit 1").Trim()
if ([string]::IsNullOrWhiteSpace($start)) { throw 'No hay slot aislado disponible para escenario 01.' }
$runId = [guid]::NewGuid().ToString()
$keyA = [guid]::NewGuid().ToString(); $keyB = [guid]::NewGuid().ToString()
$fingerprintA = "concurrency-a-$runId"; $fingerprintB = "concurrency-b-$runId"
$a = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true); select public.request_booking_hold(array['70000000-0000-0000-0000-000000000010'::uuid],'local','$start'::timestamptz,'70000000-0000-0000-0000-000000000020'::uuid,'$keyA'::uuid,'$fingerprintA'); select pg_sleep(2); commit;"
$b = $a.Replace('000000000001','000000000002').Replace($keyA,$keyB).Replace($fingerprintA,$fingerprintB)
$result = Invoke-Race '01-hold-vs-hold-rpc' $a $b
if ($result.SessionA -notmatch 'COMMIT' -or $result.SessionB -notmatch 'Horario no disponible') { throw "Escenario 1 no cumplio el resultado esperado. Logs: $($result.LogDirectory)" }
$active = Invoke-LocalSql "select count(*) from public.professional_time_allocations where professional_id='70000000-0000-0000-0000-000000000020' and state='active' and starts_at='$start'::timestamptz"
if ($active.Trim() -ne '1') { throw 'Escenario 1 dejo ocupaciones incompatibles.' }
Write-Host "PASS 01-hold-vs-hold-rpc logs=$($result.LogDirectory)"

# 02: confirmar la reserva creada por A y competir con un nuevo hold.
$holdA = (Invoke-LocalSql "select id from public.booking_time_holds where request_fingerprint='$fingerprintA' and status='active'").Trim()
$bookingRace = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true); select public.convert_hold_to_booking('$holdA'::uuid,'$fingerprintA'); select pg_sleep(2); commit;"
$holdRace = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000002',true); select public.request_booking_hold(array['70000000-0000-0000-0000-000000000010'::uuid],'local','$start'::timestamptz,'70000000-0000-0000-0000-000000000020'::uuid,'70000000-0000-0000-0000-000000000103'::uuid,'concurrency-convert-race'); commit;"
$result = Invoke-Race '03-convert-vs-hold-rpc' $bookingRace $holdRace
if ($result.SessionA -notmatch 'COMMIT' -or $result.SessionB -notmatch 'Horario no disponible') { throw "Escenario 03 no cumplio el resultado esperado. Logs: $($result.LogDirectory)" }
$bookingId = (Invoke-LocalSql "select converted_booking_id from public.booking_time_holds where id='$holdA'::uuid").Trim()
if ((Invoke-LocalSql "select count(*) from public.professional_time_allocations where booking_id='$bookingId'::uuid and state='active'").Trim() -ne '1') { throw 'Escenario 03 no transfirio exactamente una allocation.' }
Write-Host "PASS 03-convert-vs-hold-rpc logs=$($result.LogDirectory)"

# 02 uses its own hold/reservation fixture and competes confirmation with a hold.
$start02 = (Invoke-LocalSql "with candidates as (select date_trunc('minute',clock_timestamp()+interval '3 days') + make_interval(mins => n) as starts_at from generate_series(0,1000,35) n) select c.starts_at from candidates c where not exists (select 1 from public.professional_time_allocations a where a.professional_id='70000000-0000-0000-0000-000000000020' and a.state='active' and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.starts_at,c.starts_at+interval '30 minutes','[)')) and not exists (select 1 from public.calendar_blocks b where b.is_active and (b.professional_id is null or b.professional_id='70000000-0000-0000-0000-000000000020') and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(c.starts_at,c.starts_at+interval '30 minutes','[)')) order by c.starts_at limit 1").Trim()
if ([string]::IsNullOrWhiteSpace($start02)) { throw 'No hay slot aislado disponible para escenario 02.' }
$key02 = [guid]::NewGuid().ToString(); $fp02 = "scenario-02-$([guid]::NewGuid())"
$create02 = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true); select public.request_booking_hold(array['70000000-0000-0000-0000-000000000010'::uuid],'local','$start02'::timestamptz,'70000000-0000-0000-0000-000000000020'::uuid,'$key02'::uuid,'$fp02'); commit;"
& docker exec $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $create02
$hold02 = (Invoke-LocalSql "select id from public.booking_time_holds where request_fingerprint='$fp02'").Trim()
$convert02 = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true); select public.convert_hold_to_booking('$hold02'::uuid,'$fp02'); commit;"
& docker exec $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $convert02
$booking02 = (Invoke-LocalSql "select converted_booking_id from public.booking_time_holds where id='$hold02'::uuid").Trim()
$confirm02 = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true); select public.admin_confirm_booking('$booking02'::uuid); select pg_sleep(2); commit;"
$hold02Race = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000002',true); select public.request_booking_hold(array['70000000-0000-0000-0000-000000000010'::uuid],'local','$start02'::timestamptz,'70000000-0000-0000-0000-000000000020'::uuid,'$([guid]::NewGuid())'::uuid,'scenario-02-race'); commit;"
$result = Invoke-Race '02-confirmed-booking-vs-hold-rpc' $confirm02 $hold02Race
if ($result.SessionA -notmatch 'COMMIT' -or $result.SessionB -notmatch 'Horario no disponible') { throw "Escenario 02 no cumplio el resultado esperado. Logs: $($result.LogDirectory)" }
if ((Invoke-LocalSql "select status from public.bookings where id='$booking02'::uuid").Trim() -ne 'confirmed') { throw 'Escenario 02 no confirmo la reserva.' }
Write-Host "PASS 02-confirmed-booking-vs-hold-rpc logs=$($result.LogDirectory)"

# 04: cancellation releases the allocation before the exclusive administrative block commits.
$cancel04 = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true); select public.cancel_own_booking('$booking02'::uuid); select pg_sleep(2); commit;"
$block04 = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true); select public.admin_create_calendar_block('professional','70000000-0000-0000-0000-000000000020'::uuid,'$start02'::timestamptz,'$start02'::timestamptz+interval '30 minutes',false,'concurrency'); commit;"
$result = Invoke-Race '04-cancel-vs-block-rpc' $cancel04 $block04
if ($result.SessionA -notmatch 'COMMIT' -or $result.SessionB -notmatch 'COMMIT') { throw "Escenario 04 no cumplio el resultado esperado. Logs: $($result.LogDirectory)" }
if ((Invoke-LocalSql "select status from public.bookings where id='$booking02'::uuid").Trim() -ne 'cancelled') { throw 'Escenario 04 no dejo la reserva cancelled.' }
if ((Invoke-LocalSql "select count(*) from public.professional_time_allocations where booking_id='$booking02'::uuid and state='active'").Trim() -ne '0') { throw 'Escenario 04 conserva una allocation liberada.' }
if ((Invoke-LocalSql "select count(*) from public.calendar_blocks where professional_id='70000000-0000-0000-0000-000000000020' and starts_at='$start02'::timestamptz and is_active").Trim() -ne '1') { throw 'Escenario 04 no persistio exactamente un bloqueo.' }
Write-Host "PASS 04-cancel-vs-block-rpc logs=$($result.LogDirectory)"

# Shared helper: creates a confirmed booking through the public booking RPCs.
function New-ConfirmedConcurrencyBooking([string]$Label, [string]$ProfessionalId) {
  $slot = (Invoke-LocalSql "with candidates as (select date_trunc('minute',clock_timestamp()+interval '4 days') + make_interval(mins => n) as starts_at from generate_series(0,1000,35) n) select c.starts_at from candidates c where not exists (select 1 from public.professional_time_allocations a where a.professional_id='$ProfessionalId' and a.state='active' and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.starts_at,c.starts_at+interval '30 minutes','[)')) order by c.starts_at limit 1").Trim()
  if ([string]::IsNullOrWhiteSpace($slot)) { throw "No hay slot aislado disponible para $Label." }
  $key = [guid]::NewGuid().ToString(); $fingerprint = "${Label}-$([guid]::NewGuid())"
  $sql = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true); select public.request_booking_hold(array['70000000-0000-0000-0000-000000000010'::uuid],'local','$slot'::timestamptz,'$ProfessionalId'::uuid,'$key'::uuid,'$fingerprint'); commit;"
  & docker exec $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql
  $hold = (Invoke-LocalSql "select id from public.booking_time_holds where request_fingerprint='$fingerprint'").Trim()
  $sql = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true); select public.convert_hold_to_booking('$hold'::uuid,'$fingerprint'); commit;"
  & docker exec $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql
  $booking = (Invoke-LocalSql "select converted_booking_id from public.booking_time_holds where id='$hold'::uuid").Trim()
  $sql = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true); select public.admin_confirm_booking('$booking'::uuid); commit;"
  & docker exec $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql
  [pscustomobject]@{ Booking=$booking; Start=$slot; Professional=$ProfessionalId }
}

# 04B: a proposed reschedule retains the original confirmed allocation; an incompatible block loses.
$fixture04b = New-ConfirmedConcurrencyBooking 'scenario-04b' '70000000-0000-0000-0000-000000000020'
$proposal04b = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true); select public.admin_propose_reschedule('$($fixture04b.Booking)'::uuid,'70000000-0000-0000-0000-000000000021'::uuid,'$($fixture04b.Start)'::timestamptz+interval '2 hours','$($fixture04b.Start)'::timestamptz+interval '2 hours 30 minutes'); select pg_sleep(2); commit;"
$block04b = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true); select public.admin_create_calendar_block('professional','70000000-0000-0000-0000-000000000020'::uuid,'$($fixture04b.Start)'::timestamptz,'$($fixture04b.Start)'::timestamptz+interval '30 minutes',false,'conflict'); commit;"
$result = Invoke-Race '04b-block-vs-active-rpc' $proposal04b $block04b
if ($result.SessionA -notmatch 'COMMIT' -or $result.SessionB -notmatch 'Bloqueo incompatible') { throw "Escenario 04B fallo. Logs: $($result.LogDirectory)" }
Write-Host "PASS 04B-block-vs-active-rpc logs=$($result.LogDirectory)"

# 05 and 06 use independent confirmed bookings; their SQLSTATE assertions are enforced by Invoke-Race logs.
$fixture05 = New-ConfirmedConcurrencyBooking 'scenario-05' '70000000-0000-0000-0000-000000000020'
$p05a = $proposal04b.Replace($fixture04b.Booking,$fixture05.Booking).Replace($fixture04b.Start,$fixture05.Start)
$p05b = $p05a.Replace("interval '2 hours'","interval '3 hours'").Replace("interval '2 hours 30 minutes'","interval '3 hours 30 minutes'")
$result = Invoke-Race '05-two-proposals-rpc' $p05a $p05b
if ($result.SessionA -notmatch 'COMMIT' -or $result.SessionB -notmatch 'reschedule_proposals_one_active_idx') { throw "Escenario 05 fallo. Logs: $($result.LogDirectory)" }
Write-Host "PASS 05-two-proposals-rpc logs=$($result.LogDirectory)"

$fixture06 = New-ConfirmedConcurrencyBooking 'scenario-06' '70000000-0000-0000-0000-000000000020'
$p06a = $proposal04b.Replace($fixture04b.Booking,$fixture06.Booking).Replace($fixture04b.Start,$fixture06.Start)
$p06b = "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000002',true); select public.request_booking_hold(array['70000000-0000-0000-0000-000000000010'::uuid],'local','$($fixture06.Start)'::timestamptz+interval '2 hours','70000000-0000-0000-0000-000000000021'::uuid,'$([guid]::NewGuid())'::uuid,'scenario-06-race'); commit;"
$result = Invoke-Race '06-reschedule-vs-hold-rpc' $p06a $p06b
if ($result.SessionA -notmatch 'COMMIT' -or $result.SessionB -notmatch 'Horario no disponible') { throw "Escenario 06 fallo. Logs: $($result.LogDirectory)" }
Write-Host "PASS 06-reschedule-vs-hold-rpc logs=$($result.LogDirectory)"


begin;
create extension if not exists pgtap with schema extensions;
select plan(48);

insert into auth.users(id,email) values
 ('30000000-0000-0000-0000-000000000001','flow-customer@example.test'),
 ('30000000-0000-0000-0000-000000000002','flow-other@example.test'),
 ('30000000-0000-0000-0000-000000000003','flow-admin@example.test');
update public.profiles set role='admin' where id='30000000-0000-0000-0000-000000000003';
insert into public.services(id,name,description,price_pen_centavos,duration_minutes,is_active,is_published)
 values('30000000-0000-0000-0000-000000000010','Servicio prueba','Datos locales de prueba',1000,30,true,true);
insert into public.service_modes(service_id,mode) values('30000000-0000-0000-0000-000000000010','local');
insert into public.professionals(id,display_name,is_active,is_published) values('30000000-0000-0000-0000-000000000020','Profesional prueba',true,true);
insert into public.professionals(id,display_name,is_active,is_published) values('30000000-0000-0000-0000-000000000021','Segundo profesional prueba',true,true);
insert into public.professional_services(professional_id,service_id) values('30000000-0000-0000-0000-000000000020','30000000-0000-0000-0000-000000000010');
insert into public.professional_services(professional_id,service_id) values('30000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000010');
insert into public.professional_working_hours(professional_id,weekday,starts_at,ends_at,effective_from)
select '30000000-0000-0000-0000-000000000020', d, '00:00'::time, '23:59'::time, current_date from generate_series(1,7) d;
insert into public.professional_working_hours(professional_id,weekday,starts_at,ends_at,effective_from)
select '30000000-0000-0000-0000-000000000021', d, '00:00'::time, '23:59'::time, current_date from generate_series(1,7) d;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
update public.business_settings set booking_enabled=true, professional_assignment_mode='customer_choice', approval_max_pending_minutes=1440, approval_cutoff_before_start_minutes=360, cancellation_notice_minutes=720, reschedule_proposal_ttl_minutes=360 where id=1;

select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
create temporary table flow_context(starts_at timestamptz, hold_id uuid, booking_id uuid) on commit drop;
insert into flow_context(starts_at) values (date_trunc('minute',clock_timestamp()) + interval '2 days');

select lives_ok(
 $$update flow_context set hold_id=public.request_booking_hold(array['30000000-0000-0000-0000-000000000010'::uuid], 'local', starts_at, '30000000-0000-0000-0000-000000000020'::uuid, '30000000-0000-0000-0000-000000000030'::uuid, 'payload-1')$$,
 'Cliente autenticado crea una retencion valida'
);
reset role;
select ok((select expires_at > created_at and expires_at <= created_at + interval '10 minutes 1 second' from public.booking_time_holds where id=(select hold_id from flow_context)), 'La retencion inicial vence aproximadamente en diez minutos');
select ok((select count(*)=1 from public.professional_time_allocations where hold_id=(select hold_id from flow_context) and state='active'), 'Una retencion activa tiene una unica ocupacion activa');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select is((select public.request_booking_hold(array['30000000-0000-0000-0000-000000000010'::uuid], 'local', starts_at, '30000000-0000-0000-0000-000000000020'::uuid, '30000000-0000-0000-0000-000000000030'::uuid, 'payload-1') from flow_context), (select hold_id from flow_context), 'La misma clave y payload son idempotentes');
select throws_ok($$select public.request_booking_hold(array['30000000-0000-0000-0000-000000000010'::uuid], 'local', starts_at, '30000000-0000-0000-0000-000000000020'::uuid, '30000000-0000-0000-0000-000000000030'::uuid, 'payload-distinto') from flow_context$$, '23505', null, 'La clave de idempotencia no admite otro payload');
select lives_ok($$update flow_context set booking_id=public.convert_hold_to_booking(hold_id, 'payload-1')$$, 'Una retencion propia vigente se convierte en reserva pendiente');
reset role;
select ok((select status='pending' and total_duration_minutes=30 from public.bookings where id=(select booking_id from flow_context)), 'La conversion crea una reserva pending con la duracion calculada');
select ok((select count(*)=1 from public.booking_services where booking_id=(select booking_id from flow_context) and price_pen_centavos_snapshot=1000 and duration_minutes_snapshot=30), 'La reserva conserva snapshots de servicio, precio y duracion');
select ok((select count(*)=1 from public.professional_time_allocations where booking_id=(select booking_id from flow_context) and state='active' and origin_hold_id=(select hold_id from flow_context)), 'La conversion transfiere la misma ocupacion sin liberarla');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select is((select public.convert_hold_to_booking(hold_id, 'payload-1') from flow_context), (select booking_id from flow_context), 'Reintentar la conversion devuelve la misma reserva');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.admin_confirm_booking((select booking_id from flow_context))$$, 'El administrador confirma una reserva pendiente vigente');
reset role;
select ok((select status='confirmed' from public.bookings where id=(select booking_id from flow_context)), 'La reserva queda confirmada');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.cancel_own_booking((select booking_id from flow_context))$$, 'El cliente cancela dentro del plazo configurado');
reset role;
select ok((select b.status='cancelled' and not exists(select 1 from public.professional_time_allocations a where a.booking_id=b.id and a.state='active') from public.bookings b where b.id=(select booking_id from flow_context)), 'La cancelacion libera la ocupacion de forma atomica');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select lives_ok($$update flow_context set hold_id=public.request_booking_hold(array['30000000-0000-0000-0000-000000000010'::uuid], 'local', starts_at + interval '2 hours', '30000000-0000-0000-0000-000000000020'::uuid, '30000000-0000-0000-0000-000000000031'::uuid, 'payload-expire'), booking_id=null$$, 'Se prepara una segunda reserva para pruebas terminales');
select lives_ok($$update flow_context set booking_id=public.convert_hold_to_booking(hold_id, 'payload-expire')$$, 'La segunda retencion se convierte en pending');
reset role;
update public.bookings set approval_deadline_at=clock_timestamp()-interval '1 minute' where id=(select booking_id from flow_context);
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.admin_confirm_booking((select booking_id from flow_context))$$, '55000', null, 'No se confirma una solicitud pending con plazo vencido');
select lives_ok($$select public.expire_booking_holds_and_proposals()$$, 'La limpieza expira solicitudes pending vencidas');
reset role;
select ok((select b.status='expired' and not exists(select 1 from public.professional_time_allocations a where a.booking_id=b.id and a.state='active') from public.bookings b where b.id=(select booking_id from flow_context)), 'La expiracion libera la ocupacion de la reserva terminal');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.expire_booking_holds_and_proposals()$$, 'La limpieza repetida es idempotente');

select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select lives_ok($$update flow_context set hold_id=public.request_booking_hold(array['30000000-0000-0000-0000-000000000010'::uuid], 'local', starts_at + interval '4 hours', '30000000-0000-0000-0000-000000000020'::uuid, '30000000-0000-0000-0000-000000000032'::uuid, 'payload-reprogram'), booking_id=null$$, 'Se prepara una reserva confirmada para reprogramacion');
select lives_ok($$update flow_context set booking_id=public.convert_hold_to_booking(hold_id, 'payload-reprogram')$$, 'La reserva para reprogramacion se crea');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.admin_confirm_booking((select booking_id from flow_context))$$, 'La reserva de reprogramacion queda confirmada');
create temporary table proposal_context(id uuid) on commit drop;
select lives_ok($$insert into proposal_context select public.admin_propose_reschedule((select booking_id from flow_context), '30000000-0000-0000-0000-000000000021'::uuid, (select starts_at + interval '2 hours' from flow_context), (select starts_at + interval '2 hours 30 minutes' from flow_context))$$, 'El administrador propone un horario con otro profesional');
reset role;
select ok((select count(*)=2 from public.professional_time_allocations a where a.state='active' and (a.booking_id=(select booking_id from flow_context) or a.reschedule_proposal_id=(select id from proposal_context))), 'La propuesta conserva la ocupacion original y crea la propuesta');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.respond_to_reschedule_proposal((select id from proposal_context), true)$$, 'El cliente acepta la propuesta de reprogramacion');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.admin_reject_booking((select booking_id from flow_context))$$, '55000', null, 'No se rechaza una reserva confirmada como si siguiera pending');
reset role;
with slot as (select clock_timestamp()+interval '1 hour' as starts_at)
update public.bookings b set starts_at=slot.starts_at, ends_at=slot.starts_at+interval '30 minutes', approval_deadline_at=slot.starts_at-interval '30 minutes' from slot where b.id=(select booking_id from flow_context);
with slot as (select starts_at from public.bookings where id=(select booking_id from flow_context))
update public.professional_time_allocations a set starts_at=slot.starts_at, ends_at=slot.starts_at+interval '30 minutes' from slot where a.booking_id=(select booking_id from flow_context) and a.state='active';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.cancel_own_booking((select booking_id from flow_context))$$, '55000', null, 'Se rechaza la cancelacion fuera del plazo configurado');
reset role;
select ok((select b.status='confirmed' and exists(select 1 from public.professional_time_allocations a where a.booking_id=b.id and a.state='active') from public.bookings b where b.id=(select booking_id from flow_context)), 'Una transicion fallida no deja cambios parciales');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.admin_confirm_booking((select booking_id from flow_context))$$, '55000', null, 'No se confirma de nuevo una reserva ya confirmada');
create temporary table rejected_proposal_context(id uuid) on commit drop;
select lives_ok($$insert into rejected_proposal_context select public.admin_propose_reschedule((select booking_id from flow_context), '30000000-0000-0000-0000-000000000020'::uuid, (select starts_at + interval '2 hours' from flow_context), (select starts_at + interval '2 hours 30 minutes' from flow_context))$$, 'El administrador crea una propuesta para probar rechazo');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.respond_to_reschedule_proposal((select id from rejected_proposal_context), false)$$, 'El cliente rechaza la propuesta');
reset role;
select ok((select b.status='confirmed' and exists(select 1 from public.professional_time_allocations a where a.booking_id=b.id and a.state='active') and not exists(select 1 from public.professional_time_allocations a where a.reschedule_proposal_id=(select id from rejected_proposal_context) and a.state='active') from public.bookings b where b.id=(select booking_id from flow_context)), 'El rechazo conserva reserva y ocupacion original, y libera solo la propuesta');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.respond_to_reschedule_proposal((select id from rejected_proposal_context), true)$$, '55000', null, 'No se acepta una propuesta ya rechazada');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.admin_withdraw_reschedule_proposal((select id from rejected_proposal_context))$$, '55000', null, 'No se retira una propuesta terminal');
create temporary table expired_proposal_context(id uuid) on commit drop;
select lives_ok($$insert into expired_proposal_context select public.admin_propose_reschedule((select booking_id from flow_context), '30000000-0000-0000-0000-000000000020'::uuid, (select starts_at + interval '3 hours' from flow_context), (select starts_at + interval '3 hours 30 minutes' from flow_context))$$, 'Se crea una propuesta para probar expiracion');
reset role;
update public.reschedule_proposals set created_at=clock_timestamp()-interval '2 hours', expires_at=clock_timestamp()-interval '1 minute' where id=(select id from expired_proposal_context);
update public.professional_time_allocations set expires_at=clock_timestamp()-interval '1 minute' where reschedule_proposal_id=(select id from expired_proposal_context) and state='active';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.respond_to_reschedule_proposal((select id from expired_proposal_context), true)$$, '55000', null, 'No se acepta una propuesta vencida antes de limpieza');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.expire_booking_holds_and_proposals()$$, 'La limpieza expira propuestas vencidas');
reset role;
select ok((select r.status='expired' and not exists(select 1 from public.professional_time_allocations a where a.reschedule_proposal_id=r.id and a.state='active') from public.reschedule_proposals r where r.id=(select id from expired_proposal_context)), 'La expiracion libera la ocupacion propuesta');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
create temporary table withdrawn_proposal_context(id uuid) on commit drop;
select lives_ok($$insert into withdrawn_proposal_context select public.admin_propose_reschedule((select booking_id from flow_context), '30000000-0000-0000-0000-000000000020'::uuid, (select starts_at + interval '4 hours' from flow_context), (select starts_at + interval '4 hours 30 minutes' from flow_context))$$, 'El administrador crea una propuesta vigente para retirada');
select lives_ok($$select public.admin_withdraw_reschedule_proposal((select id from withdrawn_proposal_context))$$, 'El administrador retira una propuesta vigente');
reset role;
select ok((select r.status='withdrawn' and b.status='confirmed' and not exists(select 1 from public.professional_time_allocations a where a.reschedule_proposal_id=r.id and a.state='active') and exists(select 1 from public.booking_status_history h where h.booking_id=b.id and h.event_type='reschedule_withdrawn') from public.reschedule_proposals r join public.bookings b on b.id=r.booking_id where r.id=(select id from withdrawn_proposal_context)), 'La retirada conserva la reserva, libera solo propuesta y registra historial');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.admin_withdraw_reschedule_proposal((select id from withdrawn_proposal_context))$$, '55000', null, 'No se retira dos veces una propuesta terminal');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.respond_to_reschedule_proposal((select id from withdrawn_proposal_context), true)$$, '55000', null, 'No se acepta una propuesta retirada');
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.admin_create_calendar_block('professional','30000000-0000-0000-0000-000000000021'::uuid,(select starts_at from public.bookings where id=(select booking_id from flow_context)),(select ends_at from public.bookings where id=(select booking_id from flow_context)),false,'Conflicto')$$, '23P01', null, 'Se rechaza bloqueo profesional incompatible con ocupacion activa');
select throws_ok($$select public.admin_update_working_hours((select id from public.professional_working_hours where professional_id='30000000-0000-0000-0000-000000000021'::uuid limit 1),'00:00'::time,'23:00'::time,current_date,null::date,true,null)$$, '23P01', null, 'Se rechaza modificar horario de profesional con ocupacion activa');
select throws_ok($$select public.admin_create_recurring_break('30000000-0000-0000-0000-000000000021'::uuid,1::smallint,'10:00'::time,'10:15'::time,current_date,null::date)$$, '23P01', null, 'Se rechaza descanso administrativo incompatible con ocupacion activa');
select throws_ok($$select public.admin_create_calendar_block('business',null,(select starts_at from public.bookings where id=(select booking_id from flow_context)),(select ends_at from public.bookings where id=(select booking_id from flow_context)),false,'Conflicto global')$$, '23P01', null, 'Se rechaza bloqueo global incompatible con ocupacion activa');

select * from finish();
rollback;

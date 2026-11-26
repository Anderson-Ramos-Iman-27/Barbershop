-- Standalone transactional checks: no real Auth identities or persistent fixtures.
-- Run explicitly with `supabase db query --linked --file ...`; not a pgTAP suite.
begin;
do $$
declare result jsonb;
  fixture_email text := 'auth-registration-check@example.invalid';
begin
  if has_function_privilege('anon','public.auth_account_exists(text)','execute')
    or has_function_privilege('authenticated','public.auth_account_exists(text)','execute') then
    raise exception 'FAIL: email lookup exposed';
  end if;
  if has_function_privilege('anon','public.before_user_created_registration(jsonb)','execute')
    or has_function_privilege('authenticated','public.before_user_created_registration(jsonb)','execute') then
    raise exception 'FAIL: hook exposed to application roles';
  end if;
  if not has_function_privilege('supabase_auth_admin','public.before_user_created_registration(jsonb)','execute') then
    raise exception 'FAIL: Auth cannot execute hook';
  end if;
  result := public.before_user_created_registration(jsonb_build_object('user', jsonb_build_object('email',fixture_email,'app_metadata',jsonb_build_object('provider','google'))));
  if result #>> '{error,message}' is distinct from 'registration_required' then raise exception 'FAIL: Google login created without registration'; end if;
  perform public.begin_google_registration(upper(fixture_email));
  result := public.before_user_created_registration(jsonb_build_object('user', jsonb_build_object('email',fixture_email,'app_metadata',jsonb_build_object('provider','google'))));
  if result <> '{}'::jsonb then raise exception 'FAIL: explicit Google registration blocked'; end if;
  result := public.before_user_created_registration(jsonb_build_object('user', jsonb_build_object('email',fixture_email,'app_metadata',jsonb_build_object('provider','google'))));
  if result #>> '{error,message}' is distinct from 'registration_required' then raise exception 'FAIL: intent reused'; end if;
  perform public.begin_google_registration(fixture_email);
  update private.google_registration_intents set expires_at = now()-interval '1 minute'
  where email_hash = encode(sha256(convert_to(fixture_email,'UTF8')),'hex');
  result := public.before_user_created_registration(jsonb_build_object('user', jsonb_build_object('email',fixture_email,'app_metadata',jsonb_build_object('provider','google'))));
  if result #>> '{error,message}' is distinct from 'registration_required' then raise exception 'FAIL: expired intent accepted'; end if;
  result := public.before_user_created_registration('{"user":{"app_metadata":{"provider":"email"}}}');
  if result <> '{}'::jsonb then raise exception 'FAIL: password registration changed'; end if;
  begin
    perform public.begin_google_registration('not-an-email');
    raise exception 'FAIL: invalid email accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
rollback;

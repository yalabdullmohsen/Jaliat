-- تراجع JL-6: إعادة الدوال الأربع إلى تعريفها قبل 2026-11-25_portal_signup_approval.sql (منسوخة من الإنتاج كما هي).
-- طلبات kind='coord' المعلّقة (إن وُجدت) تبقى في portal_signups ولا يعالجها الفرع القديم؛ اعتمدها قبل التراجع أو ارفضها.

begin;

CREATE OR REPLACE FUNCTION public.portal_coord_signup(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ph text := right(pa_digits(p->>'phone'), 8); x jsonb; r jsonb; n int := 0; last jsonb;
begin
  if length(ph) < 8 then return jsonb_build_object('ok', false, 'msg', 'اكتبوا رقم الهاتف كاملاً'); end if;
  for x in select c from refs rf, jsonb_array_elements(rf.data->'list') c
            where rf.id = 'coords' and coalesce(c->>'status', '') <> 'سابق' and coalesce(c->>'name', '') <> '' and coalesce(c->>'comm', '') <> ''
              and right(pa_digits(c->>'phone'), 8) = ph and exists (select 1 from coord_links l where l.comm = c->>'comm' and l.active) loop
    r := portal_self_signup((p - 'kind') || jsonb_build_object('name', x->>'name', 'comm', x->>'comm'));
    if coalesce((r->>'ok')::boolean, false) then n := n + 1; else last := r; end if;
  end loop;
  if n > 0 then return jsonb_build_object('ok', true, 'count', n); end if;
  if last is not null then return last; end if;
  insert into portal_login_log(ok) values (false);
  return jsonb_build_object('ok', false, 'msg', 'رقم الهاتف غير مسجّل لدى القسم لأي منسق، تواصلوا مع قسم الجاليات');
end $function$;

CREATE OR REPLACE FUNCTION public.portal_me(p_s text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a portal_accounts := pa_acc(p_s, true); i jsonb; L jsonb; ids text[];
begin i := portal_info(pa_link(a));
  if a.role = 'شيخ' then
    if not coalesce((i->>'ok')::boolean, false) then return i; end if;
    select coalesce(jsonb_agg(x), '[]'), coalesce(array_agg(x->>'id'), '{}') into L, ids from jsonb_array_elements(i->'acts') x where pa_lect_match(x->>'lect', a.name);
    return jsonb_build_object('ok', true, 'comm', a.comm, 'mosques', i->'mosques', 'acts', L,
      'permits', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'no', p.no, 'code', p.code, 'mosque', p.data->>'mosque', 'topic', p.data->>'topic', 'date', p.data->>'date', 'time', p.data->>'time', 'until', p.until) order by p.until desc), '[]')
        from permits p where not coalesce(p.revoked, false) and p.until >= (now() at time zone 'Asia/Kuwait')::date - 30 and (p.act_id = any(ids) or (coalesce(p.act_id,'') = '' and pa_lect_match(p.data->>'sheikh', a.name)))),
      'me', jsonb_build_object('name', a.name, 'role', a.role, 'phone', a.phone));
  end if;
  return i || jsonb_build_object('me', jsonb_build_object('name', a.name, 'role', a.role, 'phone', a.phone, 'email', a.email),
    'accounts', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'role', x.role, 'phone', x.phone, 'email', x.email, 'ready', x.pin_hash is not null, 'last', x.last_login) order by x.role desc, x.created_at), '[]') from portal_accounts x where x.comm = a.comm and x.active and x.role not in ('القسم','شيخ')),
    'requests', (select coalesce(jsonb_agg(r || jsonb_build_object('by', (select q.data->'by' from requests q where q.no = (r->>'no')::bigint))), '[]') from jsonb_array_elements(i->'requests') r));
end $function$;

CREATE OR REPLACE FUNCTION public.portal_self_signup(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare nm text := trim(coalesce(p->>'name','')); cm text := trim(coalesce(p->>'comm','')); c text := pa_digits(p->>'civil'); ph text := right(pa_digits(p->>'phone'),8); pin text := pa_digits(p->>'pin');
        lg text := left(trim(coalesce(p->>'lang','')),40); rec jsonb; rl text; ex portal_accounts;
begin
  if (select count(*) from portal_login_log where not ok and at > now() - interval '10 minutes') > 40 then return jsonb_build_object('ok',false,'msg','محاولات كثيرة، حاولوا بعد قليل'); end if;
  if coalesce(p->>'kind','') = 'sheikh' then
    if (select count(*) from portal_signups where created_at > now() - interval '1 hour') > 30 then return jsonb_build_object('ok',false,'msg','طلبات كثيرة، حاولوا بعد قليل'); end if;
    if length(nm) < 5 then return jsonb_build_object('ok',false,'msg','اكتبوا اسمكم كاملاً'); end if;
    if cm <> '' and not exists (select 1 from coord_links where comm = cm and active) then cm := ''; end if;
  elsif nm = '' or cm = '' then return jsonb_build_object('ok',false,'msg','اختاروا اسمكم من القائمة'); end if;
  if length(c) <> 12 then return jsonb_build_object('ok',false,'msg','الرقم المدني 12 رقماً'); end if;
  if length(ph) < 8 then return jsonb_build_object('ok',false,'msg','اكتبوا رقم الهاتف كاملاً'); end if;
  if length(pin) < 4 or length(pin) > 8 then return jsonb_build_object('ok',false,'msg','الرمز السري من 4 إلى 8 أرقام'); end if;
  if coalesce(p->>'kind','') = 'sheikh' then
    if lg = '' then return jsonb_build_object('ok',false,'msg','اختاروا اللغة'); end if;
    if exists (select 1 from portal_accounts where civil = c and comm = cm and active and pin_hash is not null) then return jsonb_build_object('ok',false,'msg','لديكم حساب مفعّل، سجّلوا الدخول برقمكم المدني والرمز'); end if;
    if exists (select 1 from portal_signups where civil = c and status = 'pending') then return jsonb_build_object('ok',false,'msg','طلبكم السابق قيد المراجعة لدى القسم'); end if;
    insert into portal_signups(kind, comm, name, civil, phone, pin_hash, lang) values ('sheikh', nullif(cm,''), left(nm,80), c, left(trim(p->>'phone'),20), crypt(pin, gen_salt('bf')), lg);
    perform notify_team('portal_signup', 'طلب حساب شيخ/خطيب في بوابة إنجاز', nm || ' · ' || coalesce(nullif(cm,''),'بلا جالية'), '#portal', null);
    return jsonb_build_object('ok',true,'pending',true);
  end if;
  select x into rec from refs r, jsonb_array_elements(r.data->'list') x where r.id='coords' and x->>'name' = nm and x->>'comm' = cm and coalesce(x->>'status','') <> 'سابق' and right(pa_digits(x->>'phone'),8) = ph limit 1;
  if rec is null then
    insert into portal_login_log(ok) values (false);
    return jsonb_build_object('ok',false,'msg','رقم الهاتف لا يطابق المسجّل لدى القسم لهذا الاسم، تواصلوا مع قسم الجاليات'); end if;
  if not exists (select 1 from coord_links where comm = cm and active) then return jsonb_build_object('ok',false,'msg','لا توجد بوابة لهذه الجالية'); end if;
  rl := case when coalesce(rec->>'role','') like 'نائب%' then 'نائب' else 'منسق' end;
  select * into ex from portal_accounts where civil = c and comm = cm;
  if found and ex.active and ex.pin_hash is not null then return jsonb_build_object('ok',false,'msg','لديكم حساب مفعّل، سجّلوا الدخول برقمكم المدني والرمز'); end if;
  insert into portal_accounts(comm, civil, name, phone, role, pin_hash, email) values (cm, c, left(nm,80), left(trim(p->>'phone'),20), rl, crypt(pin, gen_salt('bf')), nullif(lower(left(trim(coalesce(rec->>'email','')),120)),''))
    on conflict (civil, comm) do update set active = true, name = excluded.name, phone = excluded.phone, pin_hash = excluded.pin_hash, fails = 0;
  perform notify_team('portal_signup', 'حساب جديد في بوابة إنجاز', nm || ' · ' || coalesce(nullif(cm,''),'بلا جالية'), '#portal', null);
  return jsonb_build_object('ok',true);
end $function$;

CREATE OR REPLACE FUNCTION public.staff_portal_decide(p_id uuid, p_ok boolean, p_comm text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare g portal_signups; cm text; cid uuid; L jsonb;
begin
  if coalesce(my_role(),'') not in ('admin','editor') then raise exception 'غير مصرح'; end if;
  select * into g from portal_signups where id = p_id and status = 'pending' for update; if not found then raise exception 'الطلب غير موجود أو تمت معالجته'; end if;
  if not p_ok then update portal_signups set status = 'rejected', reason = left(p_reason,300), decided_by = auth.uid(), decided_at = now() where id = p_id; return jsonb_build_object('ok',true); end if;
  cm := coalesce(nullif(trim(p_comm),''), g.comm, g.comm_new);
  if g.kind = 'sheikh' then
    if not exists (select 1 from coord_links where comm = cm and active) then raise exception 'اختر جالية الشيخ من القائمة قبل الموافقة'; end if;
    if exists (select 1 from portal_accounts where civil = g.civil and comm = cm and active and role in ('منسق','نائب')) then raise exception 'لهذا الرقم المدني حساب منسق في الجالية نفسها'; end if;
    insert into portal_accounts(comm, civil, name, phone, role, pin_hash, added_by) values (cm, g.civil, g.name, g.phone, 'شيخ', g.pin_hash, (select id from portal_accounts where comm = cm and role = 'منسق' and active order by created_at limit 1))
      on conflict (civil, comm) do update set active = true, name = excluded.name, phone = excluded.phone, role = 'شيخ', pin_hash = excluded.pin_hash, fails = 0;
    update portal_signups set status = 'approved', comm = cm, decided_by = auth.uid(), decided_at = now() where id = p_id;
    return jsonb_build_object('ok',true,'comm',cm,'kind','sheikh');
  end if;
  if not exists (select 1 from coord_links where comm = cm and active) then insert into coord_links(comm, token, active) values (cm, encode(gen_random_bytes(9),'hex'), true); end if;
  insert into portal_accounts(comm, civil, name, phone, role, pin_hash, email) values (cm, g.civil, g.name, g.phone, 'منسق', g.pin_hash, g.email)
    on conflict (civil, comm) do update set active = true, name = excluded.name, phone = excluded.phone, role = 'منسق', pin_hash = excluded.pin_hash, fails = 0 returning id into cid;
  insert into portal_accounts(comm, civil, name, phone, role, added_by, email) values (cm, g.dep_civil, g.dep_name, g.dep_phone, 'نائب', cid, g.dep_email)
    on conflict (civil, comm) do update set active = true, name = excluded.name, phone = excluded.phone, role = 'نائب', added_by = cid;
  select data->'list' into L from refs where id = 'coords';
  if L is not null then
    if not exists (select 1 from jsonb_array_elements(L) x where x->>'comm' = cm and right(pa_digits(x->>'phone'),8) = right(pa_digits(g.phone),8)) then L := L || jsonb_build_object('comm', cm, 'name', g.name, 'phone', g.phone, 'email', coalesce(g.email,''), 'role', 'منسق', 'status', 'نشط'); end if;
    if not exists (select 1 from jsonb_array_elements(L) x where x->>'comm' = cm and right(pa_digits(x->>'phone'),8) = right(pa_digits(g.dep_phone),8)) then L := L || jsonb_build_object('comm', cm, 'name', g.dep_name, 'phone', g.dep_phone, 'email', coalesce(g.dep_email,''), 'role', 'نائب منسق', 'status', 'نشط'); end if;
    update refs set data = jsonb_set(data, '{list}', L) where id = 'coords';
  end if;
  update portal_signups set status = 'approved', comm = cm, decided_by = auth.uid(), decided_at = now() where id = p_id;
  return jsonb_build_object('ok',true,'comm',cm);
end $function$;

commit;

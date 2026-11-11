-- 2026-11-10: الشيخ/الخطيب يطلب حسابه بنفسه في البوابة (portal_self_signup + portal_signups بدور sheikh)،
-- ويعتمده القسم عبر staff_portal_decide، وحسابه (الدور «شيخ») يرى التسجيل وتصاريحه وأنشطته فقط.
-- وحذف رابط الخطباء والمحاضرين القديم: portal_me_rec_link وportal_rec_info وpa_acc_r وحسابات «مسجّل».
-- لا يُحذف أي تسجيل: حساب «مسجّل» له تسجيلات يبقى موقوفاً (active=false) لأن sermon_recs مرتبطة به.

alter table portal_signups add column if not exists role text not null default 'coord', add column if not exists lang text; -- (role استُبدل بـ kind في ملف _fix)

-- مطابقة اسم المحاضر في النشاط/التصريح مع اسم الشيخ (بلا تشكيل وألقاب، وتقبل الاسم الأطول أو الأقصر بكلمتين فأكثر)
create or replace function pa_norm(t text) returns text language sql immutable set search_path to 'public' as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(translate(regexp_replace(lower(coalesce(t,'')), '[ً-ْٰـ]', '', 'g'), 'أإآٱةى', 'ااااهي'), '^\s*(الشيخ|شيخ|الدكتور|د\.)\s+', ''), '(^|\s)(عبد|ابو)\s+', '\1\2', 'g'), '\s+', ' ', 'g')) $$;
create or replace function pa_lect_match(lect text, nm text) returns boolean language sql immutable set search_path to 'public' as $$
  select exists (select 1 from regexp_split_to_table(coalesce(lect,''), '\s*[/،,]\s*') p, lateral (select pa_norm(p) x, pa_norm(nm) y) z
    where z.x <> '' and z.y <> '' and (z.x = z.y or (least(array_length(string_to_array(z.x,' '),1), array_length(string_to_array(z.y,' '),1)) >= 2 and (z.x like z.y || ' %' or z.y like z.x || ' %')))) $$;

-- pa_acc: حساب البوابة من الجلسة. حساب الشيخ مقبول فقط في دوال التسجيل (p_sheikh = true)
drop function if exists pa_acc(text);
create function pa_acc(p_s text, p_sheikh boolean default false) returns portal_accounts language plpgsql security definer set search_path to 'public' as $$
declare a portal_accounts;
begin select x.* into a from portal_sessions s join portal_accounts x on x.id = s.account_id where s.token = p_s and s.expires > now() and x.active;
  if not found then raise exception 'انتهت الجلسة، سجّل الدخول من جديد'; end if;
  if a.role = 'شيخ' and not p_sheikh then raise exception 'هذه الخدمة لمنسقي الجاليات'; end if;
  return a; end $$;
revoke all on function pa_acc(text, boolean), pa_norm(text), pa_lect_match(text, text) from public, anon, authenticated;

-- طلب الحساب: المنسق كما كان، والشيخ/الخطيب (kind = sheikh) يُحفظ طلباً بانتظار القسم حتى لو اسمه غير موجود
create or replace function portal_self_signup(p jsonb) returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare nm text := trim(coalesce(p->>'name','')); cm text := trim(coalesce(p->>'comm','')); c text := pa_digits(p->>'civil'); ph text := right(pa_digits(p->>'phone'),8); pin text := pa_digits(p->>'pin');
        lg text := left(trim(coalesce(p->>'lang','')),40); rec jsonb; rl text; ex portal_accounts;
begin
  if (select count(*) from portal_login_log where not ok and at > now() - interval '10 minutes') > 40 then return jsonb_build_object('ok',false,'msg','محاولات كثيرة، حاولوا بعد قليل'); end if;
  if coalesce(p->>'kind','') = 'sheikh' then
    if (select count(*) from portal_signups where created_at > now() - interval '1 hour') > 30 then return jsonb_build_object('ok',false,'msg','طلبات كثيرة، حاولوا بعد قليل'); end if;
    if length(nm) < 5 then return jsonb_build_object('ok',false,'msg','اكتبوا اسمكم كاملاً'); end if;
    if cm = '' or not exists (select 1 from coord_links where comm = cm and active) then return jsonb_build_object('ok',false,'msg','اختاروا الجالية'); end if;
  elsif nm = '' or cm = '' then return jsonb_build_object('ok',false,'msg','اختاروا اسمكم من القائمة'); end if;
  if length(c) <> 12 then return jsonb_build_object('ok',false,'msg','الرقم المدني 12 رقماً'); end if;
  if length(ph) < 8 then return jsonb_build_object('ok',false,'msg','اكتبوا رقم الهاتف كاملاً'); end if;
  if length(pin) < 4 or length(pin) > 8 then return jsonb_build_object('ok',false,'msg','الرمز السري من 4 إلى 8 أرقام'); end if;
  if coalesce(p->>'kind','') = 'sheikh' then
    if lg = '' then return jsonb_build_object('ok',false,'msg','اختاروا اللغة'); end if;
    if exists (select 1 from portal_accounts where civil = c and comm = cm and active and pin_hash is not null) then return jsonb_build_object('ok',false,'msg','لديكم حساب مفعّل، سجّلوا الدخول برقمكم المدني والرمز'); end if;
    if exists (select 1 from portal_signups where civil = c and status = 'pending') then return jsonb_build_object('ok',false,'msg','طلبكم السابق قيد المراجعة لدى القسم'); end if;
    insert into portal_signups(role, comm, name, civil, phone, pin_hash, lang) values ('sheikh', cm, left(nm,80), c, left(trim(p->>'phone'),20), crypt(pin, gen_salt('bf')), lg);
    perform notify_team('portal_signup', 'طلب حساب شيخ/خطيب في بوابة إنجاز', nm || ' · ' || cm, '#portal', null);
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
  perform notify_team('portal_signup', 'حساب جديد في بوابة إنجاز', nm || ' · ' || cm, '#portal', null);
  return jsonb_build_object('ok',true);
end $$;

create or replace function staff_portal_signups() returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin if my_role() is null then raise exception 'غير مصرح'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'role', role, 'lang', lang, 'comm', comm, 'comm_new', comm_new, 'name', name, 'civil', civil, 'phone', phone, 'dep_name', dep_name, 'dep_civil', dep_civil, 'dep_phone', dep_phone, 'notes', notes, 'email', email, 'dep_email', dep_email, 'status', status, 'reason', reason, 'at', created_at) order by created_at desc), '[]') from portal_signups where status = 'pending' or created_at > now() - interval '30 days'); end $$;

-- الموافقة: طلب الشيخ يُنشئ حساباً بدور «شيخ» فقط (بلا نائب ولا إضافة لقائمة المنسقين)
do $$ declare d text; k text := $k$  insert into portal_accounts(comm, civil, name, phone, role, pin_hash, email) values (cm, g.civil, g.name, g.phone, 'منسق'$k$;
begin
  d := pg_get_functiondef('staff_portal_decide(uuid,boolean,text,text)'::regprocedure);
  if position(k in d) = 0 then raise exception 'staff_portal_decide: النص المتوقع غير موجود'; end if;
  d := replace(d, k, $s$  if g.role = 'sheikh' then
    if exists (select 1 from portal_accounts where civil = g.civil and comm = cm and active and role <> 'شيخ') then raise exception 'لهذا الرقم المدني حساب منسق في الجالية نفسها'; end if;
    insert into portal_accounts(comm, civil, name, phone, role, pin_hash) values (cm, g.civil, g.name, g.phone, 'شيخ', g.pin_hash)
      on conflict (civil, comm) do update set active = true, name = excluded.name, phone = excluded.phone, role = 'شيخ', pin_hash = excluded.pin_hash, fails = 0;
    update portal_signups set status = 'approved', comm = cm, decided_by = auth.uid(), decided_at = now() where id = p_id;
    return jsonb_build_object('ok',true,'comm',cm,'role','sheikh');
  end if;
$s$ || k);
  execute d;
end $$;

-- portal_me: الشيخ يرى أنشطته (باسمه) وتصاريحه والمساجد فقط؛ المنسق كما كان دون حسابات الشيوخ
create or replace function portal_me(p_s text) returns jsonb language plpgsql security definer set search_path to 'public' as $$
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
end $$;

create or replace function portal_me_sermons(p_s text) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a portal_accounts := pa_acc(p_s, true);
begin return (select coalesce(jsonb_agg(jsonb_build_object('khatib', khatib, 'mosque', mosque, 'fri', fri, 'at', created_at, 'kind', kind, 'started', coalesce(proof->>'started', recorded_at::text), 'secs', secs, 'reviewed', reviewed_at is not null, 'note', review_note, 'noted_at', reviewed_at) order by created_at desc), '[]')
  from (select * from sermon_recs where comm = a.comm and (a.role <> 'شيخ' or account_id = a.id) order by created_at desc limit 20) x); end $$;

create or replace function portal_lesson_start(p_s text, p jsonb) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a portal_accounts := pa_acc(p_s, true); ac acts; t date := (now() at time zone 'Asia/Kuwait')::date; dw int := extract(dow from (now() at time zone 'Asia/Kuwait'))::int; tid uuid; mos text;
begin
  select * into ac from acts where id = p->>'act' and (data->>'comm' = a.comm or (a.role = 'شيخ' and data->>'comm' = pa_family(a.comm))) and coalesce(data->>'status','') not in ('ملغى','موقوف','مكتمل');
  if ac.id is null or (a.role = 'شيخ' and not pa_lect_match(ac.data->>'lect', a.name)) then return jsonb_build_object('ok',false,'msg','اختاروا الدرس من قائمة دروسكم'); end if;
  if not (coalesce((ac.data->>'daily')::boolean, false) or (ac.data->'days') @> to_jsonb(dw)) then
    return jsonb_build_object('ok',false,'msg','التسجيل متاح في يوم هذا الدرس فقط'); end if;
  if exists (select 1 from sermon_recs where act_id = ac.id and kind = 'lesson' and fri = t) then
    return jsonb_build_object('ok',false,'msg','سُجّل هذا الدرس اليوم، ولا يمكن تسجيله مرة ثانية'); end if;
  if (select count(*) from sermon_tickets where account_id = a.id and kind = 'lesson' and fri = t) >= 10 then
    return jsonb_build_object('ok',false,'msg','تجاوزتم عدد المحاولات اليوم'); end if;
  mos := coalesce((select m->>'name' from refs r, jsonb_array_elements(r.data->'list') m where r.id = 'mosques' and m->>'id' = ac.data->>'mosque'), ac.data->>'mosRaw', '');
  insert into sermon_tickets(account_id, comm, mosque, fri, closes, kind, act_id) values (a.id, a.comm, mos, t, now() + interval '75 minutes', 'lesson', ac.id) returning id into tid;
  return jsonb_build_object('ok', true, 'ticket', tid, 'now', now(), 'closes', now() + interval '75 minutes', 'mosque', mos);
end $$;

-- دوال التسجيل والرمز: تقبل حساب الشيخ بدل pa_acc_r. تسجيل الشيخ يُحفظ باسمه ورقمه المدني وهاتفه من حسابه.
do $$ declare f text; d text; begin
  foreach f in array array['portal_sermon_start(text,jsonb)','portal_sermon_window(text)','portal_me_sermon(text,jsonb)','portal_me_pin(text,text,text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    d := replace(replace(d, 'pa_acc_r(p_s)', 'pa_acc(p_s, true)'), 'portal_accounts := pa_acc(p_s);', 'portal_accounts := pa_acc(p_s, true);');
    if f = 'portal_me_sermon(text,jsonb)' then
      if position('a.role = ''مسجّل''' in d) = 0 then raise exception 'portal_me_sermon: النص المتوقع غير موجود'; end if;
      d := regexp_replace(d, '  if a\.role = ''مسجّل''[^\n]*\n', E'  if a.role = ''شيخ'' then p := p || jsonb_build_object(''khatib'', a.name, ''civil'', a.civil, ''phone'', a.phone); end if;\n');
    end if;
    if position('pa_acc(p_s, true)' in d) = 0 or position('مسجّل' in d) > 0 then raise exception '% لم يُعدَّل', f; end if;
    execute d;
  end loop;
end $$;

-- حذف رابط الخطباء والمحاضرين القديم
drop function if exists portal_me_rec_link(text, boolean);
drop function if exists portal_rec_info(text);
drop function if exists pa_acc_r(text);
delete from portal_sessions where account_id in (select id from portal_accounts where role = 'مسجّل');
delete from portal_push where account_id in (select id from portal_accounts where role = 'مسجّل');
delete from portal_accounts a where a.role = 'مسجّل' and not exists (select 1 from sermon_recs r where r.account_id = a.id);
update portal_accounts set active = false where role = 'مسجّل';

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' and pg_get_functiondef(p.oid) ~ 'pa_acc_r|portal_rec_info|portal_me_rec_link') then raise exception 'ما زالت دالة تعتمد على الرابط القديم'; end if;
end $$;

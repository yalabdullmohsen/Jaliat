-- 2026-11-10 (بعد portal_sheikh): توحيد مع ترحيل «sheikh_accounts» الذي طبّقته نافذة موازية قبله بدقائق.
-- عمود واحد لنوع الطلب (kind)، ودالة طلب واحدة (portal_self_signup)، وإصلاح رفض طلب الشيخ لأن أعمدة النائب كانت إلزامية.

update portal_signups set kind = role where role = 'sheikh' and kind <> 'sheikh';
alter table portal_signups drop column if exists role;
alter table portal_signups alter column dep_name drop not null, alter column dep_civil drop not null, alter column dep_phone drop not null;
drop function if exists portal_sheikh_register(jsonb);

do $$ declare d text; begin
  d := pg_get_functiondef('portal_self_signup(jsonb)'::regprocedure);
  if position('insert into portal_signups(role,' in d) = 0 then raise exception 'portal_self_signup: النص المتوقع غير موجود'; end if;
  execute replace(d, 'insert into portal_signups(role,', 'insert into portal_signups(kind,');
end $$;

create or replace function staff_portal_signups() returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin if my_role() is null then raise exception 'غير مصرح'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'lang', lang, 'comm', comm, 'comm_new', comm_new, 'name', name, 'civil', civil, 'phone', phone, 'dep_name', dep_name, 'dep_civil', dep_civil, 'dep_phone', dep_phone, 'notes', notes, 'email', email, 'dep_email', dep_email, 'status', status, 'reason', reason, 'at', created_at) order by created_at desc), '[]') from portal_signups where status = 'pending' or created_at > now() - interval '30 days'); end $$;

create or replace function staff_portal_decide(p_id uuid, p_ok boolean, p_comm text default null, p_reason text default null) returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare g portal_signups; cm text; cid uuid; L jsonb;
begin
  if coalesce(my_role(),'') not in ('admin','editor') then raise exception 'غير مصرح'; end if;
  select * into g from portal_signups where id = p_id and status = 'pending' for update; if not found then raise exception 'الطلب غير موجود أو تمت معالجته'; end if;
  if not p_ok then update portal_signups set status = 'rejected', reason = left(p_reason,300), decided_by = auth.uid(), decided_at = now() where id = p_id; return jsonb_build_object('ok',true); end if;
  cm := coalesce(nullif(trim(p_comm),''), g.comm, g.comm_new);
  if g.kind = 'sheikh' then
    if not exists (select 1 from coord_links where comm = cm and active) then raise exception 'اختر جالية الشيخ من القائمة قبل الموافقة'; end if;
    if exists (select 1 from portal_accounts where civil = g.civil and comm = cm and active and role in ('منسق','نائب')) then raise exception 'لهذا الرقم المدني حساب منسق في الجالية نفسها'; end if;
    insert into portal_accounts(comm, civil, name, phone, role, pin_hash) values (cm, g.civil, g.name, g.phone, 'شيخ', g.pin_hash)
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
end $$;

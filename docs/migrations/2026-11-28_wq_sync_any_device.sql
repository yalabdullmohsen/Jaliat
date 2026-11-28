-- JL-SYNC-2 (طلب يوسف 2026-11-28): «مزامنة الآن» من أي جهاز مسجّل في وثيقة، وإيقاف المزامنة الدورية مؤقتًا بعلَم.
-- إضافة فقط: علَم settings.wq_sync_auto ودالتان لصاحب صلاحية الكتابة، وتعديل نصوص بلا «جهاز الدوام»،
-- وتنبيه wq_sync_late لا يُرسل ما دامت الدورية متوقفة. التراجع: docs/migrations/2026-11-28_wq_sync_any_device.rollback.sql
-- إعادة الدورية لاحقًا: update settings set value = jsonb_set(value,'{paused}','false') where key = 'wq_sync_auto';
begin;

insert into public.settings(key, value)
values ('wq_sync_auto', jsonb_build_object('paused', true, 'since', now(), 'why', 'JL-SYNC-2: يوسف يعدّل ثم يضع مزامنة جديدة'))
on conflict (key) do nothing;

create or replace function public.wq_sync_auto_paused() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select coalesce((select (value->>'paused')::boolean from settings where key = 'wq_sync_auto'), false)
$$;

-- الجهاز الذي ضُغط منه يلتقط طلبه بنفسه (بجلسة المستخدم، لا بمفتاح)
create or replace function public.wq_sync_claim_me(p_id bigint) returns public.watheqa_sync_requests
language plpgsql security definer set search_path to 'public' as $$
declare r public.watheqa_sync_requests;
begin
  if coalesce(my_role(), 'viewer') = 'viewer' then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  update watheqa_sync_requests set status = 'running', claimed_at = now()
   where id = p_id and status in ('pending', 'running') returning * into r;
  return r;
end $$;

create or replace function public.wq_sync_fail_me(p_id bigint, p_error text) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if coalesce(my_role(), 'viewer') = 'viewer' then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  update watheqa_sync_requests set status = 'failed', finished_at = now(), error = left(coalesce(nullif(trim(p_error), ''), 'تعذّرت المزامنة'), 300)
   where id = p_id and status in ('pending', 'running');
  get diagnostics n = row_count; return n;
end $$;

revoke all on function public.wq_sync_claim_me(bigint), public.wq_sync_fail_me(bigint, text) from public, anon;
grant execute on function public.wq_sync_claim_me(bigint), public.wq_sync_fail_me(bigint, text) to authenticated;
revoke all on function public.wq_sync_auto_paused() from public, anon;

create or replace function public.wq_sync_poll(p_key text) returns setof public.watheqa_sync_requests
language plpgsql security definer set search_path to 'public' as $$
begin
  if not wq_sync_key_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  update watheqa_sync_requests set status = 'failed', finished_at = now(), error = 'انتهت مهلة الطلب ولم يلتقطه أي جهاز متصل بوثيقة'
   where status = 'pending' and requested_at < now() - interval '30 minutes';
  return query update watheqa_sync_requests set status = 'running', claimed_at = now()
   where status = 'pending' returning *;
end $$;

create or replace function public.wq_sync_close_from_settings() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare last timestamptz;
begin
  if new.key <> 'watheqa_sync' then return new; end if;
  if new.value->>'state' = 'login' then
    update watheqa_sync_requests set status = 'failed', finished_at = now(), error = 'جلسة وثيقة منتهية: سجّل الدخول في وثيقة'
     where status in ('pending', 'running');
    return new;
  end if;
  begin last := (new.value->>'last')::timestamptz; exception when others then last := null; end;
  if last is not null then
    update watheqa_sync_requests set status = 'done', finished_at = last
     where status in ('pending', 'running') and requested_at <= last;
  end if;
  return new;
end $$;

create or replace function public.section_daily_alert() returns void
language plpgsql security definer set search_path to 'public' as $function$
declare ce int; ce_top text; rq int; su int; fr int; wo int; last timestamptz; parts text[] := '{}';
begin
  -- أخطاء المتصفح الجديدة خلال 24 ساعة (يقرؤها مالكا النظام فقط، كسياسة client_errors)
  select count(*), string_agg(distinct left(msg, 60), ' | ') into ce, ce_top
    from (select msg from client_errors where at > now() - interval '1 day' limit 200) e;
  if ce > 0 then
    perform notify(p.id, 'client_errors', ce || ' خطأ جديد في المتصفح خلال يوم', coalesce(ce_top, ''), '')
      from profiles p where p.active and p.username in ('yousef','fayez');
  end if;
  -- الطلبات المعلّقة أكثر من 3 أيام
  select count(*) into rq from requests where status in ('جديد','قيد المراجعة') and created_at < now() - interval '3 days';
  select count(*) into su from portal_signups where status = 'pending' and created_at < now() - interval '3 days';
  select count(*) into fr from feature_requests where status = 'جديد' and created_at < now() - interval '3 days';
  select count(*) into wo from watheqa_outbox where status in ('pending','working') and created_at < now() - interval '3 days';
  if rq > 0 then parts := parts || (rq || ' طلب وارد'); end if;
  if su > 0 then parts := parts || (su || ' طلب حساب في البوابة'); end if;
  if fr > 0 then parts := parts || (fr || ' طلب إضافة'); end if;
  if wo > 0 then parts := parts || (wo || ' كتاب لم يُحفظ في وثيقة'); end if;
  if array_length(parts, 1) > 0 then
    perform notify_admins('pending_items', 'معلّق أكثر من 3 أيام', array_to_string(parts, '، '), '#inbox', null);
  end if;
  -- وثيقة: إشعار عاجل واحد للمشرف إن تجاوز التأخر 24 ساعة، ولا يتكرر حتى تعود المزامنة.
  -- JL-SYNC-2: لا تنبيه ما دامت المزامنة الدورية متوقفة بعلَم wq_sync_auto (لا إنذار كاذب).
  select (value->>'last')::timestamptz into last from settings where key = 'watheqa_sync';
  if not wq_sync_auto_paused() and last is not null and last < now() - interval '24 hours' and not exists (
       select 1 from notifications where kind = 'wq_sync_late' and created_at > last) then
    perform notify_admins('wq_sync_late', 'لم تتم مزامنة وثيقة منذ ' || extract(day from now() - last)::int || ' يوم',
      'آخر مزامنة ' || to_char(last at time zone 'Asia/Kuwait', 'DD/MM HH12:MI') || '. افتح وثيقة على أي جهاز واضغط «مزامنة الآن» في إنجاز', '#watheqa', null);
  end if;
end $function$;

commit;

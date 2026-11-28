-- تراجع JL-SYNC-2: يعيد التعريفات السابقة كما كانت على الإنتاج قبل 2026-11-28 ويحذف ما أُضيف فقط.
begin;
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
  select (value->>'last')::timestamptz into last from settings where key = 'watheqa_sync';
  if last is not null and last < now() - interval '24 hours' and not exists (
       select 1 from notifications where kind = 'wq_sync_late' and created_at > last) then
    perform notify_admins('wq_sync_late', 'لم تتم مزامنة وثيقة منذ ' || extract(day from now() - last)::int || ' يوم',
      'آخر مزامنة ' || to_char(last at time zone 'Asia/Kuwait', 'DD/MM HH12:MI') || '. افتح وثيقة وسجّل الدخول على جهاز الدوام لتعود المزامنة', '#watheqa', null);
  end if;
end $function$;

create or replace function public.wq_sync_poll(p_key text) returns setof public.watheqa_sync_requests
language plpgsql security definer set search_path to 'public' as $$
begin
  if not wq_sync_key_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  update watheqa_sync_requests set status = 'failed', finished_at = now(), error = 'انتهت مهلة الطلب ولم يلتقطه جهاز الدوام'
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
    update watheqa_sync_requests set status = 'failed', finished_at = now(), error = 'جلسة وثيقة منتهية على جهاز الدوام: سجّل الدخول في وثيقة'
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

drop function if exists public.wq_sync_claim_me(bigint);
drop function if exists public.wq_sync_fail_me(bigint, text);
drop function if exists public.wq_sync_auto_paused();
delete from public.settings where key = 'wq_sync_auto';
commit;

-- JL-4 بنود 3 و4 و5 (الخادم): درجات الإشعارات، منع التكرار، الأرشفة، الإعداد الفوري لكل مستخدم،
-- التنبيه اليومي للقسم، وتنبيه تأخر مزامنة وثيقة. إضافي بالكامل، والتراجع: 2026-11-24_notif_tiers.down.sql
-- السبب الجذري للتراكم (2026-11-24): 1185 إشعارًا، 329 wq_new و319 doc_expiring غير مقروءة؛
-- daily_notify ترسل doc_expiring للموافقة نفسها 5 مرات (14/7/3/1/0) لكل موظف، والجرس يعدّ آخر 80 فقط.
begin;

-- 1) الدرجة من النوع: urgent عاجل | action يحتاج إجراء | info للعلم (بلا شارة ولا إشعار فوري)
create or replace function public.notif_tier(k text) returns text language sql immutable set search_path to 'public' as $$
  select case
    when k in ('wq_sync_late','wq_no','task_due','booking_today','request_waiting') then 'urgent'
    when k in ('wq_ok','weekly','monthly_report','task_progress','task_seen','task_done','question_seen',
               'permit_issued','request_status','act_changed','note_new','sermon_rec','test','chat_team') then 'info'
    else 'action' end $$;

alter table public.notifications add column tier text generated always as (public.notif_tier(kind)) stored;
alter table public.notifications add column archived_at timestamptz;
create index notifications_user_live on public.notifications (user_id, created_at desc) where archived_at is null;

-- 2) الإعداد لكل مستخدم: الإشعار الفوري للعاجل فقط أو للكل
alter table public.notif_prefs add column push_mode text not null default 'all' check (push_mode in ('all','urgent'));

-- 3) تجميع المتشابه من المصدر: إشعار غير مقروء بنفس النوع والرابط يُحدَّث بدل تكرار صف جديد
create or replace function public.notify(uid uuid, kind text, title text, body text, link text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare nid bigint;
begin
  if uid is null then return; end if;
  if not exists (select 1 from profiles where id = uid and active) then return; end if;
  if exists (select 1 from notif_prefs where user_id = uid and notify.kind = any(off)) then return; end if;
  if coalesce(notify.link, '') <> '' then
    select n.id into nid from notifications n
     where n.user_id = uid and n.kind = notify.kind and n.link = notify.link and n.read_at is null and n.archived_at is null
     order by n.created_at desc limit 1;
    if nid is not null then
      update notifications set title = coalesce(notif_clean(notify.title), 'إنجاز'), body = coalesce(notif_clean(notify.body), ''), created_at = now()
       where id = nid;
      return;
    end if;
  end if;
  insert into notifications(user_id, kind, title, body, link)
  values (uid, notify.kind, coalesce(notif_clean(notify.title), 'إنجاز'), coalesce(notif_clean(notify.body), ''), coalesce(notify.link, ''));
end $function$;

-- 4) الإشعار الفوري: «للعلم» لا يُرسل فوريًا، ومن اختار «العاجل فقط» لا يصله غيره
create or replace function public.push_hook()
 returns trigger language plpgsql security definer set search_path to 'public', 'net' as $function$
begin
  if new.tier = 'info' then return new; end if;
  if new.tier <> 'urgent' and exists (select 1 from public.notif_prefs where user_id = new.user_id and push_mode = 'urgent') then return new; end if;
  perform net.http_post(
    url := 'https://nybuospfwbbtejvjivhd.supabase.co/functions/v1/notify-push',
    body := jsonb_build_object('id', new.id, 'user_id', new.user_id, 'kind', new.kind, 'title', new.title, 'body', new.body, 'link', new.link),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook', (select v from public.app_secrets where k = 'hook')));
  return new;
end $function$;

-- 5) الأرشفة اليومية: المقروء بعد 7 أيام، و«للعلم» بعد 7 أيام، والمحسوم فورًا
create or replace function public.notif_maintain() returns int
 language plpgsql security definer set search_path to 'public' as $function$
declare td date := (now() at time zone 'Asia/Kuwait')::date; n int := 0; c int;
begin
  update notifications set archived_at = now() where archived_at is null
     and ((read_at is not null and read_at < now() - interval '7 days') or (tier = 'info' and created_at < now() - interval '7 days'));
  get diagnostics c = row_count; n := n + c;
  -- المكرر القديم: يبقى الأحدث فقط من كل (مستخدم، نوع، رابط) غير مقروء
  update notifications x set archived_at = now() where x.archived_at is null and x.read_at is null and x.link <> ''
     and exists (select 1 from notifications y where y.user_id = x.user_id and y.kind = x.kind and y.link = x.link
                 and y.read_at is null and y.archived_at is null and (y.created_at, y.id) > (x.created_at, x.id));
  get diagnostics c = row_count; n := n + c;
  -- مهمة منجزة أو ملغاة
  update notifications x set archived_at = now() from tasks t where x.archived_at is null and x.kind like 'task%'
     and x.link = '#task:' || t.id and t.status in ('منجزة','ملغاة');
  get diagnostics c = row_count; n := n + c;
  -- موافقة جُدّدت (تنتهي بعد أكثر من 14 يومًا) أو انتهت
  update notifications x set archived_at = now() from refs r, jsonb_array_elements(r.data->'list') d
   where x.archived_at is null and x.kind = 'doc_expiring' and r.id::text = 'docs' and x.link = '#doc:' || (d->>'no')
     and coalesce(d->>'end','') ~ '^\d{4}-\d{2}-\d{2}$' and ((d->>'end')::date - td > 14 or (d->>'end')::date < td);
  get diagnostics c = row_count; n := n + c;
  -- كتاب وثيقة اتُّخذ فيه إجراء
  update notifications x set archived_at = now() from watheqa_docs w where x.archived_at is null and x.kind like 'wq%'
     and x.link = '#wq:' || w.id and w.action_state = 'تم الرد';
  get diagnostics c = row_count; n := n + c;
  -- طلب لم يعد جديدًا
  update notifications x set archived_at = now() from requests q where x.archived_at is null and x.kind in ('request_new','request_waiting')
     and x.link = '#req:' || q.id and q.status not in ('جديد');
  get diagnostics c = row_count; n := n + c;
  return n;
end $function$;

-- 6) التنبيه اليومي للقسم (بند 3) وتأخر المزامنة (بند 5)
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
  -- وثيقة: إشعار عاجل واحد للمشرف إن تجاوز التأخر 24 ساعة، ولا يتكرر حتى تعود المزامنة
  select (value->>'last')::timestamptz into last from settings where key = 'watheqa_sync';
  if last is not null and last < now() - interval '24 hours' and not exists (
       select 1 from notifications where kind = 'wq_sync_late' and created_at > last) then
    perform notify_admins('wq_sync_late', 'لم تتم مزامنة وثيقة منذ ' || extract(day from now() - last)::int || ' يوم',
      'آخر مزامنة ' || to_char(last at time zone 'Asia/Kuwait', 'DD/MM HH12:MI') || '. افتح وثيقة وسجّل الدخول على جهاز الدوام لتعود المزامنة', '#watheqa', null);
  end if;
end $function$;

revoke execute on function public.notif_maintain() from public, anon, authenticated;
revoke execute on function public.section_daily_alert() from public, anon, authenticated;

select cron.schedule('jaliyat-notif-maintain', '50 0 * * *', 'select public.notif_maintain()');
select cron.schedule('jaliyat-section-alert', '15 5 * * *', 'select public.section_daily_alert()');

-- تشغيل أول للأرشفة لتنظيف المتراكم الحالي
select public.notif_maintain();

commit;

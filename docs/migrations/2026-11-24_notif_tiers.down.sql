-- تراجع JL-4 بنود 3–5 (الخادم): إعادة notify وpush_hook كما كانتا، وإزالة الإضافات.
-- ملاحظة: الإشعارات المؤرشفة تعود ظاهرة بحذف العمود archived_at.
begin;
select cron.unschedule('jaliyat-notif-maintain');
select cron.unschedule('jaliyat-section-alert');
drop function public.section_daily_alert();
drop function public.notif_maintain();

create or replace function public.notify(uid uuid, kind text, title text, body text, link text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if uid is null then return; end if;
  if not exists (select 1 from profiles where id = uid and active) then return; end if;
  if exists (select 1 from notif_prefs where user_id = uid and notify.kind = any(off)) then return; end if;
  insert into notifications(user_id, kind, title, body, link)
  values (uid, notify.kind, coalesce(notif_clean(notify.title), 'إنجاز'), coalesce(notif_clean(notify.body), ''), coalesce(notify.link, ''));
end $function$;

create or replace function public.push_hook()
 returns trigger language plpgsql security definer set search_path to 'public', 'net' as $function$
begin
  perform net.http_post(
    url := 'https://nybuospfwbbtejvjivhd.supabase.co/functions/v1/notify-push',
    body := jsonb_build_object('id', new.id, 'user_id', new.user_id, 'kind', new.kind, 'title', new.title, 'body', new.body, 'link', new.link),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook', (select v from public.app_secrets where k = 'hook')));
  return new;
end $function$;

alter table public.notif_prefs drop column push_mode;
drop index public.notifications_user_live;
alter table public.notifications drop column archived_at;
alter table public.notifications drop column tier;
drop function public.notif_tier(text);
commit;

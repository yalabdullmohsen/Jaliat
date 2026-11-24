-- JL-8 «نضيف» (موافقة يوسف 2026-11-25): سجل فتح الصفحات، وإشعار المنسق تلقائيًا بالتصريح وبانتهاء الموافقة.
-- 1) page_views: كل فتح صفحة في نظام الموظفين (من؟ أي صفحة؟ متى؟) ليكون قرار الدمج والحذف القادم بأرقام. القراءة للمشرف فقط.
-- 2) permits_portal_push: عند صدور تصريح لنشاط مرتبط بجالية يصل منسقيها إشعار البوابة (portal_notify الموجودة).
-- 3) portal_expiry_push: يُضاف يوم الانتهاء نفسه (0) إلى تذكيري 14 و3 أيام الموجودين.
-- الواجهة تعمل قبل التطبيق وبعده (سجل الصفحات يتوقف بهدوء إن لم يوجد الجدول). التراجع: 2026-11-25_jl8_adds.down.sql

begin;

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  uid uuid not null default auth.uid(),
  view text not null check (length(view) between 1 and 40),
  at timestamptz not null default now()
);
create index if not exists page_views_at on public.page_views (at);
create index if not exists page_views_view_at on public.page_views (view, at);
alter table public.page_views enable row level security;
drop policy if exists "members log own views" on public.page_views;
create policy "members log own views" on public.page_views for insert to authenticated with check (uid = (select auth.uid()) and (select my_role()) is not null);
drop policy if exists "admins read views" on public.page_views;
create policy "admins read views" on public.page_views for select to authenticated using ((select my_role()) = 'admin');

create or replace function public.permits_portal_push_trg() returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare c text;
begin
  if coalesce(new.act_id,'') = '' then return new; end if;
  select a.data->>'comm' into c from acts a where a.id = new.act_id;
  if c is null or c = '' then return new; end if;
  perform portal_notify(c, 'صدر تصريح نشاطكم', 'التصريح ' || coalesce(new.no,'') || ' · ' || coalesce(new.data->>'mosque','') || ' · ساري حتى ' || to_char(new.until,'DD/MM/YYYY'));
  return new; end $function$;
drop trigger if exists permits_portal_push on public.permits;
create trigger permits_portal_push after insert on public.permits for each row execute function permits_portal_push_trg();

create or replace function public.portal_expiry_push() returns void language plpgsql security definer set search_path to 'public' as $function$
declare d record; k int;
begin for d in select x->>'comm' comm, x->>'no' no, (x->>'end')::date e from refs r, jsonb_array_elements(r.data->'list') x
  where r.id = 'docs' and x->>'end' ~ '^\d{4}-\d{2}-\d{2}$' and (x->>'end')::date - (now() at time zone 'Asia/Kuwait')::date in (14, 3, 0) loop
    k := d.e - (now() at time zone 'Asia/Kuwait')::date;
    if k = 0 then perform portal_notify(d.comm, 'انتهت موافقتكم اليوم', 'الموافقة ' || d.no || ' تنتهي اليوم ' || to_char(d.e,'DD/MM/YYYY') || '. اختاروا «تجديد» من البوابة');
    else perform portal_notify(d.comm, 'موافقة تقترب من نهايتها', 'الموافقة ' || d.no || ' تنتهي ' || to_char(d.e,'DD/MM/YYYY') || '. اختاروا «تجديد» من البوابة'); end if;
  end loop; end $function$;

commit;

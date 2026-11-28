-- JL-SYNC (طلب يوسف 2026-11-28): زر «مزامنة الآن» يسجّل طلب مزامنة لوثيقة، فيلتقطه مزامن جهاز الدوام فورًا.
-- طُبِّق على الإنتاج 28/11/2026 بموافقة يوسف. يبقى: مهمة جهاز الدوام تستدعي wq_sync_poll كل دقيقة.
-- المزامنة الدورية لا تتغير: هذا مسار إضافي فقط.
--
-- المسار:
--   1) الموظف يضغط «مزامنة الآن» ← wq_sync_now() ينشئ طلبًا pending (أو يعيد طلبًا قائمًا عمره أقل من 10 دقائق).
--   2) مهمة جهاز الدوام تستدعي wq_sync_poll(مفتاح الاستقبال) كل دقيقة ← pending يصير running وتبدأ المزامنة.
--   3) حين ترسل المهمة الكتب إلى watheqa-ingest يُحدَّث settings.watheqa_sync.last ← المحفّز يغلق الطلبات «done».
--      وإن كتبت المهمة state = 'login' (جلسة وثيقة منتهية) ← المحفّز يغلقها «failed» بالسبب.
--   4) المهمة تستطيع إغلاق طلب بسبب آخر عبر wq_sync_fail(المفتاح, السبب).
--   الواجهة تعرض «جارٍ…» ثم «✓» أو السبب، ومهلتها: دقيقتان لالتقاط الطلب، و10 دقائق لإكماله.
--
-- تراجع:
--   drop trigger if exists watheqa_sync_settings_close on public.settings;
--   drop function if exists public.wq_sync_close_from_settings(), public.wq_sync_now(), public.wq_sync_poll(text), public.wq_sync_fail(text, text);
--   drop table if exists public.watheqa_sync_requests;

create table if not exists public.watheqa_sync_requests (
  id bigserial primary key,
  requested_by uuid default auth.uid(),
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  claimed_at timestamptz,
  finished_at timestamptz,
  error text check (error is null or length(error) <= 300)
);
create index if not exists watheqa_sync_requests_open on public.watheqa_sync_requests (requested_at) where status in ('pending', 'running');

alter table public.watheqa_sync_requests enable row level security;
-- القراءة للموظفين الكاتبين فقط (كـS.canWrite: أي دور فعّال غير viewer)، والكتابة عبر الدوال فقط.
drop policy if exists watheqa_sync_requests_read on public.watheqa_sync_requests;
create policy watheqa_sync_requests_read on public.watheqa_sync_requests for select to authenticated
  using (coalesce(public.my_role(), 'viewer') <> 'viewer');

-- الموظف: طلب مزامنة الآن (يعيد الطلب المفتوح الحديث بدل إغراق المهمة بطلبات).
create or replace function public.wq_sync_now() returns public.watheqa_sync_requests
language plpgsql security definer set search_path = public as $$
declare r public.watheqa_sync_requests;
begin
  if coalesce(my_role(), 'viewer') = 'viewer' then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  select * into r from watheqa_sync_requests
   where status in ('pending', 'running') and requested_at > now() - interval '10 minutes'
   order by requested_at desc limit 1;
  if found then return r; end if;
  insert into watheqa_sync_requests default values returning * into r;
  return r;
end $$;

-- مفتاح الاستقبال نفسه الذي تستعمله watheqa-ingest (app_secrets.watheqa_ingest).
create or replace function public.wq_sync_key_ok(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(length(p_key), 0) >= 16 and exists (select 1 from app_secrets where k = 'watheqa_ingest' and v = p_key)
$$;

-- جهاز الدوام: التقاط الطلبات المفتوحة (الطلب المنسي أكثر من 30 دقيقة يُغلق «failed» ولا يُلتقط).
create or replace function public.wq_sync_poll(p_key text) returns setof public.watheqa_sync_requests
language plpgsql security definer set search_path = public as $$
begin
  if not wq_sync_key_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  update watheqa_sync_requests set status = 'failed', finished_at = now(), error = 'انتهت مهلة الطلب ولم يلتقطه جهاز الدوام'
   where status = 'pending' and requested_at < now() - interval '30 minutes';
  return query update watheqa_sync_requests set status = 'running', claimed_at = now()
   where status = 'pending' returning *;
end $$;

-- جهاز الدوام: إغلاق الطلبات المفتوحة بسبب (مثل: المتصفح مغلق، وثيقة لا تستجيب).
create or replace function public.wq_sync_fail(p_key text, p_error text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not wq_sync_key_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  update watheqa_sync_requests set status = 'failed', finished_at = now(), error = left(coalesce(nullif(trim(p_error), ''), 'تعذّرت المزامنة'), 300)
   where status in ('pending', 'running');
  get diagnostics n = row_count; return n;
end $$;

-- إغلاق تلقائي من حالة المزامنة نفسها (settings.watheqa_sync): لا يلزم المهمة تعديل لتُغلق الطلب عند النجاح.
create or replace function public.wq_sync_close_from_settings() returns trigger
language plpgsql security definer set search_path = public as $$
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
drop trigger if exists watheqa_sync_settings_close on public.settings;
create trigger watheqa_sync_settings_close after insert or update on public.settings
  for each row execute function public.wq_sync_close_from_settings();

revoke all on function public.wq_sync_now() from public, anon;
grant execute on function public.wq_sync_now() to authenticated;
revoke all on function public.wq_sync_key_ok(text) from public, anon, authenticated;
grant execute on function public.wq_sync_poll(text), public.wq_sync_fail(text, text) to anon, authenticated;

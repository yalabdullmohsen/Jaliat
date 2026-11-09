-- 1) تسجيل أخطاء المتصفح: كل موظف يكتب أخطاءه فقط، ولا يقرؤها إلا مالك النظام (يوسف/فايز). تُحذف بعد 30 يوماً.
create table if not exists public.client_errors(
  id bigserial primary key, at timestamptz not null default now(), uid uuid default auth.uid(),
  page text, msg text not null check (length(msg) <= 1000), stack text check (length(stack) <= 4000), ua text check (length(ua) <= 300), ver text);
create index if not exists client_errors_at on public.client_errors(at desc);
alter table public.client_errors enable row level security;
create policy ce_ins on public.client_errors for insert to authenticated with check (uid = auth.uid() and public.my_role() is not null);
create policy ce_sel on public.client_errors for select to authenticated using (public.is_owner());
select cron.schedule('jaliyat-client-errors-retention', '40 0 * * *', $q$delete from public.client_errors where at < now() - interval '30 days'$q$);

-- 2) سحب صلاحية anon (والعامة) من دوال الأقسام؛ تبقى للموظفين المسجّلين. fr_notify دالة محفّز لا تُستدعى مباشرة.
revoke execute on function public.dept_ok(text) from public, anon;
revoke execute on function public.my_dept() from public, anon;
revoke execute on function public.fr_notify() from public, anon, authenticated;
revoke execute on function public.staff_activity(date), public.dept_backup(text), public.take_dept_backup(text) from public, anon;
grant execute on function public.dept_ok(text), public.my_dept(), public.staff_activity(date), public.dept_backup(text), public.take_dept_backup(text) to authenticated;

-- تراجع: drop table client_errors; select cron.unschedule('jaliyat-client-errors-retention');
--        grant execute on function dept_ok(text), my_dept(), fr_notify() to anon, public;

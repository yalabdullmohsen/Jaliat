-- المرحلة 0: أساسيات كل قسم (تقارير وسجلات + إدارة) مفصولة في قاعدة البيانات بـ dept_ok().
-- يعتمد على 2026-11-09_admin_wide_depts.sql. لا يحذف بيانات. تراجع: آخر الملف.
--
-- ملاحظة أمنية مهمة: team_backup() كانت SECURITY DEFINER وتُرجع كل جداول النظام لأي موظف؛
-- هنا تُقيَّد: غير الجاليات يحصل على بيانات قسمه فقط.

-- 1) سجل التعديلات يعرف القسم -------------------------------------------------
alter table public.audit add column if not exists dept text references public.depts(code) default 'com_m';
update public.audit set dept = 'com_m' where dept is null;
create index if not exists audit_dept_at on public.audit(dept, at desc);

drop policy if exists "admins read audit" on public.audit;
drop policy if exists "members read audit" on public.audit;
drop policy if exists audit_read on public.audit;
create policy audit_read on public.audit for select to authenticated
  using (public.my_role() is not null and public.dept_ok(dept));

create or replace function public.touch_and_log() returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare d jsonb; s text; r jsonb;
begin
  if tg_op <> 'DELETE' then
    new.updated_at := now(); new.updated_by := auth.uid();
    d := new.data; r := to_jsonb(new);
  else d := old.data; r := to_jsonb(old); end if;
  s := case tg_table_name
    when 'acts' then concat_ws(' · ', d->>'n', d->>'type', d->>'comm', d->>'lect')
    when 'khatibs' then concat_ws(' · ', d->>'mosque', d->>'pri')
    when 'notes' then d->>'title'
    else coalesce(new.id, old.id) end;
  insert into public.audit(tbl,row_id,action,summary,dept) values (tg_table_name, coalesce(new.id, old.id), tg_op, s, coalesce(r->>'dept','com_m'));
  return case when tg_op = 'DELETE' then old else new end;
end $function$;

-- تعديلات سجلات الأقسام تدخل سجل التعديلات بقسمها
create or replace function public.dept_items_log() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.audit(user_id,tbl,row_id,action,summary,dept)
  values (auth.uid(), 'dept_items', coalesce(new.id, old.id)::text, tg_op, coalesce(new.title, old.title), coalesce(new.dept, old.dept));
  return null;
end $$;
drop trigger if exists t_di_log on public.dept_items;
create trigger t_di_log after insert or update or delete on public.dept_items for each row execute function public.dept_items_log();

-- 2) الملاحظات المشتركة لكل قسم -------------------------------------------------
alter table public.notes add column if not exists dept text references public.depts(code) default 'com_m';
update public.notes set dept = 'com_m' where dept is null;
drop policy if exists dept_com_m on public.notes;
drop policy if exists dept_scope on public.notes;
create policy dept_scope on public.notes as restrictive for all to authenticated
  using (public.dept_ok(dept)) with check (public.dept_ok(dept));

-- إشعار الملاحظة الجديدة: الجاليات كما كان، وغيرها لموظفي القسم نفسه فقط
create or replace function public.ev_notes() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(new.dept,'com_m') = 'com_m' then
    perform notify_team('note_new', 'ملاحظة جديدة من ' || who(auth.uid()), coalesce(new.data->>'title',''), '#note:' || new.id, auth.uid());
  else
    perform public.notify(p.id, 'note_new', 'ملاحظة جديدة من ' || who(auth.uid()), coalesce(new.data->>'title',''), '#note:' || new.id)
      from profiles p where p.active and p.dept = new.dept and p.id <> auth.uid();
  end if;
  return null;
end $function$;

-- 3) الحفظ في OneDrive: سجل الحفظ لكل قسم --------------------------------------
alter table public.od_saves add column if not exists dept text references public.depts(code) default 'com_m';
update public.od_saves set dept = 'com_m' where dept is null;
drop policy if exists dept_com_m on public.od_saves;
drop policy if exists dept_scope on public.od_saves;
create policy dept_scope on public.od_saves as restrictive for all to authenticated
  using (public.dept_ok(dept)) with check (public.dept_ok(dept));

-- 4) نسخة بيانات القسم (يدوية + ليلية) ----------------------------------------
-- p_dept = null: كل ما يدخل نطاق المستدعي (القسم أو أقسام المراقبة أو الكل)
create or replace function public.dept_backup(p_dept text default null) returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  if public.my_role() is null then raise exception 'staff only'; end if;
  if p_dept is not null and not public.dept_ok(p_dept) then raise exception 'not allowed'; end if;
  r := jsonb_build_object(
    'dept_items', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from dept_items x where public.dept_ok(x.dept) and (p_dept is null or x.dept = p_dept)),
    'notes', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from notes x where public.dept_ok(x.dept) and (p_dept is null or x.dept = p_dept)),
    'feature_requests', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from feature_requests x where public.dept_ok(x.dept) and (p_dept is null or x.dept = p_dept)),
    'audit', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from (select * from audit a where public.dept_ok(a.dept) and (p_dept is null or a.dept = p_dept) order by a.at desc limit 5000) x));
  return jsonb_build_object('at', now(), 'system', 'إنجاز', 'dept', p_dept, 'tables', r);
end $$;

create table if not exists public.dept_backups(
  id bigserial primary key, dept text not null references public.depts(code), at timestamptz not null default now(), data jsonb not null);
create index if not exists dept_backups_dept on public.dept_backups(dept, at desc);
alter table public.dept_backups enable row level security;
drop policy if exists db_sel on public.dept_backups;
create policy db_sel on public.dept_backups for select to authenticated
  using (public.my_role() in ('admin','editor') and public.dept_ok(dept));

-- نسخة الآن لقسم (للمدير/المحرر ضمن نطاقه) والنسخة الليلية لكل الأقسام عدا الجاليات
create or replace function public.take_dept_backup(p_dept text) returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if public.my_role() not in ('admin','editor') or not public.dept_ok(p_dept) then raise exception 'not allowed'; end if;
  if p_dept = 'com_m' then raise exception 'com_m uses take_backup'; end if;
  insert into dept_backups(dept, data) select p_dept, public.dept_backup(p_dept);
end $$;
create or replace function public.take_dept_backups_cron() returns void language plpgsql security definer set search_path to 'public' as $$
declare c text;
begin
  for c in select code from depts where parent is not null and parent <> 'all' and code <> 'com_m' loop
    insert into dept_backups(dept, data) select c, jsonb_build_object('at', now(), 'system', 'إنجاز', 'dept', c, 'tables', jsonb_build_object(
      'dept_items', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from dept_items x where x.dept = c),
      'notes', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from notes x where x.dept = c),
      'feature_requests', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from feature_requests x where x.dept = c)));
  end loop;
end $$;
revoke all on function public.take_dept_backups_cron() from public, anon, authenticated;
select cron.schedule('jaliyat-dept-backup', '5 0 * * *', 'select public.take_dept_backups_cron()');
select cron.schedule('jaliyat-dept-backup-retention', '35 0 * * *', $q$delete from public.dept_backups where at < now() - interval '45 days'$q$);

-- 5) «الحفظ في OneDrive» والتنزيل: team_backup لا تُسرّب قسم غيرك ---------------
create or replace function public.team_backup() returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare t text; r jsonb := '{}'; v jsonb;
begin
  if public.my_role() is null then raise exception 'staff only'; end if;
  if not public.dept_ok('com_m') then return public.dept_backup(null); end if;
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('app_secrets','ai_secrets','backups','private_seed','push_subs','portal_push','portal_sessions','od_saves')
    order by c.relname loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) - array[''pin_hash'',''pass_hash'',''token'',''endpoint'',''p256dh'',''auth'',''anthropic_key'']), ''[]''::jsonb) from %I x', t) into v;
    r := r || jsonb_build_object(t, v);
  end loop;
  return jsonb_build_object('at', now(), 'system', 'إنجاز', 'tables', r);
end $function$;

-- 6) نشاط الموظفين: موظفو نطاق المستدعي فقط -----------------------------------
create or replace function public.staff_activity(p_day date) returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare s timestamptz := p_day::timestamp at time zone 'Asia/Kuwait'; e timestamptz := (p_day + 1)::timestamp at time zone 'Asia/Kuwait';
begin
  if my_role() is distinct from 'admin' then raise exception 'admins only'; end if;
  return (select coalesce(jsonb_agg(x order by (x->>'n')::int desc, x->>'name'), '[]') from (
    select jsonb_build_object('id', p.id, 'name', p.name, 'role', p.role,
      'n', (select count(*) from audit a where a.user_id = p.id and a.at >= s and a.at < e),
      'first', (select min(a.at) from audit a where a.user_id = p.id and a.at >= s and a.at < e),
      'last', (select max(a.at) from audit a where a.user_id = p.id and a.at >= s and a.at < e),
      'by', (select coalesce(jsonb_object_agg(k, c), '{}') from (select a.tbl || ':' || a.action k, count(*) c from audit a where a.user_id = p.id and a.at >= s and a.at < e group by 1) z),
      'items', (select coalesce(jsonb_agg(jsonb_build_object('at', a.at, 'tbl', a.tbl, 'act', a.action, 's', left(a.summary, 140)) order by a.at), '[]') from (select * from audit a where a.user_id = p.id and a.at >= s and a.at < e and a.tbl <> 'refs' order by a.at limit 400) a),
      'tasks_done', (select count(*) from tasks t where t.assignee = p.id and t.done_at >= s and t.done_at < e),
      'questions', (select count(*) from questions q where (q.from_id = p.id and q.created_at >= s and q.created_at < e) or (q.to_id = p.id and q.answered_at >= s and q.answered_at < e)),
      'chats', (select count(*) from chat_messages c where c.from_id = p.id and c.created_at >= s and c.created_at < e),
      'last_login', (select u.last_sign_in_at from auth.users u where u.id = p.id)) x
    from profiles p where p.active and public.dept_ok(coalesce(p.dept, 'com_m'))) q);
end $function$;

-- ===== تراجع =====
-- drop trigger t_di_log on dept_items; drop function dept_items_log();
-- drop policy audit_read on audit; create policy "admins read audit" on audit for select to authenticated using ((select my_role()) = 'admin');
--   create policy "members read audit" on audit for select to authenticated using ((select my_role()) is not null);
-- drop policy dept_scope on notes; create policy dept_com_m on notes as restrictive for all to authenticated using (dept_ok('com_m')) with check (dept_ok('com_m'));
-- drop policy dept_scope on od_saves; create policy dept_com_m on od_saves as restrictive for all to authenticated using (dept_ok('com_m')) with check (dept_ok('com_m'));
-- select cron.unschedule('jaliyat-dept-backup'); select cron.unschedule('jaliyat-dept-backup-retention'); drop table dept_backups;
-- ثم أعد تعريف team_backup / staff_activity / touch_and_log / ev_notes من نسخهم السابقة (في سجل git).

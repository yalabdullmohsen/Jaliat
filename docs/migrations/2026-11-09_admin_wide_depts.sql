-- توسعة إنجاز لكل إدارة العلاقات الخارجية: الأقسام، قسم كل موظف، فصل البيانات، سجلات الأقسام، طلبات الإضافة.
-- لا يحذف ولا يعدّل أي سياسة قائمة؛ يضيف طبقة تقييد فوق جداول قسم الجاليات - رجال فقط.
create table if not exists public.depts(code text primary key, name text not null, parent text references public.depts(code), ord int default 0, kinds text[] default '{}');
insert into public.depts(code,name,parent,ord,kinds) values
('all','إدارة العلاقات الخارجية',null,0,'{}'),
('ctl_ext','مراقبة العلاقات الخارجية','all',10,'{}'),
('ext_research','قسم البحوث والمنظمات الدولية','ctl_ext',11,'{بحوث ودراسات,منظمات دولية,كتب ومراسلات,مهام ومتابعة}'),
('ext_aid','قسم المعونات والمنح الدراسية','ctl_ext',12,'{مشاريع ومعونات,منح دراسية,طلاب دارسون,كتب ومراسلات,مهام ومتابعة}'),
('ext_deleg','قسم الوفود والدعم الثقافي','ctl_ext',13,'{وفود وزيارات,دعم ثقافي,كتب ومراسلات,مهام ومتابعة}'),
('ext_envoys','قسم المبعوثين','ctl_ext',14,'{مبعوثون,كتب ومراسلات,مهام ومتابعة}'),
('ctl_com','مراقبة الجاليات والتعريف بالإسلام','all',20,'{}'),
('com_m','قسم الجاليات ورعاية المهتدين وطلبة البعوث - رجال','ctl_com',21,'{}'),
('com_w','قسم الجاليات ورعاية المهتدين وطلبة البعوث - نساء','ctl_com',22,'{أنشطة ودروس,مهتديات,طالبات البعوث,كتب ومراسلات,مهام ومتابعة}'),
('daw_m','قسم التعريف بالإسلام - رجال','ctl_com',23,'{برامج تعريف,زيارات ومعارض,كتب ومراسلات,مهام ومتابعة}'),
('daw_w','قسم التعريف بالإسلام - نساء','ctl_com',24,'{برامج تعريف,زيارات ومعارض,كتب ومراسلات,مهام ومتابعة}')
on conflict (code) do update set name=excluded.name,parent=excluded.parent,ord=excluded.ord;
alter table public.depts enable row level security;
create policy depts_read on public.depts for select to authenticated using (true);

alter table public.profiles add column if not exists dept text references public.depts(code) default 'com_m';
update public.profiles set dept='com_m' where dept is null;
update public.profiles set dept='all' where username in ('sat','yousef');

create or replace function public.my_dept() returns text language sql stable security definer set search_path=public as
$$ select dept from public.profiles where id=auth.uid() and active $$;
-- المدير يرى الكل، المراقب يرى أقسام مراقبته، الموظف يرى قسمه
create or replace function public.dept_ok(d text) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce((select m='all' or m=d or exists(select 1 from depts x where x.code=d and x.parent=m) from (select my_dept() m) s),false) $$;

do $$ declare t text; begin
for t in select tablename from pg_tables where schemaname='public' and tablename not in
 ('profiles','notifications','push_subs','notif_prefs','seen_features','settings','chat_messages','chat_reads','my_notes','account_requests','audit','depts','app_secrets','ai_secrets','private_seed','app_files','backups','ai_log')
loop execute format('drop policy if exists dept_com_m on public.%I; create policy dept_com_m on public.%I as restrictive for all to authenticated using (public.dept_ok(''com_m'')) with check (public.dept_ok(''com_m''))', t, t); end loop; end $$;

create table if not exists public.dept_items(id uuid primary key default gen_random_uuid(), dept text not null references public.depts(code), kind text not null, title text not null, status text not null default 'جديد', data jsonb not null default '{}', created_by uuid default auth.uid(), created_at timestamptz default now(), updated_at timestamptz default now());
create index if not exists dept_items_dept on public.dept_items(dept, kind);
alter table public.dept_items enable row level security;
create policy di_sel on public.dept_items for select to authenticated using (my_role() is not null and dept_ok(dept));
create policy di_ins on public.dept_items for insert to authenticated with check (my_role() in ('admin','editor') and dept_ok(dept));
create policy di_upd on public.dept_items for update to authenticated using (my_role() in ('admin','editor') and dept_ok(dept)) with check (dept_ok(dept));
create policy di_del on public.dept_items for delete to authenticated using (my_role()='admin' and dept_ok(dept));

create table if not exists public.feature_requests(id bigserial primary key, dept text references public.depts(code), uid uuid not null default auth.uid(), title text not null, details text, status text not null default 'جديد', reply text, created_at timestamptz default now(), decided_at timestamptz);
alter table public.feature_requests enable row level security;
create policy fr_ins on public.feature_requests for insert to authenticated with check (uid=auth.uid() and my_role() is not null);
create policy fr_sel on public.feature_requests for select to authenticated using (uid=auth.uid() or is_owner() or (my_role()='admin' and dept_ok(dept)));
create policy fr_upd on public.feature_requests for update to authenticated using (is_owner());
create or replace function public.fr_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.notify(p.id,'feature','طلب إضافة جديد', new.title, '#freq') from profiles p where p.username='yousef' and p.active;
  return new;
end $$;
drop trigger if exists fr_notify on public.feature_requests;
create trigger fr_notify after insert on public.feature_requests for each row execute function public.fr_notify();

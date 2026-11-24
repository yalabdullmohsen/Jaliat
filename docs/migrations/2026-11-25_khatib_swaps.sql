-- JL-8 «خطب الجمعة» (طلب يوسف: «سهل عملية استبدال الخطيب بخطيب احتياط او بديل»).
-- khatib_swaps: استبدال خطيب مسجد في جمعة معيّنة (البديل وسببه)، ويبقى سجلًا للخطيب الأصلي بأن خطبته أُلغيت لهذا السبب.
--   لا يكتب في sermons (سجل الإلقاء والمكافآت)؛ يُسجَّل الإلقاء الفعلي بعد الجمعة كما هو الآن.
-- khatib_reserve: خطباء الاحتياط لكل جالية/لغة، يضيفهم الموظف ويحذفهم.
-- القراءة لكل موظف، والكتابة للمحرر والمشرف (كبقية جداول الخطباء)، وضمن قسم الجاليات (dept_ok كالجداول المشتركة).
-- التراجع: 2026-11-25_khatib_swaps.down.sql

begin;

create table if not exists public.khatib_swaps (
  id uuid primary key default gen_random_uuid(),
  fri date not null,
  kh_id text not null,
  orig_name text not null default '',
  sub_name text not null default '',
  sub_phone text not null default '',
  reason text not null check (reason in ('مرض','سفر','اعتذار','غيره')),
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (fri, kh_id)
);
create table if not exists public.khatib_reserve (
  id uuid primary key default gen_random_uuid(),
  comm text not null,
  name text not null check (length(name) between 2 and 80),
  phone text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (comm, name)
);
alter table public.khatib_swaps enable row level security;
alter table public.khatib_reserve enable row level security;
create policy "ks: staff read" on public.khatib_swaps for select to authenticated using ((select my_role()) is not null);
create policy "ks: editors write" on public.khatib_swaps for all to authenticated using ((select my_role()) in ('admin','editor')) with check ((select my_role()) in ('admin','editor'));
create policy "ks: dept" on public.khatib_swaps as restrictive for all to authenticated using (dept_ok('com_m')) with check (dept_ok('com_m'));
create policy "kr: staff read" on public.khatib_reserve for select to authenticated using ((select my_role()) is not null);
create policy "kr: editors write" on public.khatib_reserve for all to authenticated using ((select my_role()) in ('admin','editor')) with check ((select my_role()) in ('admin','editor'));
create policy "kr: dept" on public.khatib_reserve as restrictive for all to authenticated using (dept_ok('com_m')) with check (dept_ok('com_m'));
create index if not exists khatib_swaps_fri on public.khatib_swaps (fri);

commit;

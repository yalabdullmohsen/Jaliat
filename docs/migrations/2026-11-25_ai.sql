-- JL-AI: سجل استعمال المساعد الذكي بلا محتوى، وتخزين مؤقت للنتائج المحجوبة. تقرؤهما دالة ai بمفتاح الخدمة فقط.
-- التراجع: 2026-11-25_ai.down.sql
begin;
create table public.ai_usage (
  id bigint generated always as identity primary key,
  actor text not null,              -- معرّف الموظف أو p:<حساب البوابة>، بلا اسم ولا نص
  kind text not null,               -- home_brief | wq_draft | req_summary | conflict_fix | data_qa | translate
  ok boolean not null,
  cached boolean not null default false,
  model text,
  tokens int not null default 0,
  at timestamptz not null default now()
);
create index ai_usage_actor_at on public.ai_usage (actor, at desc);
alter table public.ai_usage enable row level security;
-- مالكا النظام يقرآن الأرقام (لا محتوى فيها)
create policy ai_usage_owner_read on public.ai_usage for select to authenticated using (public.is_owner());

create table public.ai_cache (
  k text primary key,               -- SHA-256 للمهمة والمدخل المحجوب
  kind text not null,
  out jsonb not null,               -- المخرج بالرموز المحجوبة (لا رقم مدني ولا هاتف ولا IBAN ولا بريد)
  at timestamptz not null default now()
);
alter table public.ai_cache enable row level security;   -- بلا سياسات: مفتاح الخدمة وحده

select cron.schedule('jaliyat-ai-retention', '45 0 * * *',
  $$delete from public.ai_cache where at < now() - interval '2 days'; delete from public.ai_usage where at < now() - interval '90 days'$$);
commit;

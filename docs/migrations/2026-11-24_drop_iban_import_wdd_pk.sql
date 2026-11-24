-- JL-4 بند 2: مفتاح أساسي لـwatheqa_docs_deleted فقط.
-- iban_import يبقى كما هو بقرار يوسف (2026-11-24): «لا لاتحذف ارقام الحسابات البنكية».
-- التحقق قبل الكتابة (2026-11-24): watheqa_docs_deleted فيه 227 صفًا، وid بلا تكرار وبلا NULL.
-- التراجع: 2026-11-24_drop_iban_import_wdd_pk.down.sql
begin;
alter table public.watheqa_docs_deleted alter column id set not null;
alter table public.watheqa_docs_deleted add constraint watheqa_docs_deleted_pkey primary key (id);
commit;

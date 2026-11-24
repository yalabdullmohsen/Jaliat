-- تراجع JL-4 بند 2: إزالة المفتاح الأساسي من watheqa_docs_deleted (iban_import لم يُمس).
begin;
alter table public.watheqa_docs_deleted drop constraint watheqa_docs_deleted_pkey;
alter table public.watheqa_docs_deleted alter column id drop not null;
commit;

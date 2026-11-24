-- JL-4 بند 2: حذف جدول الاستيراد المؤقت iban_import، ومفتاح أساسي لـwatheqa_docs_deleted.
-- التحقق قبل الكتابة (2026-11-24): الآيبانات الـ182 كلها موجودة في khatib_bank (0 مفقود)،
-- ولا قارئ للجدول في الكود ولا في الدوال ولا العروض ولا اعتماديات.
-- watheqa_docs_deleted: 227 صفًا، id بلا تكرار وبلا NULL.
-- التراجع: 2026-11-24_drop_iban_import_wdd_pk.down.sql
begin;
-- حارس: يُلغى الترحيل إن وُجد آيبان في الاستيراد غير منقول إلى khatib_bank
do $$ begin
  if exists (select 1 from public.iban_import i where not exists (
      select 1 from public.khatib_bank k
      where regexp_replace(coalesce(k.iban,''),'\s','','g') = regexp_replace(coalesce(i.iban,''),'\s','','g'))) then
    raise exception 'iban_import has rows not in khatib_bank';
  end if;
end $$;
drop table public.iban_import;

alter table public.watheqa_docs_deleted alter column id set not null;
alter table public.watheqa_docs_deleted add constraint watheqa_docs_deleted_pkey primary key (id);
commit;

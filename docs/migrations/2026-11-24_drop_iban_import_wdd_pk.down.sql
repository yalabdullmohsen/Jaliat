-- تراجع JL-4 بند 2: إعادة iban_import ببنيته وبياناته من khatib_bank (مصدرها بعد الاستيراد)، وإزالة المفتاح.
begin;
create table public.iban_import (cid text, iban text, name text);
alter table public.iban_import enable row level security;
insert into public.iban_import (cid, iban, name)
  select cid, iban, name from public.khatib_bank where coalesce(iban,'') <> '';

alter table public.watheqa_docs_deleted drop constraint watheqa_docs_deleted_pkey;
alter table public.watheqa_docs_deleted alter column id drop not null;
commit;

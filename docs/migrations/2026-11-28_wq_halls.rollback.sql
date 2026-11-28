-- تراجع JL-HALLS: يحذف ما أضافه الترحيل فقط (الحجوزات المولّدة من وثيقة، والمراجعة، والدوال والمحفّزات)، ويعيد ev_bookings كما كان.
-- الحجوزات اليدوية لا تُمسّ (data->>'src' <> 'watheqa'). النسخة قبل التعديل: ~/ssunnah-board/jl-halls-bookings-backup.json
begin;
drop trigger if exists watheqa_docs_halls_ins on public.watheqa_docs;
drop trigger if exists watheqa_docs_halls_upd on public.watheqa_docs;
delete from public.bookings where data->>'src' = 'watheqa';
drop function if exists public.wq_hall_sync_trg();
drop function if exists public.wq_hall_sync(text);
drop function if exists public.wq_hall_selftest();
drop function if exists public.wq_hall_parse(text, text, text);
drop function if exists public.wq_hall_times(text);
drop function if exists public.wq_hall_days(text, text);
drop function if exists public.wq_hall_ids(text);
drop function if exists public.wq_hall_norm(text);
drop table if exists public.watheqa_hall_review;
create or replace function public.ev_bookings() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare hn text;
begin
  hn := case new.hall when 'thunayan' then 'مسرح ثنيان الغانم' when 'gm-women' then 'مسرح النساء — المسجد الكبير' when 'gm-hall' then 'القاعة الكبرى — المسجد الكبير' when 'gm-admin' then 'مسرح الإدارة — المسجد الكبير' else new.hall end;
  if tg_op = 'INSERT' then
    perform notify_team('booking_new', 'حجز جديد: ' || hn, to_char(new.day, 'DD/MM/YYYY') || ' — ' || coalesce(nullif(new.data->>'title',''), new.data->>'comm', '') || ' — ' || coalesce(who(new.created_by),''), '#bk:' || new.id, new.created_by);
  elsif (new.status is distinct from old.status or new.day is distinct from old.day or new.t_from is distinct from old.t_from) and new.created_by is distinct from auth.uid() then
    perform notify(new.created_by, 'booking_changed', 'تعديل على حجزك: ' || hn, new.status || ' — ' || to_char(new.day, 'DD/MM/YYYY') || ' — بواسطة ' || coalesce(who(auth.uid()),''), '#bk:' || new.id);
  end if;
  return null;
end $function$;
commit;

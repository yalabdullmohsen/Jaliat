-- تراجع: حذف جدولي الاستبدال والاحتياط. تنبيه: يمحو سجل الاستبدالات وقائمة الاحتياط؛ سجل الخطب (sermons) لا يتأثر.
begin;
drop table if exists public.khatib_swaps;
drop table if exists public.khatib_reserve;
commit;

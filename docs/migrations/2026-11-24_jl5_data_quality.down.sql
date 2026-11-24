-- تراجع JL-5 بند 1: إعادة القيم من jl5_dq_backup ثم حذفه.
begin;
update public.refs r set data = b.before from public.jl5_dq_backup b where b.tbl = 'refs' and b.row_id = r.id;
update public.acts a set data = b.before from public.jl5_dq_backup b where b.tbl = 'acts' and b.row_id = a.id;
drop table public.jl5_dq_backup;
commit;

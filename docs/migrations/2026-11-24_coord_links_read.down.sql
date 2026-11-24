-- تراجع 2026-11-24_coord_links_read.sql: يعيد سياسة القراءة كما كانت حرفيًا.
begin;
drop policy if exists "editors read links" on public.coord_links;
create policy "members read links" on public.coord_links for select to public
  using ((select my_role()) is not null);
commit;

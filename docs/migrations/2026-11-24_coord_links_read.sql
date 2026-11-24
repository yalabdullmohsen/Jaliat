-- JL-3 بند 3 (يجب قبل الإطلاق): رموز روابط الجاليات (coord_links.token) يقرؤها المشرف والمحرر فقط.
-- قبله: سياسة «members read links» تعطي القراءة لكل من له دور (my_role() is not null).
-- بعده: القراءة لدوري admin وeditor فقط. سياسة «dept_com_m» المقيِّدة و«admins manage links» لا تتغيّران.
-- الأثر اليوم: الأدوار الموجودة كلها admin أو editor، فلا يتغيّر شيء لمستخدم حالي؛ يمنع أي دور جديد (مشاهد مثلًا).
-- التراجع: 2026-11-24_coord_links_read.down.sql
begin;
drop policy if exists "members read links" on public.coord_links;
create policy "editors read links" on public.coord_links for select to authenticated
  using ((select my_role()) in ('admin', 'editor'));
commit;

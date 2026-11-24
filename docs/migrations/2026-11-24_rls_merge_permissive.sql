-- JL-4 بند 1: دمج السياسات المتساهلة المكررة (تحذير المستشار multiple_permissive_policies، 28 حالة).
-- بلا تغيير سلوك: لكل جدول وأمر صار لكل دور سياسة متساهلة واحدة شرطها = OR للشروط السابقة.
-- السياسات المقيِّدة (dept_com_m وغيرها) لا تُمس.
-- ملاحظة: my_role() و auth.uid() تعيدان NULL للزائر anon، فالسياسات ذات الدور public المشروطة بهما لا تمنحه شيئًا؛
-- لذلك نقلها إلى authenticated لا يغيّر ما يراه anon.
-- التراجع: 2026-11-24_rls_merge_permissive.down.sql
begin;

-- acts DELETE: «admins delete» (admin) محتواة في «editors delete acts» (admin/editor)
drop policy "admins delete" on public.acts;

-- awards: ALL للكتابة + SELECT للقراءة ← كتابة مفصّلة بلا SELECT
drop policy "aw: staff write" on public.awards;
create policy "aw: staff insert" on public.awards for insert to authenticated
  with check ((select my_role()) = any (array['admin','editor']));
create policy "aw: staff update" on public.awards for update to authenticated
  using ((select my_role()) = any (array['admin','editor']))
  with check ((select my_role()) = any (array['admin','editor']));
create policy "aw: staff delete" on public.awards for delete to authenticated
  using ((select my_role()) = any (array['admin','editor']));

-- backups SELECT: admin ⊂ admin/editor
drop policy "admins read backups" on public.backups;

-- chat_reads: ALL (own) + SELECT (my chats) ← SELECT واحدة بـOR وكتابة مفصّلة
drop policy "reads own" on public.chat_reads;
drop policy "reads of my chats" on public.chat_reads;
create policy "reads select" on public.chat_reads for select to public
  using ((user_id = (select auth.uid()))
      or ((conv <> 'team') and (position(((select auth.uid()))::text in conv) > 0)));
create policy "reads own insert" on public.chat_reads for insert to public
  with check (user_id = (select auth.uid()));
create policy "reads own update" on public.chat_reads for update to public
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reads own delete" on public.chat_reads for delete to public
  using (user_id = (select auth.uid()));

-- coord_links: ALL (admin) + SELECT (أي موظف) ← SELECT كما هي وكتابة admin مفصّلة
drop policy "admins manage links" on public.coord_links;
create policy "admins insert links" on public.coord_links for insert to public
  with check ((select my_role()) = 'admin');
create policy "admins update links" on public.coord_links for update to public
  using ((select my_role()) = 'admin') with check ((select my_role()) = 'admin');
create policy "admins delete links" on public.coord_links for delete to public
  using ((select my_role()) = 'admin');

-- khatib_bank: «kb: admin» ALL ← الحذف فقط (القراءة والإضافة والتعديل يغطيها ما هو أوسع)
drop policy "kb: admin" on public.khatib_bank;
create policy "kb: admin delete" on public.khatib_bank for delete to authenticated
  using ((select my_role()) = 'admin');

-- rec_requests: مثل awards
drop policy "rr: staff write" on public.rec_requests;
create policy "rr: staff insert" on public.rec_requests for insert to authenticated
  with check ((select my_role()) = any (array['admin','editor']));
create policy "rr: staff update" on public.rec_requests for update to authenticated
  using ((select my_role()) = any (array['admin','editor']))
  with check ((select my_role()) = any (array['admin','editor']));
create policy "rr: staff delete" on public.rec_requests for delete to authenticated
  using ((select my_role()) = any (array['admin','editor']));

-- refs UPDATE: سياستان ← واحدة بـOR
drop policy "editors update open refs" on public.refs;
drop policy "granted update comms coords" on public.refs;
create policy "update refs" on public.refs for update to authenticated
  using (((id = any (array['mosques','docs'])) and ((select my_role()) = any (array['admin','editor'])))
      or ((select my_role()) = 'admin')
      or ((id = any (array['comms','coords'])) and has_perm('comms_coords')))
  with check (((id = any (array['mosques','docs'])) and ((select my_role()) = any (array['admin','editor'])))
      or ((select my_role()) = 'admin')
      or ((id = any (array['comms','coords'])) and has_perm('comms_coords')));

-- reward_history: مثل khatib_bank
drop policy "rh: admin" on public.reward_history;
create policy "rh: admin delete" on public.reward_history for delete to authenticated
  using ((select my_role()) = 'admin');

-- settings: مثل coord_links
drop policy "admins write settings" on public.settings;
create policy "admins insert settings" on public.settings for insert to public
  with check ((select my_role()) = 'admin');
create policy "admins update settings" on public.settings for update to public
  using ((select my_role()) = 'admin') with check ((select my_role()) = 'admin');
create policy "admins delete settings" on public.settings for delete to public
  using ((select my_role()) = 'admin');

-- task_replies SELECT: سياستان ← واحدة بـOR
drop policy "employees read team task replies" on public.task_replies;
drop policy "task parties read replies" on public.task_replies;
create policy "read task replies" on public.task_replies for select to authenticated
  using (((select my_role()) = any (array['admin','editor']))
      or exists (select 1 from tasks t where t.id = task_replies.task_id
                 and (t.assignee = (select auth.uid()) or (select my_role()) = 'admin')));

-- tasks SELECT: سياستان ← واحدة بـOR
drop policy "employees read team tasks" on public.tasks;
drop policy "tasks visible to assignee and admins" on public.tasks;
create policy "read tasks" on public.tasks for select to authenticated
  using (((select my_role()) = any (array['admin','editor']))
      or (assignee = (select auth.uid()))
      or ((select my_role()) = 'admin'));

commit;

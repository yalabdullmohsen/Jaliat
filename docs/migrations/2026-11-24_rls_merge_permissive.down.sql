-- تراجع JL-4 بند 1: إعادة السياسات كما كانت قبل الدمج حرفيًا.
begin;

create policy "admins delete" on public.acts for delete to authenticated
  using ((select my_role()) = 'admin');

drop policy "aw: staff insert" on public.awards;
drop policy "aw: staff update" on public.awards;
drop policy "aw: staff delete" on public.awards;
create policy "aw: staff write" on public.awards for all to authenticated
  using ((select my_role()) = any (array['admin','editor']))
  with check ((select my_role()) = any (array['admin','editor']));

create policy "admins read backups" on public.backups for select to public
  using ((select my_role()) = 'admin');

drop policy "reads select" on public.chat_reads;
drop policy "reads own insert" on public.chat_reads;
drop policy "reads own update" on public.chat_reads;
drop policy "reads own delete" on public.chat_reads;
create policy "reads own" on public.chat_reads for all to public
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reads of my chats" on public.chat_reads for select to public
  using ((conv <> 'team') and (position(((select auth.uid()))::text in conv) > 0));

drop policy "admins insert links" on public.coord_links;
drop policy "admins update links" on public.coord_links;
drop policy "admins delete links" on public.coord_links;
create policy "admins manage links" on public.coord_links for all to public
  using ((select my_role()) = 'admin') with check ((select my_role()) = 'admin');

drop policy "kb: admin delete" on public.khatib_bank;
create policy "kb: admin" on public.khatib_bank for all to authenticated
  using ((select my_role()) = 'admin') with check ((select my_role()) = 'admin');

drop policy "rr: staff insert" on public.rec_requests;
drop policy "rr: staff update" on public.rec_requests;
drop policy "rr: staff delete" on public.rec_requests;
create policy "rr: staff write" on public.rec_requests for all to authenticated
  using ((select my_role()) = any (array['admin','editor']))
  with check ((select my_role()) = any (array['admin','editor']));

drop policy "update refs" on public.refs;
create policy "editors update open refs" on public.refs for update to authenticated
  using (((id = any (array['mosques','docs'])) and ((select my_role()) = any (array['admin','editor']))) or ((select my_role()) = 'admin'))
  with check (((id = any (array['mosques','docs'])) and ((select my_role()) = any (array['admin','editor']))) or ((select my_role()) = 'admin'));
create policy "granted update comms coords" on public.refs for update to authenticated
  using ((id = any (array['comms','coords'])) and has_perm('comms_coords'))
  with check ((id = any (array['comms','coords'])) and has_perm('comms_coords'));

drop policy "rh: admin delete" on public.reward_history;
create policy "rh: admin" on public.reward_history for all to authenticated
  using ((select my_role()) = 'admin') with check ((select my_role()) = 'admin');

drop policy "admins insert settings" on public.settings;
drop policy "admins update settings" on public.settings;
drop policy "admins delete settings" on public.settings;
create policy "admins write settings" on public.settings for all to public
  using ((select my_role()) = 'admin') with check ((select my_role()) = 'admin');

drop policy "read task replies" on public.task_replies;
create policy "employees read team task replies" on public.task_replies for select to authenticated
  using ((select my_role()) = any (array['admin','editor']));
create policy "task parties read replies" on public.task_replies for select to authenticated
  using (exists (select 1 from tasks t where t.id = task_replies.task_id
                 and (t.assignee = (select auth.uid()) or (select my_role()) = 'admin')));

drop policy "read tasks" on public.tasks;
create policy "employees read team tasks" on public.tasks for select to authenticated
  using ((select my_role()) = any (array['admin','editor']));
create policy "tasks visible to assignee and admins" on public.tasks for select to public
  using ((assignee = (select auth.uid())) or ((select my_role()) = 'admin'));

commit;

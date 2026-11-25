-- JL-10 (الخادم): تذكير المهمة بلا عدد أيام ثابت، وصف واحد لكل مهمة يُحدَّث بدل تكرار صف جديد كل يوم.
-- السبب الجذري: tasks_daily تكتب «مهمة متأخرة N يوم» في العنوان و«— متأخرة N يوم» في النص لحظة الإنشاء فيبقى قديمًا،
-- وnotify() لا تعيد استخدام الصف إلا إن كان غير مقروء، فبعد قراءته يُنشأ صف جديد (وإشعار فوري) كل يوم للمهمة نفسها.
-- الواجهة (add150) تحسب التأخير من موعد المهمة. إضافي، والتراجع: 2026-11-25_task_due_live.down.sql
begin;

-- 1) تذكير المهمة: صف واحد حيّ لكل (مستخدم، مهمة).
--    نفس المرحلة (غدًا / اليوم / متأخرة / متأخرة عند فلان): يُحدَّث الصف ويعود غير مقروء ويصعد لأعلى القائمة، بلا إشعار فوري جديد.
--    تغيّرت المرحلة: يُؤرشف القديم ويُنشأ صف جديد عبر notify() فيصل إشعار فوري واحد لكل مرحلة.
create or replace function public.notify_task_due(uid uuid, title text, body text, link text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare nid bigint; ntitle text;
begin
  if uid is null or coalesce(link, '') = '' then return; end if;
  if not exists (select 1 from profiles where id = uid and active) then return; end if;
  if exists (select 1 from notif_prefs where user_id = uid and 'task_due' = any(off)) then return; end if;
  select n.id, n.title into nid, ntitle from notifications n
   where n.user_id = uid and n.kind = 'task_due' and n.link = notify_task_due.link and n.archived_at is null
   order by n.created_at desc, n.id desc limit 1;
  if nid is not null and ntitle = coalesce(notif_clean(notify_task_due.title), 'إنجاز') then
    update notifications set body = coalesce(notif_clean(notify_task_due.body), ''), created_at = now(), read_at = null where id = nid;
    return;
  end if;
  update notifications set archived_at = now()
   where user_id = uid and kind = 'task_due' and notifications.link = notify_task_due.link and archived_at is null;
  perform notify(uid, 'task_due', notify_task_due.title, notify_task_due.body, notify_task_due.link);
end $function$;
revoke all on function public.notify_task_due(uuid, text, text, text) from public, anon, authenticated;

-- 2) المهمة اليومية: نصوص بلا عدد أيام، وتمر عبر notify_task_due. تذكير المُسنِد يبقى في الأيام 1 و3 و7 كما كان.
create or replace function public.tasks_daily()
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare td date := (now() at time zone 'Asia/Kuwait')::date; t record;
begin
  for t in select * from tasks where status in ('جديدة','تم الاستلام','قيد التنفيذ') and due is not null and due <= td + 1 loop
    if t.due = td + 1 then perform notify_task_due(t.assignee, 'تذكير: موعد المهمة غداً', t.title, '#task:' || t.id);
    elsif t.due = td then perform notify_task_due(t.assignee, 'موعد المهمة اليوم', t.title, '#task:' || t.id);
    else perform notify_task_due(t.assignee, 'مهمة متأخرة', t.title, '#task:' || t.id);
      if (td - t.due) in (1, 3, 7) then perform notify_task_due(t.assigner, 'مهمة متأخرة عند ' || who(t.assignee), t.title, '#task:' || t.id); end if;
    end if;
  end loop;
  for t in select * from tasks where status = 'جديدة' and seen_at is null and created_at < now() - interval '1 day' loop
    perform notify(t.assignee, 'task_new', 'لديك مهمة لم تطّلع عليها', t.title, '#task:' || t.id);
  end loop;
end $function$;

-- 3) تنظيف لمرة واحدة: يبقى أحدث صف task_due لكل (مستخدم، مهمة)، والباقي يُؤرشف (لا يُحذف).
--    تُحفظ معرّفات ما أُرشف ليعيدها التراجع.
create table if not exists public.jl10_task_due_archived (id bigint primary key);
alter table public.jl10_task_due_archived enable row level security;
with x as (
  update notifications n set archived_at = now()
   where n.kind = 'task_due' and n.archived_at is null and n.link <> ''
     and exists (select 1 from notifications y where y.user_id = n.user_id and y.kind = 'task_due' and y.link = n.link
                 and y.archived_at is null and (y.created_at, y.id) > (n.created_at, n.id))
  returning n.id)
insert into public.jl10_task_due_archived select id from x on conflict do nothing;

commit;

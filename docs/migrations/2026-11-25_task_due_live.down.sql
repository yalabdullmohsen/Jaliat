-- تراجع JL-10 (الخادم): إعادة tasks_daily كما كانت، وإعادة صفوف task_due التي أرشفها التنظيف، وحذف الدالة والجدول المؤقت.
-- تنبيه: نصوص الصفوف التي حدّثتها notify_task_due بعد التطبيق تبقى بصيغتها الجديدة (بلا عدد أيام).
begin;

create or replace function public.tasks_daily()
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare td date := (now() at time zone 'Asia/Kuwait')::date; t record;
begin
  for t in select * from tasks where status in ('جديدة','تم الاستلام','قيد التنفيذ') and due is not null and due <= td + 1 loop
    if t.due = td + 1 then perform notify(t.assignee, 'task_due', 'تذكير: موعد المهمة غداً', t.title, '#task:' || t.id);
    elsif t.due = td then perform notify(t.assignee, 'task_due', 'موعد المهمة اليوم', t.title, '#task:' || t.id);
    else perform notify(t.assignee, 'task_due', 'مهمة متأخرة ' || (td - t.due) || ' يوم', t.title, '#task:' || t.id);
      if (td - t.due) in (1, 3, 7) then perform notify(t.assigner, 'task_due', 'مهمة متأخرة عند ' || who(t.assignee), t.title || ' — متأخرة ' || (td - t.due) || ' يوم', '#task:' || t.id); end if;
    end if;
  end loop;
  for t in select * from tasks where status = 'جديدة' and seen_at is null and created_at < now() - interval '1 day' loop
    perform notify(t.assignee, 'task_new', 'لديك مهمة لم تطّلع عليها', t.title, '#task:' || t.id);
  end loop;
end $function$;

update public.notifications n set archived_at = null from public.jl10_task_due_archived a where a.id = n.id;
drop table if exists public.jl10_task_due_archived;
drop function if exists public.notify_task_due(uuid, text, text, text);

commit;

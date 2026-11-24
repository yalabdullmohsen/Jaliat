-- البوابة: نوع طلب «نشاط غير مسجل» (نشاط قائم في المسجد غير مسجل في النظام).
-- التغيير الوحيد: إضافة النوع إلى القائمة المسموحة وإلى شرط «نشاط واحد على الأقل». لا جداول ولا أعمدة جديدة.
-- التراجع: docs/migrations/2026-11-24_portal_unregistered_act.down.sql (التعريف السابق حرفيًا).
CREATE OR REPLACE FUNCTION public.portal_submit(p_token text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare l coord_links; rid uuid; rno bigint; k text := left(coalesce(p->>'kind','جديد'), 20);
begin
  select * into l from coord_links where token = p_token and active; if not found then raise exception 'الرابط غير صالح'; end if;
  if coalesce(trim(p->>'coord'),'') = '' or coalesce(trim(p->>'phone'),'') = '' then raise exception 'اكتب الاسم ورقم الهاتف'; end if;
  if k not in ('جديد','تجديد','تعديل','إيقاف','تحديث بيانات','استفسار','استبدال خطيب','نشاط غير مسجل') then raise exception 'نوع الطلب غير معروف'; end if;
  if k in ('جديد','تجديد','نشاط غير مسجل') and (jsonb_array_length(coalesce(p->'acts','[]')) = 0 or jsonb_array_length(p->'acts') > 30) then raise exception 'أضف نشاطاً واحداً على الأقل'; end if;
  if k = 'استبدال خطيب' and (jsonb_array_length(coalesce(p->'acts','[]')) <> 1 or jsonb_array_length(coalesce(p->'acts'->0->'fridays','[]')) not between 1 and 30) then raise exception 'اختر جمعة واحدة على الأقل (حتى 30 جمعة)'; end if;
  if k in ('تعديل','إيقاف','تحديث بيانات','استفسار') and coalesce(trim(p->>'notes'),'') = '' and jsonb_array_length(coalesce(p->'team','[]')) = 0 then raise exception 'اكتب التفاصيل'; end if;
  if (select count(*) from requests where data->>'src' = 'portal' and data->>'comm' = l.comm and created_at > now() - interval '1 hour') >= 8 then raise exception 'طلبات كثيرة، حاول بعد قليل'; end if;
  insert into requests(status, files, data) values ('جديد', '[]', jsonb_build_object('src', 'portal', 'kind', k, 'comm', l.comm,
      'coord', left(trim(p->>'coord'), 80), 'phone', left(trim(p->>'phone'), 20), 'org', left(coalesce(p->>'org',''), 120), 'subj', left(coalesce(p->>'subj', 'طلب عبر بوابة إنجاز'), 200),
      'renew_of', left(coalesce(p->>'renew_of',''), 20), 'act_ref', left(coalesce(p->>'act_ref',''), 40), 'team', coalesce(p->'team','[]'), 'notes', left(coalesce(p->>'notes',''), 3000),
      'date', to_char(now() at time zone 'Asia/Kuwait', 'YYYY-MM-DD'), 'acts', coalesce(p->'acts','[]')))
    returning id, no into rid, rno;
  return jsonb_build_object('ok', true, 'no', rno);
end $function$
;

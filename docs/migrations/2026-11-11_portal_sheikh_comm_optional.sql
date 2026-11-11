-- 2026-11-11: الجالية اختيارية عند تسجيل الشيخ؛ يحدّدها القسم عند الموافقة (staff_portal_decide يطلب اختيارها).
do $$ declare d text; begin
  d := pg_get_functiondef('portal_self_signup(jsonb)'::regprocedure);
  if position($q$if cm = '' or not exists (select 1 from coord_links where comm = cm and active) then return jsonb_build_object('ok',false,'msg','اختاروا الجالية'); end if;$q$ in d) = 0 then raise exception 'النص المتوقع غير موجود'; end if;
  d := replace(d, $q$if cm = '' or not exists (select 1 from coord_links where comm = cm and active) then return jsonb_build_object('ok',false,'msg','اختاروا الجالية'); end if;$q$, $q$if cm <> '' and not exists (select 1 from coord_links where comm = cm and active) then cm := ''; end if;$q$);
  d := replace(d, $q$nm || ' · ' || cm, '#portal'$q$, $q$nm || ' · ' || coalesce(nullif(cm,''),'بلا جالية'), '#portal'$q$);
  d := replace(d, $q$values ('sheikh', cm,$q$, $q$values ('sheikh', nullif(cm,''),$q$);
  execute d;
end $$;

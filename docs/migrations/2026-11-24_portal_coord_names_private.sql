-- JL-3 بند 4 بقرار يوسف («لا الزوار لا تكشف لهم»): الزائر لا يرى أسماء المنسقين ولا جالياتهم.
-- قبله: portal_coord_names() يستدعيها anon وتعيد كل الأسماء والجاليات لقائمة «اختر اسمك» في «إنشاء حساب».
-- بعده: تُسحب EXECUTE من anon، و«إنشاء حساب» يكتب فيه المنسق رقمه المدني وهاتفه فقط، فيطابقه الخادم
--        بالمسجّل لدى القسم (refs.coords) ويفتح حسابه لكل جالية مسجّل فيها بهذا الهاتف، عبر portal_self_signup نفسها.
-- التراجع: 2026-11-24_portal_coord_names_private.down.sql
-- الترتيب: طبّقه ثم ادمج Jaliat#5 (البوابة تستدعي portal_coord_signup بدل القائمة).
begin;

create or replace function public.portal_coord_signup(p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare ph text := right(pa_digits(p->>'phone'), 8); x jsonb; r jsonb; n int := 0; last jsonb;
begin
  if length(ph) < 8 then return jsonb_build_object('ok', false, 'msg', 'اكتبوا رقم الهاتف كاملاً'); end if;
  for x in select c from refs rf, jsonb_array_elements(rf.data->'list') c
            where rf.id = 'coords' and coalesce(c->>'status', '') <> 'سابق' and coalesce(c->>'name', '') <> '' and coalesce(c->>'comm', '') <> ''
              and right(pa_digits(c->>'phone'), 8) = ph and exists (select 1 from coord_links l where l.comm = c->>'comm' and l.active) loop
    r := portal_self_signup((p - 'kind') || jsonb_build_object('name', x->>'name', 'comm', x->>'comm'));
    if coalesce((r->>'ok')::boolean, false) then n := n + 1; else last := r; end if;
  end loop;
  if n > 0 then return jsonb_build_object('ok', true, 'count', n); end if;
  if last is not null then return last; end if;
  insert into portal_login_log(ok) values (false);
  return jsonb_build_object('ok', false, 'msg', 'رقم الهاتف غير مسجّل لدى القسم لأي منسق، تواصلوا مع قسم الجاليات');
end $function$;
revoke all on function public.portal_coord_signup(jsonb) from public;
grant execute on function public.portal_coord_signup(jsonb) to anon, authenticated;

revoke execute on function public.portal_coord_names() from anon, public;

commit;

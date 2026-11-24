-- تراجع 2026-11-24_portal_coord_names_private.sql: تعود قائمة الأسماء للزائر، وتُحذف portal_coord_signup.
begin;
grant execute on function public.portal_coord_names() to anon;
drop function if exists public.portal_coord_signup(jsonb);
commit;

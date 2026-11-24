-- تراجع 2026-11-24_portal_activation_code.sql: يعيد portal_activate كما كانت حرفيًا (3 وسائط، حد عام فقط).
begin;
drop function if exists public.portal_activate(text, text, text, text);
create function public.portal_activate(p_civil text, p_phone text, p_pin text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c text := pa_digits(p_civil); ph text := right(pa_digits(p_phone),8); pin text := pa_digits(p_pin); n int := 0;
begin
  if (select count(*) from portal_login_log where not ok and at > now() - interval '10 minutes') > 40 then return jsonb_build_object('ok',false,'msg','محاولات كثيرة، حاولوا بعد قليل'); end if;
  if length(c) <> 12 then return jsonb_build_object('ok',false,'msg','الرقم المدني 12 رقماً'); end if;
  if length(pin) < 4 or length(pin) > 8 then return jsonb_build_object('ok',false,'msg','الرمز من 4 إلى 8 أرقام'); end if;
  update portal_accounts set pin_hash = crypt(pin, gen_salt('bf')), fails = 0 where civil = c and active and pin_hash is null and right(pa_digits(phone),8) = ph;
  get diagnostics n = row_count;
  insert into portal_login_log(ok) values (n > 0);
  if n = 0 then return jsonb_build_object('ok',false,'msg','لا يوجد حساب بانتظار التفعيل بهذه البيانات. إن كنتم منسقاً جديداً فاختاروا «طلب حساب جديد»'); end if;
  return portal_signin(c, pin);
end $function$;
grant execute on function public.portal_activate(text, text, text) to anon, authenticated;
drop function if exists public.staff_portal_activation_code(uuid);
drop index if exists public.portal_login_log_civil_at;
alter table public.portal_login_log drop column if exists civil;
alter table public.portal_accounts drop column if exists act_code_hash, drop column if exists act_code_expires;
commit;

-- JL-3 بند 1 (يجب قبل الإطلاق) وبند «نضيف» 2: تفعيل حساب المنسق لا يكفيه الرقم المدني والهاتف.
-- قبله: portal_activate يضع الرمز السري لأي حساب لم يُفعَّل لمن يعرف الرقم المدني وآخر 8 أرقام من الهاتف، وعليه حد عام فقط.
-- بعده: يلزم أيضًا رمز تفعيل لمرة واحدة يصدره القسم (صالح 72 ساعة) أو رمز رابط الجالية coord_links.token،
--        وحد لكل رقم مدني: 5 محاولات فاشلة كل 15 دقيقة (كالموجود في portal_signin)، ويبقى الحد العام.
-- التراجع: 2026-11-24_portal_activation_code.down.sql
-- الترتيب: طبّق هذا الملف أولًا، ثم ادمج PR واجهة رمز التفعيل (البوابة + زر «رمز تفعيل» للموظفين).

begin;

alter table public.portal_accounts add column if not exists act_code_hash text, add column if not exists act_code_expires timestamptz;
alter table public.portal_login_log add column if not exists civil text;
create index if not exists portal_login_log_civil_at on public.portal_login_log (civil, at) where civil is not null;

-- الموظف (مشرف أو محرر) يصدر رمز تفعيل لحساب، ويرسله لصاحبه بواتساب القسم.
create or replace function public.staff_portal_activation_code(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare code text := lpad((floor(random() * 1000000))::int::text, 6, '0');
begin
  if coalesce(my_role(), '') not in ('admin', 'editor') then raise exception 'غير مصرح'; end if;
  update portal_accounts set act_code_hash = crypt(code, gen_salt('bf')), act_code_expires = now() + interval '72 hours'
   where id = p_id and active and pin_hash is null;
  if not found then return jsonb_build_object('ok', false, 'msg', 'الحساب مفعّل أو موقوف؛ أعد تعيين الرمز أولًا'); end if;
  return jsonb_build_object('ok', true, 'code', code, 'expires', now() + interval '72 hours');
end $function$;
revoke all on function public.staff_portal_activation_code(uuid) from public, anon;
grant execute on function public.staff_portal_activation_code(uuid) to authenticated;

drop function if exists public.portal_activate(text, text, text);
create function public.portal_activate(p_civil text, p_phone text, p_pin text, p_code text default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c text := pa_digits(p_civil); ph text := right(pa_digits(p_phone), 8); pin text := pa_digits(p_pin);
        code text := trim(coalesce(p_code, '')); a portal_accounts; ok boolean := false;
begin
  if (select count(*) from portal_login_log where not ok and at > now() - interval '10 minutes') > 40 then
    return jsonb_build_object('ok', false, 'msg', 'محاولات كثيرة، حاولوا بعد قليل'); end if;
  if length(c) <> 12 then return jsonb_build_object('ok', false, 'msg', 'الرقم المدني 12 رقماً'); end if;
  if (select count(*) from portal_login_log where civil = c and not ok and at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'msg', 'أُوقف التفعيل 15 دقيقة بسبب محاولات خاطئة'); end if;
  if length(pin) < 4 or length(pin) > 8 then return jsonb_build_object('ok', false, 'msg', 'الرمز من 4 إلى 8 أرقام'); end if;
  if code = '' then return jsonb_build_object('ok', false, 'msg', 'اكتبوا رمز التفعيل الذي أرسله لكم القسم'); end if;
  for a in select * from portal_accounts where civil = c and active and pin_hash is null and right(pa_digits(phone), 8) = ph loop
    if (a.act_code_hash is not null and a.act_code_expires > now() and a.act_code_hash = crypt(pa_digits(code), a.act_code_hash))
       or exists (select 1 from coord_links l where l.comm = a.comm and l.active and l.token = code) then
      update portal_accounts set pin_hash = crypt(pin, gen_salt('bf')), fails = 0, act_code_hash = null, act_code_expires = null where id = a.id;
      ok := true;
    end if;
  end loop;
  insert into portal_login_log(ok, civil) values (ok, c);
  if not ok then return jsonb_build_object('ok', false, 'msg', 'بيانات التفعيل أو رمز التفعيل غير صحيح. إن كنتم منسقاً جديداً فاختاروا «إنشاء حساب»'); end if;
  return portal_signin(c, pin);
end $function$;
revoke all on function public.portal_activate(text, text, text, text) from public;
grant execute on function public.portal_activate(text, text, text, text) to anon, authenticated;

commit;

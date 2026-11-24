-- تراجع JL-8 «نضيف»: يحذف سجل الصفحات ومحفّز إشعار التصريح، ويعيد portal_expiry_push كما كانت (14 و3 أيام فقط).
-- تنبيه: حذف page_views يمحو سجل فتح الصفحات المجمّع؛ لا بيانات أخرى تتأثر.
begin;
drop trigger if exists permits_portal_push on public.permits;
drop function if exists public.permits_portal_push_trg();
drop table if exists public.page_views;
CREATE OR REPLACE FUNCTION public.portal_expiry_push()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d record;
begin for d in select x->>'comm' comm, x->>'no' no, (x->>'end')::date e from refs r, jsonb_array_elements(r.data->'list') x
  where r.id = 'docs' and x->>'end' ~ '^\d{4}-\d{2}-\d{2}$' and (x->>'end')::date - (now() at time zone 'Asia/Kuwait')::date in (14, 3) loop
    perform portal_notify(d.comm, 'موافقة تقترب من نهايتها', 'الموافقة ' || d.no || ' تنتهي ' || to_char(d.e,'DD/MM/YYYY') || '. اختاروا «تجديد» من البوابة');
  end loop; end $function$;
commit;

-- استيراد تقارير خطب أكتوبر 2026: طبقة مراجعة مستقلة، لا تلمس sermons ولا reward_history ولا تحذف شيئاً.
create table if not exists public.sermon_import (
  id bigserial primary key,
  record_hash text not null unique,
  sermon_date date not null check (sermon_date between date '2026-10-01' and date '2026-10-31'),
  preacher_name text not null default '',
  civil_id text not null default '',
  preacher_status text not null default 'UNVERIFIED' check (preacher_status in ('BASIC','RESERVE','UNVERIFIED')),
  mosque text not null default '', area text not null default '', governorate text not null default '',
  community text not null default '', language text not null default '', coordinator text not null default '', sermon_title text not null default '',
  source_file text not null check (source_file <> ''), source_page int not null check (source_page > 0),
  ocr_confidence numeric not null default 0,
  review_status text not null default 'REVIEW' check (review_status in ('APPROVED','REVIEW')),
  review_notes text not null default '',
  created_at timestamptz not null default now(), created_by uuid default auth.uid()
);
alter table public.sermon_import enable row level security;
drop policy if exists si_read on public.sermon_import;
create policy si_read on public.sermon_import for select using ((select my_role()) is not null);
-- لا سياسة كتابة: الكتابة عبر الدالة فقط.

create or replace function public.sermon_import_commit(p_rows jsonb, p_dry boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public' as $f$
declare r jsonb; d date; cid text; nm text; st text; notes text[]; rs text; h text; ocr numeric; pg int; sf text;
  nb int; nr int; ins int := 0; dup int := 0; rej jsonb := '[]'; rev int := 0; seen text[] := '{}'; mosq text; cnt_new int;
begin
  if not (session_user in ('postgres','supabase_admin') or (select my_role()) in ('admin','editor')) then raise exception 'غير مصرّح'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'الصيغة غير صحيحة'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    sf := btrim(coalesce(r->>'source_file','')); pg := nullif(r->>'source_page','')::int; h := btrim(coalesce(r->>'record_hash',''));
    begin d := nullif(r->>'sermon_date','')::date; exception when others then d := null; end;
    if sf = '' or pg is null or pg < 1 then rej := rej || jsonb_build_object('hash',h,'why','بلا ملف/صفحة مصدر'); continue; end if;
    if d is null or d not between date '2026-10-01' and date '2026-10-31' then rej := rej || jsonb_build_object('hash',h,'file',sf,'page',pg,'why','تاريخ خارج أكتوبر 2026 أو غير صالح'); continue; end if;
    if h = '' then rej := rej || jsonb_build_object('file',sf,'page',pg,'why','بلا record_hash'); continue; end if;
    if h = any(seen) then dup := dup + 1; continue; end if; seen := seen || h;
    nm := btrim(regexp_replace(coalesce(r->>'preacher_name',''), '\s+', ' ', 'g')); cid := regexp_replace(translate(coalesce(r->>'civil_id',''), '٠١٢٣٤٥٦٧٨٩', '0123456789'), '\D', '', 'g'); mosq := btrim(coalesce(r->>'mosque',''));
    ocr := coalesce(nullif(r->>'ocr_confidence','')::numeric, 0);
    -- أساسي/احتياط من الرقم المدني فقط مقابل جدول الخطباء (pid=الأساسي، bid=الاحتياط)، وأي لبس = UNVERIFIED
    st := 'UNVERIFIED';
    if length(cid) = 12 then
      select count(*) filter (where k.data->>'pid' = cid), count(*) filter (where k.data->>'bid' = cid) into nb, nr from khatibs k;
      if nb > 0 and nr = 0 then st := 'BASIC'; elsif nr > 0 and nb = 0 then st := 'RESERVE'; end if;
    end if;
    notes := '{}';
    if nm = '' or array_length(string_to_array(nm,' '),1) < 2 then notes := array_append(notes, 'اسم ناقص'); end if;
    if length(cid) <> 12 then notes := array_append(notes, 'رقم مدني غير صالح'); end if;
    if mosq = '' then notes := array_append(notes, 'مسجد ناقص'); end if;
    if coalesce(r->>'area','') = '' then notes := array_append(notes, 'منطقة ناقصة'); end if;
    if coalesce(r->>'governorate','') = '' then notes := array_append(notes, 'محافظة ناقصة'); end if;
    if coalesce(r->>'community','') = '' then notes := array_append(notes, 'جالية ناقصة'); end if;
    if coalesce(r->>'language','') = '' then notes := array_append(notes, 'لغة ناقصة'); end if;
    if coalesce(r->>'sermon_title','') = '' then notes := array_append(notes, 'عنوان ناقص'); end if;
    if ocr < 75 then notes := array_append(notes, 'ثقة OCR منخفضة'); end if;
    if st = 'UNVERIFIED' then notes := array_append(notes, 'الحالة غير مثبتة بالرقم المدني'); end if;
    rs := case when array_length(notes,1) is null then 'APPROVED' else 'REVIEW' end;
    if p_dry then
      if exists (select 1 from sermon_import where record_hash = h) then dup := dup + 1; else ins := ins + 1; if rs = 'REVIEW' then rev := rev + 1; end if; end if;
      continue;
    end if;
    insert into sermon_import(record_hash, sermon_date, preacher_name, civil_id, preacher_status, mosque, area, governorate, community, language, coordinator, sermon_title, source_file, source_page, ocr_confidence, review_status, review_notes)
    values (h, d, nm, cid, st, mosq, btrim(coalesce(r->>'area','')), btrim(coalesce(r->>'governorate','')), btrim(coalesce(r->>'community','')), btrim(coalesce(r->>'language','')), btrim(coalesce(r->>'coordinator','')), btrim(coalesce(r->>'sermon_title','')), sf, pg, ocr, rs, array_to_string(notes,'؛'))
    on conflict (record_hash) do nothing;
    get diagnostics cnt_new = row_count;
    if cnt_new = 1 then ins := ins + 1; if rs = 'REVIEW' then rev := rev + 1; end if; else dup := dup + 1; end if;
  end loop;
  return jsonb_build_object('dry', p_dry, 'inserted', ins, 'duplicates', dup, 'rejected', jsonb_array_length(rej), 'rejected_rows', rej, 'inserted_review', rev);
end $f$;
revoke all on function public.sermon_import_commit(jsonb, boolean) from public, anon;
grant execute on function public.sermon_import_commit(jsonb, boolean) to authenticated;

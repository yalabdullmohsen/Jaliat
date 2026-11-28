-- JL-HALLS (طلب يوسف 2026-11-28): كتب وثيقة عن حجز القاعات تُسجَّل تلقائيًا في «حجز القاعات».
-- السبب: watheqa-ingest يخزّن الكتب في watheqa_docs فقط، ولا شيء يحوّلها إلى bookings (الحجز كان يدويًا من الواجهة).
-- الحل: محلّل محافظ (wq_hall_parse) ومحفّز على watheqa_docs (wq_hall_sync) لكل كتاب جديد أو محدَّث:
--   قاعة واحدة من قائمة إنجاز + تاريخ (لا يسبق تاريخ الكتاب) + وقت بصيغة صريحة (ص/م) ⇒ حجز مرتبط data.watheqa_no (رقم الكتاب الأصلي)،
--   وإلا ⇒ «يحتاج مراجعة» (watheqa_hall_review) بلا حجز. الطلب الصادر = مبدئي، الموافقة = مؤكد، الرفض يلغي حجوزات الكتاب نفسه فقط.
--   التعارض مع حجز قائم لا يُكتب فوقه: يُسجَّل مراجعةً بسبب «تعارض».
-- إضافة فقط؛ التراجع: docs/migrations/2026-11-28_wq_halls.rollback.sql
begin;

create table if not exists public.watheqa_hall_review (
  doc_id text primary key references public.watheqa_docs(id) on delete cascade,
  no text, subj text, reason text not null, parsed jsonb not null default '{}'::jsonb,
  conflict_ids uuid[] not null default '{}', dismissed boolean not null default false,
  updated_at timestamptz not null default now());
alter table public.watheqa_hall_review enable row level security;
drop policy if exists hall_review_read on public.watheqa_hall_review;
create policy hall_review_read on public.watheqa_hall_review for select to authenticated using (coalesce(my_role(), 'viewer') <> 'viewer');
drop policy if exists hall_review_dismiss on public.watheqa_hall_review;
create policy hall_review_dismiss on public.watheqa_hall_review for update to authenticated
  using (coalesce(my_role(), 'viewer') <> 'viewer') with check (coalesce(my_role(), 'viewer') <> 'viewer');

-- تطبيع للمطابقة: بلا تشكيل ولا تطويل، والهمزات ألفًا، والأرقام الهندية لاتينية
create or replace function public.wq_hall_norm(t text) returns text language sql immutable as $$
  select regexp_replace(translate(coalesce(t, ''), 'أإآٱ٠١٢٣٤٥٦٧٨٩ـًٌٍَُِّْ', 'اااا0123456789'), '\s+', ' ', 'g')
$$;

-- القاعات المذكورة (معرّفات قائمة إنجاز HALLS في src/modules/add12.js، أو «?اسم» لقاعة ليست فيها)
create or replace function public.wq_hall_ids(t text) returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct h order by h), '{}') from (
    select case
      when m ~ 'ثنيان الغانم|مسرح الوزاره|مسرح الوزارة' then 'thunayan'
      when m ~ 'مسرح النساء|قاعه الجاليات \(النساء\)|قاعة الجاليات \(النساء\)' then 'gm-women'
      when m ~ 'القاعه الكبرى|القاعة الكبرى' then 'gm-hall'
      when m ~ 'مسرح الاداره|مسرح الادارة' then 'gm-admin'
      else '?' || m end h
    from regexp_matches(wq_hall_norm(t),
      '(ثنيان الغانم|مسرح الوزار[ةه]|مسرح النساء|قاع[ةه] الجاليات \(النساء\)|القاع[ةه] الكبرى|مسرح الادار[ةه]|مسرح الجاليات|صال[ةه] المحاضرات|قاع[ةه] الجاليات|الخيم[ةه] الكبرى|قاع[ةه] عمر بن الخطاب|قاع[ةه] عثمان بن عفان)', 'g') r(a), lateral (select a[1] m) x
  ) s
$$;

-- التواريخ (يوم/شهر/سنة أو سنة/شهر/يوم) من تاريخ الكتاب فصاعدًا خلال سنة: ما قبله مرجع لكتاب سابق لا موعد
create or replace function public.wq_hall_days(t text, doc_date text) returns date[] language plpgsql immutable as $$
declare base date; m text[]; d date; out date[] := '{}';
begin
  begin base := to_date(doc_date, 'DD/MM/YYYY'); exception when others then base := null; end;
  for m in select regexp_matches(wq_hall_norm(t), '(\d{1,4})\s*/\s*(\d{1,2})\s*/\s*(\d{2,4})', 'g') loop
    begin
      d := case when length(m[1]) = 4 then make_date(m[1]::int, m[2]::int, m[3]::int)
                when length(m[3]) = 4 then make_date(m[3]::int, m[2]::int, m[1]::int) end;
    exception when others then d := null; end;
    if d is not null and (base is null or (d >= base - 1 and d <= base + 365)) and not d = any(out) then out := out || d; end if;
  end loop;
  return (select coalesce(array_agg(x order by x), '{}') from unnest(out) x);
end $$;

-- الأوقات بصيغة صريحة فقط: «من [الساعة] 4:00 [م] إلى/حتى [الساعة] 9:30 م» وعلامة ص/م على النهاية على الأقل
create or replace function public.wq_hall_times(t text) returns jsonb language plpgsql immutable as $$
declare m text[]; h1 int; m1 int; h2 int; m2 int; p1 text; p2 text; out jsonb := '[]'; one jsonb;
begin
  for m in select regexp_matches(wq_hall_norm(t),
      'من\s*(?:الساع[ةه]\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(صباح\S*|مساء\S*|ظهر\S*|ص(?![ء-ي])|م(?![ء-ي]))?\s*(?:الى|إلى|حتى|-)\s*(?:الساع[ةه]\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(صباح\S*|مساء\S*|ظهر\S*|ص(?![ء-ي])|م(?![ء-ي]))?', 'g') loop
    p2 := m[6]; if p2 is null then continue; end if;
    p1 := coalesce(m[3], p2);
    h1 := m[1]::int; m1 := coalesce(m[2], '0')::int; h2 := m[4]::int; m2 := coalesce(m[5], '0')::int;
    if h1 > 12 or h2 > 12 or m1 > 59 or m2 > 59 then continue; end if;
    if p1 ~ '^(م|مساء|ظهر)' and h1 < 12 then h1 := h1 + 12; end if;
    if p2 ~ '^(م|مساء|ظهر)' and h2 < 12 then h2 := h2 + 12; end if;
    if p1 ~ '^(ص|صباح)' and h1 = 12 then h1 := 0; end if;
    if h2 * 60 + m2 <= h1 * 60 + m1 then continue; end if;
    one := jsonb_build_object('from', lpad(h1::text, 2, '0') || ':' || lpad(m1::text, 2, '0'), 'to', lpad(h2::text, 2, '0') || ':' || lpad(m2::text, 2, '0'));
    if not out @> jsonb_build_array(one) then out := out || jsonb_build_array(one); end if;
  end loop;
  return out;
end $$;

-- تحليل كتاب واحد: {ok, hall, days, from, to, reason}
create or replace function public.wq_hall_parse(p_subj text, p_body text, p_doc_date text) returns jsonb language plpgsql immutable as $$
declare halls text[] := wq_hall_ids(coalesce(p_subj, '') || ' ' || coalesce(p_body, '')); days date[] := wq_hall_days(p_body, p_doc_date);
  tm jsonb := wq_hall_times(p_body); known text[];
begin
  known := array(select h from unnest(halls) h where h not like '?%');
  if cardinality(halls) = 0 then return jsonb_build_object('ok', false, 'reason', 'لم تُذكر قاعة معروفة'); end if;
  if cardinality(known) = 0 then return jsonb_build_object('ok', false, 'reason', 'القاعة غير موجودة في قائمة قاعات إنجاز: ' || array_to_string(array(select substr(h, 2) from unnest(halls) h), '، '), 'halls', to_jsonb(halls)); end if;
  if cardinality(halls) > 1 then return jsonb_build_object('ok', false, 'reason', 'أكثر من قاعة في الكتاب', 'halls', to_jsonb(halls)); end if;
  if cardinality(days) = 0 then return jsonb_build_object('ok', false, 'reason', 'لا تاريخ صريح للحجز', 'hall', known[1]); end if;
  if jsonb_array_length(tm) = 0 then return jsonb_build_object('ok', false, 'reason', 'لا وقت صريح (من … إلى … ص/م)', 'hall', known[1], 'days', to_jsonb(days)); end if;
  if jsonb_array_length(tm) > 1 then return jsonb_build_object('ok', false, 'reason', 'أكثر من وقت في الكتاب', 'hall', known[1], 'days', to_jsonb(days), 'times', tm); end if;
  return jsonb_build_object('ok', true, 'hall', known[1], 'days', to_jsonb(days), 'from', tm->0->>'from', 'to', tm->0->>'to');
end $$;

-- مزامنة كتاب واحد مع «حجز القاعات» (تُستدعى من المحفّز، وللتعبئة الرجعية)
create or replace function public.wq_hall_sync(p_id text) returns text
language plpgsql security definer set search_path to 'public' as $$
declare d watheqa_docs; par watheqa_docs; p jsonb; pp jsonb; root text; st text; dy date; ex bookings; bid uuid;
  conf uuid[] := '{}'; made int := 0; title text;
begin
  select * into d from watheqa_docs where id = p_id;
  if not found or coalesce(d.subj, '') !~ '(حجز|جدز)' then return 'skip'; end if;
  if d.parent is not null then select * into par from watheqa_docs where id = d.parent; end if;
  -- الكتاب الأصلي: الأب إن رُبط، وإلا الرقم بلا لاحقة الرد (2611-5137-03 ← 2611-5137)
  root := coalesce(substring(coalesce(par.no, d.no) from '^\d{4}-\d{4}'), coalesce(par.no, d.no));
  if d.kind = 'رفض' then
    update bookings set status = 'ملغى', updated_at = now(),
      data = data || jsonb_build_object('watheqa_docs', (select to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(data->'watheqa_docs', '[]') || to_jsonb(d.no)) x))), 'cancelled_by', d.no)
     where data->>'src' = 'watheqa' and data->>'watheqa_no' = root and status <> 'ملغى';
    delete from watheqa_hall_review where doc_id = d.id;
    return 'refused';
  end if;
  p := wq_hall_parse(d.subj, d.body, d.doc_date);
  -- الرد الوارد كثيرًا ما يخلو من الوقت أو القاعة: يُكمَّل من الكتاب الأصلي إن فُهم، بشرط ألا تختلف القاعة
  if not (p->>'ok')::boolean and par.id is not null then
    pp := wq_hall_parse(par.subj, par.body, par.doc_date);
    if (pp->>'ok')::boolean and coalesce(p->>'hall', pp->>'hall') = pp->>'hall' and p->'halls' is null then
      p := pp || case when jsonb_array_length(coalesce(p->'days', '[]')) > 0 then jsonb_build_object('days', p->'days') else '{}' end;
    end if;
  end if;
  if not (p->>'ok')::boolean then
    if d.kind = 'موافقة' and exists (select 1 from bookings where data->>'src' = 'watheqa' and data->>'watheqa_no' = root and status <> 'ملغى') then
      update bookings set status = 'مؤكد', updated_at = now(),
        data = data || jsonb_build_object('watheqa_docs', (select to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(data->'watheqa_docs', '[]') || to_jsonb(d.no)) x))))
       where data->>'src' = 'watheqa' and data->>'watheqa_no' = root and status <> 'ملغى';
      delete from watheqa_hall_review where doc_id = d.id;
      return 'confirmed';
    end if;
    insert into watheqa_hall_review(doc_id, no, subj, reason, parsed) values (d.id, d.no, d.subj, p->>'reason', p)
      on conflict (doc_id) do update set no = excluded.no, subj = excluded.subj, reason = excluded.reason, parsed = excluded.parsed, conflict_ids = '{}', updated_at = now();
    return 'review';
  end if;
  st := case when d.kind = 'موافقة' then 'مؤكد' else 'مبدئي' end;
  title := left(btrim(regexp_replace(coalesce(par.subj, d.subj), '^\s*(الرد على\s+)?(طلب\s+)?(الموافق[ةه] على\s+)?(تصريح\s+)?', '')), 120);
  for dy in select x::date from jsonb_array_elements_text(p->'days') x loop
    select * into ex from bookings where data->>'watheqa_no' = root and hall = p->>'hall' and day = dy order by created_at limit 1;
    if not found then  -- الكتاب نفسه أُرسل مرة أخرى برقم آخر: الموعد نفسه تمامًا
      select * into ex from bookings where data->>'src' = 'watheqa' and hall = p->>'hall' and day = dy
        and t_from = (p->>'from')::time and t_to = (p->>'to')::time and status <> 'ملغى' order by created_at limit 1;
    end if;
    if found then
      update bookings set updated_at = now(),
        status = case when ex.status = 'ملغى' then ex.status when st = 'مؤكد' then 'مؤكد' else ex.status end,
        data = data || jsonb_build_object('watheqa_docs', (select to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(data->'watheqa_docs', '[]') || to_jsonb(d.no)) x))))
       where id = ex.id;
    else
      begin
        insert into bookings(hall, day, t_from, t_to, status, data, created_by)
        values (p->>'hall', dy, (p->>'from')::time, (p->>'to')::time, st,
          jsonb_build_object('title', title, 'type', 'أخرى', 'src', 'watheqa', 'watheqa_no', root, 'watheqa_id', coalesce(par.id, d.id),
            'watheqa_docs', jsonb_build_array(d.no), 'notes', 'سُجّل تلقائيًا من كتاب وثيقة ' || d.no), null)
        returning id into bid;
        made := made + 1;
      exception when exclusion_violation then
        conf := conf || array(select b.id from bookings b where b.hall = p->>'hall' and b.day = dy and b.status <> 'ملغى'
          and tsrange('2000-01-01'::date + b.t_from, '2000-01-01'::date + b.t_to) && tsrange('2000-01-01'::date + (p->>'from')::time, '2000-01-01'::date + (p->>'to')::time));
      end;
    end if;
  end loop;
  if cardinality(conf) > 0 then
    insert into watheqa_hall_review(doc_id, no, subj, reason, parsed, conflict_ids) values (d.id, d.no, d.subj, 'تعارض مع حجز قائم (لم يُكتب فوقه)', p, conf)
      on conflict (doc_id) do update set no = excluded.no, subj = excluded.subj, reason = excluded.reason, parsed = excluded.parsed, conflict_ids = excluded.conflict_ids, updated_at = now();
    return 'conflict';
  end if;
  delete from watheqa_hall_review where doc_id = d.id;
  return case when made > 0 then 'booked' else 'linked' end;
end $$;
revoke all on function public.wq_hall_sync(text) from public, anon, authenticated;

create or replace function public.wq_hall_sync_trg() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin perform wq_hall_sync(new.id); return null; end $$;

drop trigger if exists watheqa_docs_halls_ins on public.watheqa_docs;
create trigger watheqa_docs_halls_ins after insert on public.watheqa_docs
  for each row when (new.subj ~ '(حجز|جدز)') execute function public.wq_hall_sync_trg();
drop trigger if exists watheqa_docs_halls_upd on public.watheqa_docs;
create trigger watheqa_docs_halls_upd after update on public.watheqa_docs
  for each row when (new.subj ~ '(حجز|جدز)' and (old.subj, old.body, old.kind, old.parent, old.doc_date) is distinct from (new.subj, new.body, new.kind, new.parent, new.doc_date))
  execute function public.wq_hall_sync_trg();

-- التعبئة الرجعية لا تُرسل إشعار «حجز جديد» لكل حجز قديم (علَم الجلسة jl.halls_backfill)
create or replace function public.ev_bookings() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare hn text;
begin
  if current_setting('jl.halls_backfill', true) = '1' then return null; end if;
  hn := case new.hall when 'thunayan' then 'مسرح ثنيان الغانم' when 'gm-women' then 'مسرح النساء — المسجد الكبير' when 'gm-hall' then 'القاعة الكبرى — المسجد الكبير' when 'gm-admin' then 'مسرح الإدارة — المسجد الكبير' else new.hall end;
  if tg_op = 'INSERT' then
    perform notify_team('booking_new', 'حجز جديد: ' || hn, to_char(new.day, 'DD/MM/YYYY') || ' — ' || coalesce(nullif(new.data->>'title',''), new.data->>'comm', '') || ' — ' || coalesce(who(new.created_by),''), '#bk:' || new.id, new.created_by);
  elsif (new.status is distinct from old.status or new.day is distinct from old.day or new.t_from is distinct from old.t_from) and new.created_by is distinct from auth.uid() then
    perform notify(new.created_by, 'booking_changed', 'تعديل على حجزك: ' || hn, new.status || ' — ' || to_char(new.day, 'DD/MM/YYYY') || ' — بواسطة ' || coalesce(who(auth.uid()),''), '#bk:' || new.id);
  end if;
  return null;
end $function$;

-- اختبار انحدار داخل القاعدة: يُستدعى بعد كل تعديل على المحلّل (select wq_hall_selftest() ⇒ 'ok')
create or replace function public.wq_hall_selftest() returns text language plpgsql immutable as $$
declare r jsonb;
begin
  r := wq_hall_parse('طلب حجز قاعة علي ثنيان الغانم', 'بتاريخ 23/10/2026 … الجمعة 13/11/2026 من الساعة 5:00 مساءً إلى 9:30 مساءً', '06/11/2026');
  if not (r->>'ok')::boolean or r->>'hall' <> 'thunayan' or r->'days' <> '["2026-11-13"]' or r->>'from' <> '17:00' or r->>'to' <> '21:30' then raise exception 'selftest 1: %', r; end if;
  r := wq_hall_parse('حفل', 'مسرح الوزارة الاربعاء 25/11/2026 من 6:00 الى 8:00 مساء', '06/11/2026');
  if r->>'from' <> '18:00' or r->>'to' <> '20:00' then raise exception 'selftest 2 (علامة النهاية تسري على البداية): %', r; end if;
  r := wq_hall_parse('حجز', 'مسرح الوزارة يوم 2026/09/16 من الساعة 6 الى الساعة 9', '23/08/2026');
  if (r->>'ok')::boolean then raise exception 'selftest 3 (وقت بلا ص/م لا يُخمَّن): %', r; end if;
  r := wq_hall_parse('حجز مسرح الجاليات بالمسجد الكبير', '19/12/2026 من 4:00 م إلى 8:00 م', '19/11/2026');
  if (r->>'ok')::boolean or r->>'reason' !~ 'غير موجودة' then raise exception 'selftest 4 (قاعة خارج القائمة): %', r; end if;
  r := wq_hall_parse('حجز القاعة الكبرى ومسرح النساء', '13/11/2026 من 4:00 م إلى 8:00 م', '21/10/2026');
  if (r->>'ok')::boolean then raise exception 'selftest 5 (قاعتان): %', r; end if;
  r := wq_hall_parse('حجز', 'التاريخ 24/02/2026 من الساعة 8:00 صباحا حتى الساعة 2:00 ظهرا قاعة ثنيان الغانم', '03/02/2026');
  if r->>'from' <> '08:00' or r->>'to' <> '14:00' then raise exception 'selftest 6 (صباحًا إلى ظهرًا): %', r; end if;
  r := wq_hall_parse('حجز ثنيان الغانم', 'موعد سابق 1/1/2026 من 4:00 م إلى 8:00 م', '06/11/2026');
  if (r->>'ok')::boolean then raise exception 'selftest 7 (تاريخ قبل الكتاب مرجع لا موعد): %', r; end if;
  return 'ok';
end $$;

commit;

begin;
-- JL-HALLS-2 (توضيح يوسف 2026-11-28): حالة الحجز من الرد الوارد على كتاب الطلب، لا من كلمة «موافقة» وحدها.
-- تصنيف الرد: «ok» (متاح، لا مانع، تمت الموافقة، نفيدكم بإمكانية، تم الحجز…)، «no» (مشغولة، غير متاح، يوجد تعارض، محجوزة، نعتذر…)،
-- «fwd» (تحويل للطلب نفسه: «يرجى التكرم بالموافقة» بلا قرار)، وإلا null = يحتاج مراجعة. الرفض يُفحص أولًا (فـ«غير متاح» ليست «متاح»).
create or replace function public.wq_hall_reply(p_body text, p_actions text) returns text language plpgsql immutable as $$
declare t text := wq_hall_norm(coalesce(p_body, '') || ' ' || coalesce(p_actions, ''));
  no_re text := '(مشغول|غير\s+متاح|غير\s+متوفر|يوجد\s+تعارض|لوجود\s+(مسابق|نشاط|فعالي|حجز)|محجوز|نعتذر|يتعذر|تعذر|عدم\s+(امكاني|الموافق|موافق|جاهزي|توفر)|لا\s+يمكن|ناسف|لا\s+نوافق|لم\s+يتم\s+الموافق)';
  ok_re text := '(متاح|لا\s*مانع|ليس\s+لدي\S*\s+(اي\s+)?مانع|لا\s+يوجد\s+(لدينا\s+)?مانع|تمت?\s+الموافق|نفيدكم\s+بامكاني|نفيدكم\s+بالموافق|تم\s+الحجز|نوافق)';
begin
  if t ~ no_re then return 'no'; end if;
  if t ~ ok_re then return 'ok'; end if;
  if t ~ '(يرجى|نرجو)\s+التكرم\s+بالموافق' then return 'fwd'; end if;
  return null;
end $$;

-- كتاب الطلب الصادر الذي يردّ عليه كتاب وارد: الأب، أو الرقم بلاحقة (2611-5137-03)، أو المرجع في النص،
-- وإلا الموضوع والتاريخ: طلب صادر واحد فقط خلال 120 يومًا قبل الرد يذكر القاعة نفسها واليوم نفسه
create or replace function public.wq_hall_request_of(p_id text) returns text
language plpgsql stable security definer set search_path to 'public' as $$
declare d watheqa_docs; rid text; days date[]; halls text[]; n int;
begin
  select * into d from watheqa_docs where id = p_id; if not found then return null; end if;
  select id into rid from watheqa_docs where id = d.parent and dir = 'out' and subj ~ '(حجز|جدز)';
  if rid is not null then return rid; end if;
  select id into rid from watheqa_docs where dir = 'out' and subj ~ '(حجز|جدز)' and id <> d.id
    and (d.no like no || '-%' or no = any(coalesce(d.refs, '{}'))) order by no limit 1;
  if rid is not null then return rid; end if;
  days := wq_hall_days(d.body, d.doc_date); halls := wq_hall_ids(coalesce(d.subj, '') || ' ' || coalesce(d.body, ''));
  if cardinality(days) = 0 or cardinality(halls) = 0 then return null; end if;
  select count(*), min(id) into n, rid from watheqa_docs q where q.dir = 'out' and q.subj ~ '(حجز|جدز)' and q.id <> d.id
    and to_date(q.doc_date, 'DD/MM/YYYY') between to_date(d.doc_date, 'DD/MM/YYYY') - 120 and to_date(d.doc_date, 'DD/MM/YYYY')
    and wq_hall_ids(coalesce(q.subj, '') || ' ' || coalesce(q.body, '')) && halls
    and wq_hall_days(q.body, q.doc_date) && days;
  return case when n = 1 then rid end;
end $$;

create or replace function public.wq_hall_review_set(p_doc text, p_reason text, p_parsed jsonb, p_conf uuid[] default '{}') returns void
language sql security definer set search_path to 'public' as $$
  insert into watheqa_hall_review(doc_id, no, subj, reason, parsed, conflict_ids)
  select id, no, subj, p_reason, coalesce(p_parsed, '{}'), coalesce(p_conf, '{}') from watheqa_docs where id = p_doc
  on conflict (doc_id) do update set no = excluded.no, subj = excluded.subj, reason = excluded.reason, parsed = excluded.parsed,
    conflict_ids = excluded.conflict_ids, dismissed = false, updated_at = now()
$$;

create or replace function public.wq_hall_sync(p_id text) returns text
language plpgsql security definer set search_path to 'public' as $$
declare d watheqa_docs; q watheqa_docs; p jsonb; pp jsonb; root text; st text; dy date; ex bookings; cls text; rid text; r record;
  conf uuid[] := '{}'; made int := 0; title text; res text;
begin
  select * into d from watheqa_docs where id = p_id;
  if not found then return 'skip'; end if;

  -- ===== رد وارد على طلب حجز =====
  if d.dir is distinct from 'out' then
    rid := wq_hall_request_of(d.id);
    if rid is null and coalesce(d.subj, '') !~ '(حجز|جدز)' then return 'skip'; end if;
    if rid is not null then select * into q from watheqa_docs where id = rid; end if;
    cls := wq_hall_reply(d.body, d.actions);
    if cls = 'fwd' then delete from watheqa_hall_review where doc_id = d.id; return 'forward'; end if;
    if cls is null then perform wq_hall_review_set(d.id, 'رد غير واضح: لم يُعرف أهو موافقة أم رفض', jsonb_build_object('request', q.no)); return 'review'; end if;
    if q.id is null then
      perform wq_hall_review_set(d.id, case cls when 'ok' then 'موافقة' else 'رفض' end || ' لم يُعرف كتاب طلبها', '{}'); return 'review';
    end if;
    root := coalesce(substring(q.no from '^\d{4}-\d{4}'), q.no);
    if cls = 'no' then
      update bookings set status = 'ملغى', updated_at = now(),
        data = data || jsonb_build_object('watheqa_docs', (select to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(data->'watheqa_docs', '[]') || to_jsonb(d.no)) x))), 'reply', d.no, 'reply_state', 'رفض')
       where data->>'src' = 'watheqa' and data->>'watheqa_no' = root and status <> 'ملغى';
      -- الطلب حُسم بالرفض: لا سؤال عنه
      update watheqa_hall_review set dismissed = true, reason = 'رُفض بالرد ' || d.no, updated_at = now() where doc_id = q.id;
      delete from watheqa_hall_review where doc_id = d.id;
      return 'refused';
    end if;
    -- موافقة: الحجز القائم من الطلب يصير «مؤكد»، وإلا يُنشأ من الطلب (والأيام من الرد إن ذكرها)
    if exists (select 1 from bookings where data->>'src' = 'watheqa' and data->>'watheqa_no' = root and status <> 'ملغى') then
      update bookings set status = 'مؤكد', updated_at = now(),
        data = data || jsonb_build_object('watheqa_docs', (select to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(data->'watheqa_docs', '[]') || to_jsonb(d.no)) x))), 'reply', d.no, 'reply_state', 'موافقة')
       where data->>'src' = 'watheqa' and data->>'watheqa_no' = root and status <> 'ملغى';
      update watheqa_hall_review set dismissed = true, reason = 'حُسم بالموافقة ' || d.no, updated_at = now() where doc_id = q.id and conflict_ids = '{}';
      delete from watheqa_hall_review where doc_id = d.id;
      return 'confirmed';
    end if;
    p := wq_hall_parse(d.subj, d.body, d.doc_date); pp := wq_hall_parse(q.subj, q.body, q.doc_date);
    if not (p->>'ok')::boolean then
      -- القاعة والوقت من الطلب، والأيام والقاعة من الرد إن ذكرها (الرد أدقّ: قد يوافق على يوم أو قاعة دون غيرها)
      p := jsonb_build_object('hall', coalesce(p->>'hall', pp->>'hall'), 'days', coalesce(p->'days', pp->'days'), 'from', coalesce(p->>'from', pp->>'from'), 'to', coalesce(p->>'to', pp->>'to'));
      if p->>'hall' is null or p->'days' is null or p->>'from' is null then
        perform wq_hall_review_set(d.id, 'موافقة على الطلب ' || q.no || ' وينقصها ' || concat_ws('، ', case when p->>'hall' is null then 'القاعة' end, case when p->'days' is null then 'التاريخ' end, case when p->>'from' is null then 'الوقت' end), p);
        update watheqa_hall_review set dismissed = true, reason = 'السؤال على الرد ' || d.no, updated_at = now() where doc_id = q.id;
        return 'review';
      end if;
      p := p || '{"ok": true}';
    end if;
    st := 'مؤكد'; d := q;   -- الحجز باسم كتاب الطلب
  else
    -- ===== طلب صادر =====
    if coalesce(d.subj, '') !~ '(حجز|جدز)' then return 'skip'; end if;
    root := coalesce(substring(d.no from '^\d{4}-\d{4}'), d.no);
    p := wq_hall_parse(d.subj, d.body, d.doc_date);
    if not (p->>'ok')::boolean then perform wq_hall_review_set(d.id, p->>'reason', p); res := 'review'; end if;
    st := 'مبدئي';   -- لا رد بعد
  end if;

  if res is null then
    title := left(btrim(regexp_replace(d.subj, '^\s*(الرد على\s+)?(طلب\s+)?(الموافق[ةه] على\s+)?(تصريح\s+)?', '')), 120);
    for dy in select x::date from jsonb_array_elements_text(p->'days') x loop
      select * into ex from bookings where data->>'watheqa_no' = root and hall = p->>'hall' and day = dy order by created_at limit 1;
      if not found then  -- الكتاب نفسه أُرسل مرة أخرى برقم آخر: الموعد نفسه تمامًا
        select * into ex from bookings where data->>'src' = 'watheqa' and hall = p->>'hall' and day = dy
          and t_from = (p->>'from')::time and t_to = (p->>'to')::time and status <> 'ملغى' order by created_at limit 1;
      end if;
      if found then
        update bookings set updated_at = now(), status = case when ex.status = 'ملغى' then ex.status when st = 'مؤكد' then 'مؤكد' else ex.status end,
          data = data || jsonb_build_object('watheqa_docs', (select to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(data->'watheqa_docs', '[]') || to_jsonb(d.no)) x))))
         where id = ex.id;
      else
        begin
          insert into bookings(hall, day, t_from, t_to, status, data, created_by)
          values (p->>'hall', dy, (p->>'from')::time, (p->>'to')::time, st,
            jsonb_build_object('title', title, 'type', 'أخرى', 'src', 'watheqa', 'watheqa_no', root, 'watheqa_id', d.id,
              'watheqa_docs', jsonb_build_array(d.no), 'notes', 'سُجّل تلقائيًا من كتاب وثيقة ' || d.no), null);
          made := made + 1;
        exception when exclusion_violation then
          conf := conf || array(select b.id from bookings b where b.hall = p->>'hall' and b.day = dy and b.status <> 'ملغى'
            and tsrange('2000-01-01'::date + b.t_from, '2000-01-01'::date + b.t_to) && tsrange('2000-01-01'::date + (p->>'from')::time, '2000-01-01'::date + (p->>'to')::time));
        end;
      end if;
    end loop;
    if cardinality(conf) > 0 then perform wq_hall_review_set(d.id, 'تعارض مع حجز قائم (لم يُكتب فوقه)', p, conf); res := 'conflict';
    else delete from watheqa_hall_review where doc_id = d.id; res := case when made > 0 then 'booked' else 'linked' end; end if;
  end if;

  -- طلب صادر: ردوده الواردة الموجودة تُطبَّق الآن (قد يصل الرد قبل أن يُفهم الطلب أو يُعاد تحليله)
  if st = 'مبدئي' then
    for r in select w.id from watheqa_docs w where w.dir is distinct from 'out' and w.id <> d.id
        and (w.parent = d.id or w.no like root || '-%' or root = any(coalesce(w.refs, '{}'))) order by w.no loop
      perform wq_hall_sync(r.id);
    end loop;
  end if;
  return res;
end $$;
revoke all on function public.wq_hall_sync(text), public.wq_hall_request_of(text), public.wq_hall_review_set(text, text, jsonb, uuid[]) from public, anon, authenticated;

-- المحفّز: كتب الحجز، والكتب المرتبطة بأب (الرد قد لا يذكر «حجز» في موضوعه)
drop trigger if exists watheqa_docs_halls_ins on public.watheqa_docs;
create trigger watheqa_docs_halls_ins after insert on public.watheqa_docs
  for each row when (new.subj ~ '(حجز|جدز)' or new.parent is not null or new.no ~ '^\d{4}-\d{4}-\d+$') execute function public.wq_hall_sync_trg();
drop trigger if exists watheqa_docs_halls_upd on public.watheqa_docs;
create trigger watheqa_docs_halls_upd after update on public.watheqa_docs
  for each row when ((new.subj ~ '(حجز|جدز)' or new.parent is not null or new.no ~ '^\d{4}-\d{4}-\d+$')
    and (old.subj, old.body, old.kind, old.parent, old.doc_date, old.actions, old.dir) is distinct from (new.subj, new.body, new.kind, new.parent, new.doc_date, new.actions, new.dir))
  execute function public.wq_hall_sync_trg();

-- اختبار انحدار بنصوص ردود حقيقية من وثيقة
create or replace function public.wq_hall_reply_selftest() returns text language plpgsql immutable as $$
begin
  if wq_hall_reply('وبالإشارة إلى الموضوع أعلاه، نحيطكم علماً بأن تاريخ الحجز 2/12/2026م متاح، ويرجى التنبيه على الجهة المستفيدة', '') is distinct from 'ok' then raise exception 'reply 1 (متاح = موافقة، 2611-5137-03)'; end if;
  if wq_hall_reply('نود إبلاغكم أنه تمت الموافقة على حجز: مسرح النساء، لنشاط: المؤتمر الإسلامي السنوي', '') is distinct from 'ok' then raise exception 'reply 2 (تمت الموافقة، 2610-2239)'; end if;
  if wq_hall_reply('نعتذر عن طلب الحجز نظرا لوجود مسابقة الامانة للقرآن الكريم في نفس التاريخ', '') is distinct from 'no' then raise exception 'reply 3 (نعتذر = رفض، 2611-4785-02)'; end if;
  if wq_hall_reply('نعتذر لعدم إمكانية حجز القاعة الكبرى لنشاط: ندوة … لعدم جاهزية القاعة', '') is distinct from 'no' then raise exception 'reply 4 (2601-6066)'; end if;
  if wq_hall_reply('نحيطكم علماً بأن القاعة غير متاحة في التاريخ المطلوب', '') is distinct from 'no' then raise exception 'reply 5 (غير متاح ليست متاح)'; end if;
  if wq_hall_reply('يرجى التكرم بالموافقة على حجز مسرح ثنيان الغانم لإقامة محاضرة دينية', '') is distinct from 'fwd' then raise exception 'reply 6 (تحويل بلا قرار، 2611-5137-02)'; end if;
  if wq_hall_reply('للاطلاع', '') is not null then raise exception 'reply 7 (غير واضح = مراجعة)'; end if;
  return wq_hall_selftest();
end $$;

commit;

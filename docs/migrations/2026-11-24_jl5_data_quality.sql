-- JL-5 بند 1: تصحيحات جودة البيانات في إنجاز (غير مطبّقة؛ يشغّلها يوسف). فُحصت 2026-11-24.
-- ما يُصحَّح هنا آليًا هو ما لا لبس فيه (صيغ إملائية لنفس الاسم). ما يحتاج قرارًا بشريًا مكتوب في آخر الملف تعليقًا.
-- التراجع: 2026-11-24_jl5_data_quality.down.sql (نسخة من القيم قبل التعديل في جدول jl5_dq_backup).
begin;

create table if not exists public.jl5_dq_backup (tbl text, row_id text, before jsonb, at timestamptz default now());
alter table public.jl5_dq_backup enable row level security;
insert into public.jl5_dq_backup (tbl, row_id, before) select 'refs', id, data from public.refs where id in ('mosques','docs');
insert into public.jl5_dq_backup (tbl, row_id, before) select 'acts', id, data from public.acts
  where data->>'comm' = 'الباكستانية - عارف جاويد محمد' or data->>'lect' = 'نياس بوثيا فيتيل محمد';

-- 1) المنطقة بصيغتين: «أبو حليفه» ← «أبو حليفة» (m152)، و«الفحاحيل» ← «الفحيحيل» (m158 وm159 وm160)
update public.refs set data = jsonb_set(data, '{list}', (
  select jsonb_agg(case
    when x->>'area' = 'أبو حليفه' then jsonb_set(x, '{area}', '"أبو حليفة"')
    when x->>'area' = 'الفحاحيل' then jsonb_set(x, '{area}', '"الفحيحيل"')
    else x end order by o)
  from jsonb_array_elements(data->'list') with ordinality t(x, o)))
where id = 'mosques';

-- 2) الجالية بصيغتين: «الباكستانية - عارف جاويد محمد» ← الاسم المسجّل في قائمة الجاليات «… محمد شفيع» (6 أنشطة وموافقة 2611-4800)
update public.acts set data = jsonb_set(data, '{comm}', '"الباكستانية - عارف جاويد محمد شفيع"')
 where data->>'comm' = 'الباكستانية - عارف جاويد محمد';
update public.refs set data = jsonb_set(data, '{list}', (
  select jsonb_agg(case when x->>'comm' = 'الباكستانية - عارف جاويد محمد' then jsonb_set(x, '{comm}', '"الباكستانية - عارف جاويد محمد شفيع"') else x end order by o)
  from jsonb_array_elements(data->'list') with ordinality t(x, o)))
where id = 'docs';

-- 3) المحاضر بصيغتين: «نياس بوثيا فيتيل محمد» (1) ← «نياس بوثيافيتيل محمد» (2)
update public.acts set data = jsonb_set(data, '{lect}', '"نياس بوثيافيتيل محمد"') where data->>'lect' = 'نياس بوثيا فيتيل محمد';

commit;

-- ===================== يحتاج قرار يوسف (لا يُنفَّذ) =====================
-- أ) مساجد محتملة التكرار (الاسم نفسه والمنطقة نفسها أو قريبة):
--    m173 «احمد العجيل» المنقف (3 أنشطة) و m174 «احمد عبد الله العجيل» المنقف (2)
--    m161 «أحمد العجيل» الفحيحيل (1) و m158 «احمد عبد الله العجيل» الفحاحيل←الفحيحيل (2)
--    m165 «مزيد هلال العتيبي» الفحيحيل ق7 (8) و m217 الاسم نفسه الفحيحيل ق8 (4)
--    الدمج يعني: نقل data->>'mosque' في الأنشطة إلى المعرّف الباقي ثم حذف الآخر من refs.mosques.
--    (أسماء مكررة في مناطق مختلفة مثل الميلم والشايع والصحابة والعتيقي ورشيد العدواني: مساجد مختلفة، لا تُدمج.)
-- ب) مسجدان بلا محافظة ولا منطقة: m215 «محمد علي محمد الرطام»، m216 «شاه العبيد».
-- ج) أنشطة سارية بحقول فارغة:
--    بلا جالية (13، كلها مولّدة من تصاريح البنغالية 13/11 و20/11): ap893aea6e2ee3 ap07498ad2217c ap83b517cac263 ap7c547c084d6c ap1be6a6d684f6
--      ap1ef8021c76df ap78333505760c ap257d2712e91b apbff910a08bae ap7663da326ab2 apef06d3a9ce0e ap52763e4c92ec ap122ee1594c1e
--    بلا مسجد: a606b9a370972 ade7c106f7eba a186 a187 a179 a206 a207 a208 a209 a210 a211 (وa207–a211 بلا وقت أيضًا)
--    بلا محاضر: a057 a063 a153 a187 a079 — بلا موافقة: apa90ad303ef09 ap2ed1deecd33e apfa54a268c805
-- د) 16 نشاطًا مرتبطة بموافقات غير مسجّلة في قائمة الموافقات: 2611-1253 (13 نشاطًا)، 2611-1961 (a025 a028)، 2611-1954 (a231).
--    السبب: الموافقة وصلت عبر وثيقة وصدرت عليها تصاريح دون إضافتها إلى refs.docs؛ أضفها من صفحة الموافقات بتاريخيها.
-- هـ) لغة النشاط فارغة في 238 من 269: الإحصاءات حسب اللغة تأخذ اللغة من الجالية (refs.comms.lang) لا من النشاط.

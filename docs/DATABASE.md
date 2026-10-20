# قاعدة البيانات (Supabase / Postgres)

كل الجداول في `public` ومفعّل عليها RLS. الدالة `my_role()` تُرجع دور المستخدم (`admin` / `editor` / `viewer`) من `profiles`، و`is_owner()` لصاحب النظام.

## الجداول حسب المجال

**الحسابات والإعدادات**
- `profiles` (id, username, name, role, active, title) — حساب لكل موظف مرتبط بـ auth.users
- `account_requests` — طلبات فتح الحساب (يعتمدها المالك)
- `settings` (key, value jsonb) — إعدادات عامة: قيمة الخطبة، مزامنة وثيقة، OneDrive لكل مستخدم `onedrive:<id>`
- `notif_prefs`, `push_subs`, `notifications`, `seen_features`

**البيانات المرجعية** — `refs` (id, data jsonb): `comms` (الجاليات: جالية لكل منسق)، `coords` (المنسقون ونوابهم)، `mosques`، `docs` (الموافقات)

**الأنشطة والجدولة**
- `acts` (id, data jsonb) — الأنشطة؛ `data.comm`, `data.mosque`, `data.days`, `data.time`, `data.doc`...
- `bookings` — حجز القاعات · `visits` — الزيارات الميدانية · `attendance` — الحضور
- `requests` — الطلبات الواردة (ملفاتها في Storage `requests`)
- `coord_links` (comm, token) — رابط بوابة المنسق
- `permits`, `permit_grants` — تصاريح الدروس والتفويض بها
- `renew_reminders` — سجل تذكيرات التجديد

**العمل والتواصل**
- `tasks`, `task_replies` — المهام والردود (`waiting='mgr'` بانتظار رئيس القسم)
- `questions` — الأسئلة · `chat_messages`, `chat_reads` — المحادثات الداخلية
- `recommendations`, `decisions`, `decision_reads` — التوصيات والقرارات والاطلاع
- `wa_sends` — سجل إرسال القرارات للمنسقين · `wq_notify` — إبلاغ المنسق برد وثيقة
- `comments`, `my_notes`, `notes`

**وثيقة**
- `watheqa_docs` — الكتب المسحوبة من وثيقة (approval = موافقة/لا مانع)
- `watheqa_outbox` — كتب أُرسلت من «إنجاز» لتُحفظ مسودة في وثيقة (pending → drafted/failed)
- `wq_track` — متابعة الكتاب (follow/done يدوياً)

**خطب الجمعة**
- `khatibs` (id, data jsonb) — المسجد والخطيب الأساسي والاحتياط
- `sermons` (fri, kh_id, who, amount) — تسجيل كل خطبة
- `khatib_bank` (cid, name, iban, bank) — سجل الآيبان (قراءة لكل الموظفين، تعديل للمحرر والمدير)
- `reward_history` (month, cid, count, amount, bank, iban) — كشوف البنوك المعتمدة (قراءة لكل الموظفين)

**النظام**
- `audit` — سجل كل تعديل · `backups` — نسخة يومية (`take_backup()`) آخر 45 يوماً
- `private_seed`, `app_files`, `app_secrets`, `ai_secrets`, `ai_log` — داخلية للخادم (بلا سياسات = لا يقرؤها العميل)
- `wa_messages` — لواجهة WhatsApp Cloud API (موقوفة حالياً؛ الجدول محفوظ إن أُعيدت)

## الدوال المكشوفة عمداً للعامة (anon)
`portal_info`, `portal_submit` (بوابة المنسقين)، `verify_permit` (الباركود)، `request_account`, `account_request_status`, `vapid_public`.

## Edge Functions
`watheqa-ingest` (استقبال كتب وثيقة بمفتاح)، `notify-push`، `manage-users`، `ai-assistant`، `wa-webhook`/`wa-send` (Cloud API، موقوفة).

## تصدير المخطط الكامل
```bash
supabase link --project-ref <ref>
supabase db dump --schema public -f schema.sql      # الجداول + السياسات + الدوال + المحفزات
```

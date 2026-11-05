#!/usr/bin/env python3
"""يفحص أن كل نص عربي في واجهة البوابة له ترجمة في كل لغة. يفشل إذا نقص شيء.
التشغيل: python3 tools/check-portal-i18n.py"""
import glob, json, re, sys
src = open('portal.html', encoding='utf8').read()
js = src[src.index('<script>'):]
ar = re.compile('[؀-ۿ]')
keys = set(re.findall(r'_t\("([^"]+)"', js)) | set(re.findall(r'field\("([^"]+)"', js))
keys |= set(m.strip() for m in re.findall(r'(?:placeholder|aria-label|title)="([^"]*[؀-ۿ][^"]*)"', js))
keys |= set(m.strip() for m in re.findall(r'>([^<>\'"+]*[؀-ۿ][^<>\'"+]*)<', js))
# نصوص شهادة الشكر الرسمية تبقى بالعربية
SKIP = {'شهادة شكر', 'شهادة شكر وتقدير', 'يتقدّم قسم الجاليات بخالص الشكر والتقدير إلى', 'إدارة العلاقات الخارجية · قسم الجاليات ورعاية المهتدين وطلبة البعوث'}
keys = {k for k in keys if ar.search(k) and k not in SKIP}
bad = 0
for f in sorted(glob.glob('portal-i18n/*.json')):
    d = json.load(open(f, encoding='utf8'))
    miss = sorted(k for k in keys if k not in d)
    ph = [k for k, v in d.items() if sorted(re.findall(r'\{\d\}', k)) != sorted(re.findall(r'\{\d\}', v))]
    if miss or ph:
        bad += 1
        print(f, 'ناقص', len(miss), 'خلل أرقام', len(ph))
        for k in miss[:15] + ph[:5]:
            print('   ', k)
print('سليم: كل النصوص مترجمة' if not bad else 'توجد نواقص')
sys.exit(1 if bad else 0)

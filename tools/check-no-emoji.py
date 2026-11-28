#!/usr/bin/env python3
"""يمنع رجوع الإيموجي إلى واجهة إنجاز (طلب يوسف JL-ICONS): الأيقونات SVG خطية من الـsprite عبر ei("اسم").
يفحص src/base وsrc/modules وصفحات الجذر، ويتجاهل التعليقات والأسطر المعلَّمة emoji-ok (فحوص بيانات لا عرض).
الأساس tools/emoji-baseline.json: لا يزيد عدد أي ملف عنه (يُسمح بالنقص فقط، فيُخفَّض الأساس معه)."""
import re, glob, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIC = re.compile('[\U0001F300-\U0001FAFF☀-⛿✅✨❌❎❓-❗❣❤➕-➗➰➿⭐⭕⬅-⬇⬛⬜⌚⌛⏩-⏺⤴⤵]')
def files():
    pats = ["src/base/*.html", "src/modules/*.js", "src/modules/*.css", "portal.html", "sermon.html", "verify.html", "auth.html"]
    return sorted({os.path.relpath(p, ROOT) for g in pats for p in glob.glob(os.path.join(ROOT, g))})
def strip_comments(s):
    s = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group().count("\n"), s, flags=re.S)
    s = re.sub(r"<!--.*?-->", lambda m: "\n" * m.group().count("\n"), s, flags=re.S)
    return "\n".join(re.sub(r"(^|\s)//[^\n\"'`]*$", "", l) for l in s.split("\n"))
def count(path):
    raw = open(os.path.join(ROOT, path), encoding="utf8").read()
    ok = {i for i, l in enumerate(raw.split("\n"), 1) if "emoji-ok" in l}   # العلامة في تعليق السطر نفسه
    hits = [(i, m.group()) for i, l in enumerate(strip_comments(raw).split("\n"), 1) if i not in ok for m in PIC.finditer(l)]
    return hits
def main():
    base_p = os.path.join(ROOT, "tools/emoji-baseline.json")
    base = json.load(open(base_p, encoding="utf8")) if os.path.exists(base_p) else {}
    now = {f: count(f) for f in files()}
    if "--write" in sys.argv:
        json.dump({f: len(h) for f, h in sorted(now.items()) if h}, open(base_p, "w", encoding="utf8"), ensure_ascii=False, indent=1); print("baseline written"); return 0
    bad = []
    for f, h in now.items():
        if len(h) > base.get(f, 0):
            bad.append(f"{f}: {len(h)} > {base.get(f, 0)}  " + " ".join(f"L{i}:{e}" for i, e in h[:6]))
    if bad:
        print("✗ إيموجي جديد في الواجهة؛ استعمل ei(\"اسم\") من sprite الأيقونات:\n" + "\n".join(bad)); return 1
    print(f"emoji-guard: OK ({sum(len(h) for h in now.values())} باقٍ في الأساس)"); return 0
if __name__ == "__main__": sys.exit(main())

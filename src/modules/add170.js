/* ================= v170 (JL-ICONS): أيقونات SVG خطية بدل الإيموجي في كل الواجهة ================= */
/* ei("اسم") ← <svg> من sprite المنصة (#i-اسم) بحجم الخط ولونه. الإيموجي ممنوع في الواجهة: tools/check-no-emoji.py يُشغَّل مع البناء. */
function ei(n){ return `<svg class="ei" aria-hidden="true"><use href="#i-${n}"/></svg>`; }

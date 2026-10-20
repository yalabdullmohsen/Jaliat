// Post-build: minify the inline script and styles of index.html (smaller download, faster start).
const fs = require("fs"); const esbuild = require("/opt/npm-tools/node_modules/esbuild");
const f = process.argv[2]; let h = fs.readFileSync(f, "utf8"); const before = h.length;
h = h.replace(/<style>([\s\S]*?)<\/style>/g, (m, css) => { try { return "<style>" + esbuild.transformSync(css, { loader:"css", minify:true, charset:"utf8" }).code + "</style>"; } catch (e) { return m; } });
h = h.replace(/<script>([\s\S]*?)<\/script>/g, (m, js) => { if (js.trim().length < 2000) return m; const r = esbuild.transformSync(js, { minify:true, target:"es2020", charset:"utf8", legalComments:"none" }); return "<script>" + r.code + "</script>"; });
fs.writeFileSync(f, h); console.log("min", before, "->", h.length);

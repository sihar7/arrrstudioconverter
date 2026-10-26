// Salin runtime WASM onnxruntime-web ke public/ort (di-host sendiri, tanpa CDN pihak ketiga).
// Jalan otomatis setelah `npm install` (postinstall) — termasuk saat build di Vercel. Folder tujuan di-.gitignore.
import fs from "node:fs";
import path from "node:path";

const src = path.join("node_modules", "onnxruntime-web", "dist");
const out = path.join("public", "ort");
const files = ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"];

if (!fs.existsSync(src)) process.exit(0);
fs.mkdirSync(out, { recursive: true });
for (const f of files) fs.copyFileSync(path.join(src, f), path.join(out, f));
console.log(`[copy-ort] ${files.length} file → ${out}`);

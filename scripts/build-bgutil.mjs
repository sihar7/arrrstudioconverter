// Bangun vendor/bgutil: PO Token provider bgutil (https://github.com/Brainicism/bgutil-ytdlp-pot-provider)
// untuk yt-dlp — cara yang sama dengan Dockerfile arrweb, tapi mode script supaya jalan di Vercel.
//   vendor/bgutil/build/generate_once.js  → server bgutil di-bundle jadi satu file (esbuild)
//   vendor/bgutil/plugins/bgutil/yt_dlp_plugins/…  → plugin yt-dlp (--plugin-dirs)
// Jalankan: node scripts/build-bgutil.mjs  (hasilnya di-commit; ganti versi = ubah VERSION lalu jalankan ulang)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const VERSION = "2.0.2";
const ESBUILD = "esbuild@0.25.10";
const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "vendor", "bgutil");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "bgutil-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const sh = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

try {
  sh("git", ["clone", "-q", "--depth", "1", "--branch", VERSION, "https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git", "src"], work);
  const server = path.join(work, "src", "server");
  sh(npm, ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], server);

  sh(npm, ["install", "--no-save", "--ignore-scripts", "--no-audit", "--no-fund", ESBUILD], server);

  fs.rmSync(out, { recursive: true, force: true });
  // API JS (bukan CLI) → path ber-spasi & banner aman di Windows
  const esbuild = await import(pathToFileURL(path.join(server, "node_modules", "esbuild", "lib", "main.js")).href);
  await esbuild.build({
    entryPoints: [path.join(server, "src", "generate_once.ts")],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    minify: true,
    outfile: path.join(out, "build", "generate_once.js"),
    // canvas (native, opsional untuk jsdom) tidak dibangun & tidak di-bundle
    external: ["canvas", "bufferutil", "utf-8-validate"],
    // Dependensi CJS di dalam bundle ESM butuh require/__dirname/__filename
    banner: {
      js: "import{createRequire as __cr}from'node:module';import{fileURLToPath as __fu}from'node:url';import{dirname as __dn}from'node:path';const require=__cr(import.meta.url);const __filename=__fu(import.meta.url);const __dirname=__dn(__filename);",
    },
    logLevel: "warning",
    plugins: [
      {
        // jsdom membaca default-stylesheet.css relatif ke foldernya → arahkan ke salinan di samping bundle
        name: "jsdom-assets",
        setup(b) {
          b.onLoad({ filter: /jsdom[\\/]lib[\\/]jsdom[\\/]living[\\/]css[\\/]helpers[\\/]computed-style\.js$/ }, (args) => ({
            contents: fs
              .readFileSync(args.path, "utf8")
              .replace(`"../../../browser/default-stylesheet.css"`, `"./default-stylesheet.css"`),
            loader: "js",
          }));
        },
      },
      {
        // css-tree dkk. memuat JSON lewat createRequire(import.meta.url) → tidak ikut ter-bundle; inline isinya
        name: "inline-json-require",
        setup(b) {
          b.onLoad({ filter: /node_modules[\\/].*\.m?js$/ }, (args) => {
            const src = fs.readFileSync(args.path, "utf8");
            if (!src.includes("createRequire(import.meta.url)")) return undefined;
            const req = createRequire(args.path);
            return {
              contents: src.replace(/\brequire\((['"])([^'"]+\.json)\1\)/g, (_, _q, spec) =>
                fs.readFileSync(req.resolve(spec), "utf8"),
              ),
              loader: "js",
              resolveDir: path.dirname(args.path),
            };
          });
        },
      },
    ],
  });
  // Aset jsdom yang dibuka lewat path: stylesheet (di atas) & xhr-sync-worker (require.resolve relatif ke bundle)
  const jsdom = path.join(server, "node_modules", "jsdom");
  fs.copyFileSync(path.join(jsdom, "lib", "jsdom", "browser", "default-stylesheet.css"), path.join(out, "build", "default-stylesheet.css"));
  fs.copyFileSync(path.join(jsdom, "lib", "jsdom", "living", "xhr", "xhr-sync-worker.js"), path.join(out, "build", "xhr-sync-worker.js"));
  fs.writeFileSync(path.join(out, "package.json"), JSON.stringify({ type: "module", version: VERSION }, null, 2) + "\n");
  fs.cpSync(path.join(work, "src", "plugin", "yt_dlp_plugins"), path.join(out, "plugins", "bgutil", "yt_dlp_plugins"), {
    recursive: true,
    filter: (p) => !p.includes("__pycache__"),
  });
  fs.copyFileSync(path.join(work, "src", "LICENSE"), path.join(out, "LICENSE"));
  console.log(`bgutil ${VERSION} → ${path.relative(root, out)}`);
} finally {
  // Windows: binary esbuild bisa masih terkunci sesaat → sisa folder temp tidak masalah
  try {
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 3 });
  } catch {}
}

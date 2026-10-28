// Memori Claude Code di PC ini → memori Alice (mode Alice, admin). Hanya MEMBACA file lokal:
//   ~/.claude/CLAUDE.md                     → CLAUDE.md (persona & aturan global)
//   ~/.claude/projects/<home>/memory/*.md   → global/…  (memori global Alice)
//   ~/.claude/projects/<proyek>/memory/*.md → <proyek>/… (folder scratch sesi dilewati)
// Web yang mengirimnya ke server (POST /api/alice/memory/sync) — server hanya menerima dari akun admin.
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const MAX_FILE = 100_000;
const MAX_FILES = 450;
const MAX_TOTAL = 5_000_000;

/** Nama folder proyek Claude Code = path dengan ":" "\" "/" diganti "-" (mis. C--Users-hemgi) */
const encode = (p) => p.replace(/[:\\/]/g, "-").toLowerCase();

async function readMd(dir) {
  const names = await fsp.readdir(dir).catch(() => []);
  const out = [];
  for (const name of names) {
    if (!/\.md$/i.test(name)) continue;
    const full = path.join(dir, name);
    const st = await fsp.stat(full).catch(() => null);
    if (!st?.isFile() || st.size > MAX_FILE) continue;
    out.push({ name, text: await fsp.readFile(full, "utf8") });
  }
  return out;
}

/** → [{ path: "global/MEMORY.md", text }] (kosong bila Claude Code tidak terpasang) */
async function readClaudeMemory() {
  const base = path.join(os.homedir(), ".claude");
  const home = encode(os.homedir());
  const files = [];
  let total = 0;
  const add = (p, text) => {
    if (files.length >= MAX_FILES || total + text.length > MAX_TOTAL) return;
    files.push({ path: p, text });
    total += text.length;
  };

  const claudeMd = await fsp.readFile(path.join(base, "CLAUDE.md"), "utf8").catch(() => null);
  if (claudeMd && claudeMd.length <= MAX_FILE) add("CLAUDE.md", claudeMd);

  const projects = await fsp.readdir(path.join(base, "projects"), { withFileTypes: true }).catch(() => []);
  // Global dulu (paling penting bila batas tercapai), lalu proyek lain
  const dirs = projects
    .filter((d) => d.isDirectory() && !/scratch/i.test(d.name))
    .sort((a, b) => Number(b.name.toLowerCase() === home) - Number(a.name.toLowerCase() === home));
  for (const d of dirs) {
    const md = await readMd(path.join(base, "projects", d.name, "memory"));
    if (!md.length) continue;
    const label = d.name.toLowerCase() === home ? "global" : d.name.replace(/^[a-z]--/i, "").slice(0, 80);
    for (const f of md) add(`${label}/${f.name}`, f.text);
  }
  return files;
}

module.exports = { readClaudeMemory };

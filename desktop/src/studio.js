// Roblox Studio untuk mode Alice (admin): app menyalakan StudioMCP resmi Roblox (stdio, JSON-RPC per baris) dan
// meneruskan daftar alat & panggilan alat dari Alice. Studio + plugin MCP-nya harus terbuka di PC ini.
// Windows: %LOCALAPPDATA%\Roblox\mcp.bat (dibuat Studio saat fitur MCP diaktifkan) → StudioMCP.exe.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

const CALL_TIMEOUT_MS = 170_000;
const INIT_TIMEOUT_MS = 20_000;
const PROTOCOL = "2025-06-18";

function launcher() {
  if (process.platform === "win32") {
    const bat = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "Roblox", "mcp.bat");
    return fs.existsSync(bat) ? { command: "cmd.exe", args: ["/d", "/s", "/c", `"${bat}"`] } : null;
  }
  if (process.platform === "darwin") {
    const exe = "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP";
    return fs.existsSync(exe) ? { command: exe, args: [] } : null;
  }
  return null;
}

let child = null;
let ready = null; // Promise inisialisasi
let tools = null;
let nextId = 1;
const pending = new Map();

function stop() {
  for (const p of pending.values()) p.reject(new Error("Roblox Studio MCP berhenti"));
  pending.clear();
  child?.kill();
  child = null;
  ready = null;
  tools = null;
}

function send(msg) {
  child?.stdin.write(`${JSON.stringify(msg)}\n`);
}

function request(method, params, timeoutMs = CALL_TIMEOUT_MS) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Roblox Studio tidak menjawab (${method})`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => (clearTimeout(timer), resolve(v)),
      reject: (e) => (clearTimeout(timer), reject(e)),
    });
    send({ jsonrpc: "2.0", id, method, params });
  });
}

function onMessage(msg) {
  // Balasan untuk permintaan kita
  if (msg.id != null && !msg.method) {
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message || "Galat Roblox Studio MCP"));
    else p.resolve(msg.result);
    return;
  }
  // Permintaan dari server (ping, roots/list, …) → jawab seperlunya supaya tidak menggantung
  if (msg.id != null && msg.method) {
    if (msg.method === "ping") send({ jsonrpc: "2.0", id: msg.id, result: {} });
    else if (msg.method === "roots/list") send({ jsonrpc: "2.0", id: msg.id, result: { roots: [] } });
    else send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Tidak didukung" } });
  }
  // notifications/tools/list_changed → muat ulang daftar alat berikutnya
  if (msg.method === "notifications/tools/list_changed") tools = null;
}

function start() {
  if (ready) return ready;
  const l = launcher();
  if (!l) return Promise.reject(new Error("Roblox Studio MCP belum terpasang (aktifkan MCP di Roblox Studio)"));
  child = spawn(l.command, l.args, { windowsHide: true, windowsVerbatimArguments: process.platform === "win32", stdio: ["pipe", "pipe", "pipe"] });
  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        onMessage(JSON.parse(line));
      } catch {
        // baris log non-JSON
      }
    }
  });
  child.stderr.on("data", () => {}); // log StudioMCP — diabaikan
  child.on("exit", () => {
    child = null;
    stop();
  });
  child.on("error", () => stop());

  ready = (async () => {
    await request(
      "initialize",
      { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "arrr-studio-converter", version: app.getVersion() } },
      INIT_TIMEOUT_MS,
    );
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
  })().catch((e) => {
    stop();
    throw e;
  });
  return ready;
}

/** Daftar alat Studio → [{ name, description, inputSchema }] (StudioMCP dinyalakan bila perlu) */
async function listTools() {
  await start();
  if (!tools) {
    const all = [];
    let cursor;
    do {
      const r = await request("tools/list", cursor ? { cursor } : {}, INIT_TIMEOUT_MS);
      all.push(...(r?.tools ?? []));
      cursor = r?.nextCursor;
    } while (cursor);
    tools = all.map((t) => ({ name: t.name, description: t.description ?? "", inputSchema: t.inputSchema ?? { type: "object" } }));
  }
  return tools;
}

/** Jalankan satu alat → { ok, content: [{ type: "text", text } | { type: "image", data, mimeType }] } */
async function callTool(name, args) {
  await start();
  try {
    const r = await request("tools/call", { name, arguments: args ?? {} });
    return { ok: !r?.isError, content: r?.content ?? [] };
  } catch (e) {
    return { ok: false, content: [{ type: "text", text: e.message }] };
  }
}

const status = () => ({ installed: Boolean(launcher()), running: Boolean(child), tools: tools?.length ?? 0 });

app.on("before-quit", stop);

module.exports = { listTools, callTool, status, stop };

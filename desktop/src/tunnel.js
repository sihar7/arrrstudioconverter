// VPN rumah — app ini menjadi pintu keluar YouTube untuk server ARRR Studio Converter.
// IP server (datacenter) sering ditolak YouTube ("Sign in to confirm you're not a bot"). Lewat terowongan ini
// server membuka koneksi ke YouTube DARI perangkat ini, jadi YouTube melihat IP rumah dan convert web & desktop
// tetap jalan. Perangkat yang menyambung keluar (WebSocket) → tanpa port forwarding / IP publik.
// - Server hanya menerima akun admin aplikasi; akun lain ditolak dan app berhenti mencoba sendiri.
// - Hanya host YouTube/Google port 443; alamat jaringan lokal (LAN, localhost) selalu ditolak.
// - Isi koneksi TLS ujung-ke-ujung antara server & YouTube — app hanya meneruskan byte, tidak bisa membacanya.
// Node murni (tanpa electron) → bisa diuji di luar app; main.js memberi token sesi & menampilkan status.
// Protokol sama dengan BE src/lib/server/media/tunnel.ts: frame [op u8][stream u32][isi] + ACK per stream.
const net = require("node:net");
const dns = require("node:dns/promises");

const OP = { OPEN: 1, OPENED: 2, DATA: 3, END: 4, ERROR: 5, ACK: 6 };
const WINDOW = 1024 * 1024;
const FRAME = 64 * 1024;
const IDLE_MS = 120_000;
// Batas keras perangkat (server boleh mempersempit lewat daftar host di "welcome", tidak bisa memperluas)
const FLOOR = /^(?:[a-z0-9-]+\.)*(?:youtube\.com|googlevideo\.com|ytimg\.com|ggpht\.com|youtube-nocookie\.com|googleapis\.com|google\.com|gstatic\.com)$/i;

/** Alamat internet publik? (tolak LAN, loopback, link-local, CGNAT, multicast) */
function isPublicIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if ((a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)) return false;
    if ((a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19))) return false;
    return true;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v)) return false;
    if (v.startsWith("::ffff:")) return isPublicIp(v.slice(7));
    return true;
  }
  return false;
}

// IPv4 dulu: player YouTube & unduhan stream harus keluar dari IP yang sama (URL stream terikat IP)
async function resolve(host) {
  try {
    return (await dns.lookup(host, { family: 4 })).address;
  } catch {
    return (await dns.lookup(host, { family: 6 })).address;
  }
}

const u32 = (n) => {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
};

/**
 * @param {object} o
 * @param {string} o.appUrl     URL web (alamat WebSocket ditanyakan ke `${appUrl}/api/tunnel/info`)
 * @param {() => Promise<string|null>} o.getToken  nilai cookie sesi login (null = belum masuk)
 * @param {string} o.deviceId   id tetap perangkat ini
 * @param {string} o.name       nama perangkat (tampil di admin)
 * @param {string} o.version    versi app
 * @param {(status: object) => void} [o.onStatus]
 */
function createTunnel({ appUrl, getToken, deviceId, name, version, onStatus = () => {}, log = console }) {
  const sessions = new Set();
  let active = null;
  let running = false;
  let timer = null;
  let attempt = 0;
  let wsUrl = null;
  let totals = { in: 0, out: 0 };
  let status = { state: "off", since: Date.now(), lastError: null };

  const streamsOpen = () => [...sessions].reduce((n, s) => n + s.streams.size, 0);
  const mb = (b) => Math.round((b / 1048576) * 10) / 10;
  const snapshot = () => ({ ...status, streams: streamsOpen(), mbIn: mb(totals.in), mbOut: mb(totals.out), server: wsUrl ? new URL(wsUrl).host : null });

  function setState(state, lastError = status.lastError) {
    if (status.state === state && status.lastError === lastError) return;
    status = { state, since: status.state === state ? status.since : Date.now(), lastError };
    onStatus(snapshot());
  }

  function later(ms) {
    clearTimeout(timer);
    if (running) timer = setTimeout(connect, ms);
  }

  // Putus biasa → coba lagi cepat (1 → 2 → 4 → 8 → 10 dtk): server menunggu VPN rumah maks 25 dtk per job
  const backoff = () => Math.min(10_000, 1000 * 2 ** Math.min(attempt++, 4));

  async function discover() {
    const res = await fetch(`${appUrl}/api/tunnel/info`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (res.status === 404) throw Object.assign(new Error("server belum mendukung VPN rumah"), { old: true });
    if (!res.ok) throw new Error(`info HTTP ${res.status}`);
    const { url } = await res.json();
    if (typeof url !== "string" || !/^wss?:\/\//.test(url)) throw new Error("alamat VPN tidak valid");
    return url;
  }

  let connecting = false;
  async function connect() {
    clearTimeout(timer);
    if (!running || connecting || active) return;
    connecting = true;
    try {
      const token = await getToken().catch(() => null);
      if (!running) return;
      if (!token) {
        setState("logged-out", null);
        return later(60_000); // kick() saat login → langsung menyambung
      }
      if (status.state !== "online") setState("connecting");
      try {
        wsUrl ??= await discover();
      } catch (e) {
        setState("error", e.message);
        return later(e.old ? 10 * 60_000 : backoff());
      }
      if (running && !active) open(wsUrl, token);
    } finally {
      connecting = false;
    }
  }

  function open(url, token) {
    const s = { ws: new WebSocket(url), streams: new Map(), allow: null, draining: false, welcomed: false };
    s.ws.binaryType = "arraybuffer";
    sessions.add(s);
    active = s;

    s.ws.onopen = () => s.ws.send(JSON.stringify({ type: "hello", token, device: deviceId, name, version }));
    s.ws.onmessage = (ev) => {
      if (typeof ev.data === "string") return onControl(s, ev.data);
      onFrame(s, Buffer.from(ev.data));
    };
    s.ws.onerror = () => {};
    s.ws.onclose = (ev) => onClose(s, ev.code, ev.reason);
  }

  function onControl(s, text) {
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.type === "welcome") {
      s.welcomed = true;
      try {
        if (typeof msg.hosts === "string") s.allow = new RegExp(msg.hosts, "i");
      } catch {
        s.allow = null;
      }
      attempt = 0;
      if (s === active) setState("online", null);
      log.log?.(`[vpn] tersambung ke ${new URL(wsUrl).host}`);
    } else if (msg.type === "reconnect" && s === active) {
      // Server lama akan berhenti (deploy): sambung ke server baru sekarang, koneksi lama tetap melayani
      // unduhan yang sedang jalan sampai server lama menutupnya
      s.draining = true;
      active = null;
      connect();
    }
  }

  function onClose(s, code, reason) {
    sessions.delete(s);
    for (const st of s.streams.values()) st.sock.destroy();
    s.streams.clear();
    if (s !== active) return; // koneksi lama yang sedang diserahterimakan
    active = null;
    if (!running) return setState("off", null);
    if (code === 4401) {
      setState("logged-out", null);
      return later(60_000);
    }
    if (code === 4403) {
      // Bukan admin → berhenti mencoba (dicoba lagi saat login dengan akun lain / 30 menit)
      setState("not-admin", null);
      return later(30 * 60_000);
    }
    if (code === 4409) {
      setState("error", "perangkat ini tersambung dari jendela lain");
      return later(60_000);
    }
    if (!s.welcomed) wsUrl = null; // gagal sejak awal → tanyakan alamat server lagi
    setState("error", reason || (code === 1012 ? "server restart" : `terputus (${code})`));
    later(code === 1012 ? 500 : backoff());
  }

  function send(s, op, sid, body) {
    if (s.ws.readyState !== 1) return;
    const head = Buffer.allocUnsafe(5);
    head[0] = op;
    head.writeUInt32BE(sid, 1);
    s.ws.send(body?.length ? Buffer.concat([head, body]) : head);
  }

  function onFrame(s, buf) {
    if (buf.length < 5) return;
    const op = buf[0];
    const sid = buf.readUInt32BE(1);
    const body = buf.subarray(5);
    if (op === OP.OPEN) return void openStream(s, sid, body.toString("utf8"));
    const st = s.streams.get(sid);
    if (!st) return;
    if (op === OP.DATA) {
      const n = body.length;
      totals.out += n;
      // ACK setelah diteruskan ke YouTube → server tidak bisa membanjiri memori perangkat
      st.sock.write(body, (err) => {
        if (!err) send(s, OP.ACK, sid, u32(n));
      });
    } else if (op === OP.ACK && body.length >= 4) {
      st.credit += body.readUInt32BE(0);
      if (st.paused && st.credit > 0) {
        st.paused = false;
        st.sock.resume();
      }
    } else if (op === OP.END) {
      st.remoteEnded = true;
      st.sock.end();
    }
  }

  async function openStream(s, sid, target) {
    const m = /^([a-z0-9.-]+):(\d{1,5})$/i.exec(target);
    const host = m ? m[1].toLowerCase() : "";
    if (!m || m[2] !== "443" || !FLOOR.test(host) || (s.allow && !s.allow.test(host))) {
      return send(s, OP.ERROR, sid, Buffer.from("host ditolak perangkat"));
    }
    let ip;
    try {
      ip = await resolve(host);
    } catch (e) {
      return send(s, OP.ERROR, sid, Buffer.from(`DNS ${e.code || e.message}`));
    }
    if (!isPublicIp(ip)) return send(s, OP.ERROR, sid, Buffer.from("alamat lokal ditolak"));
    if (!sessions.has(s) || s.ws.readyState !== 1) return;

    const sock = net.connect({ host: ip, port: 443 });
    const st = { sock, credit: WINDOW, paused: false, remoteEnded: false, opened: false };
    s.streams.set(sid, st);
    sock.setNoDelay(true);
    sock.setTimeout(IDLE_MS, () => sock.destroy());
    sock.once("connect", () => {
      st.opened = true;
      send(s, OP.OPENED, sid);
    });
    sock.on("data", (chunk) => {
      for (let i = 0; i < chunk.length; i += FRAME) {
        const part = chunk.subarray(i, i + FRAME);
        send(s, OP.DATA, sid, part);
        st.credit -= part.length;
        totals.in += part.length;
      }
      if (st.credit <= 0 && !st.paused) {
        st.paused = true;
        sock.pause();
      }
    });
    sock.on("error", (e) => {
      if (!st.opened) {
        st.remoteEnded = true; // ERROR sudah memberi tahu server, tanpa END
        send(s, OP.ERROR, sid, Buffer.from(e.code || e.message));
      }
    });
    sock.on("close", () => {
      if (s.streams.get(sid) !== st) return;
      s.streams.delete(sid);
      if (!st.remoteEnded) send(s, OP.END, sid);
    });
  }

  return {
    start() {
      if (running) return;
      if (typeof WebSocket === "undefined") return setState("error", "WebSocket tidak tersedia di versi runtime ini");
      running = true;
      attempt = 0;
      connect();
    },
    stop() {
      running = false;
      clearTimeout(timer);
      for (const s of sessions) s.ws.close(1000, "app ditutup");
      active = null;
      setState("off", null);
    },
    /** Login/logout berubah → sambung ulang sekarang (logout = putuskan) */
    kick(loggedOut = false) {
      if (!running) return;
      if (loggedOut && active) {
        active.ws.close(1000, "logout");
        return;
      }
      if (!active) connect();
    },
    status: snapshot,
  };
}

module.exports = { createTunnel, isPublicIp };

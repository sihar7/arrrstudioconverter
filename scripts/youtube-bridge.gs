/**
 * ARRR Studio Converter — Jembatan YouTube (Google Apps Script)
 *
 * YouTube memblokir IP datacenter Vercel ("Sign in to confirm you're not a bot"). Script ini berjalan
 * di server Google (selalu hidup, gratis) dan mengambil data YouTube atas nama converter.
 * Hanya menerima ID video/playlist — bukan proxy bebas.
 *
 * PASANG (sekali):
 * 1. https://script.google.com → New project → hapus isi Code.gs → tempel SELURUH file ini → Save.
 * 2. Deploy → New deployment → ikon gear → Web app.
 *    Execute as: Me · Who has access: Anyone → Deploy → Authorize access (izinkan).
 * 3. Salin "Web app URL" (https://script.google.com/macros/s/…/exec) → tempel ke Url.youtubeBridge (src/Url/Url.ts).
 * Update script: Deploy → Manage deployments → edit (pensil) → Version: New version → Deploy (URL tetap sama).
 *
 * API (GET):  ?info=ID · ?list=ID · ?v=ID&start=BYTE[&itag=N]  →  JSON { ok, ... } / { ok:false, error, code }
 */

var VERSION = 1;
// 6 MB mentah ≈ 8 MB base64 per respons — aman di bawah batas respons Apps Script
var CHUNK = 6 * 1024 * 1024;
var MAX_BYTES = 300 * 1024 * 1024;
var ID_RE = /^[A-Za-z0-9_-]{11}$/;
var LIST_RE = /^[A-Za-z0-9_-]{10,64}$/;
var BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

// Client yang tidak butuh PO token / JS player (sama dengan src/lib/server/media/innertube.ts)
var CLIENTS = [
  {
    name: "ANDROID_VR",
    id: 28,
    ua: "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    ctx: { clientVersion: "1.65.10", deviceMake: "Oculus", deviceModel: "Quest 3", androidSdkVersion: 32, osName: "Android", osVersion: "12L" },
  },
  {
    name: "IOS",
    id: 5,
    ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
    ctx: { clientVersion: "20.10.4", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82" },
  },
  {
    name: "VISIONOS",
    id: 101,
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
    ctx: { clientVersion: "0.1", deviceMake: "Apple", deviceModel: "RealityDevice14,1", osName: "visionOS", osVersion: "1.3.21O771" },
  },
];

function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    if (p.list) out = playlist(check(p.list, LIST_RE));
    else if (p.info) out = info(check(p.info, ID_RE));
    else if (p.v) out = chunk(check(p.v, ID_RE), Math.max(0, Number(p.start) || 0), Number(p.itag) || 0);
    else out = { ping: true };
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err), code: (err && err.code) || "BRIDGE" };
  }
  out.version = VERSION;
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function fail(message, code) {
  var e = new Error(message);
  e.code = code;
  return e;
}

function check(value, re) {
  if (!re.test(value)) throw fail("ID tidak valid", "INVALID_URL");
  return value;
}

// ============================================================
// SESI VISITOR (di-cache 30 menit)
// ============================================================

function visitor(fresh) {
  var cache = CacheService.getScriptCache();
  var cached = !fresh && cache.get("vd");
  if (cached) return cached;
  var headers = { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" };
  var vd = "";
  try {
    var raw = UrlFetchApp.fetch("https://www.youtube.com/sw.js_data", { headers: headers, muteHttpExceptions: true }).getContentText();
    var data = JSON.parse(raw.replace(/^\)\]\}'/, ""));
    vd = data[0][2][0][0][13] || "";
  } catch (err) {
    // jatuh ke halaman utama
  }
  if (!vd) {
    var html = UrlFetchApp.fetch("https://www.youtube.com", { headers: headers, muteHttpExceptions: true }).getContentText();
    var m = html.match(/"VISITOR_DATA":"([^"]+)"/) || html.match(/"visitorData":"([^"]+)"/);
    if (!m) throw fail("visitorData tidak ditemukan", "BRIDGE");
    vd = m[1];
  }
  cache.put("vd", vd, 1800);
  return vd;
}

// ============================================================
// PLAYER
// ============================================================

function player(videoId, client, vd) {
  var ctx = { clientName: client.name, hl: "en", gl: "US", visitorData: vd };
  for (var k in client.ctx) ctx[k] = client.ctx[k];
  var r = UrlFetchApp.fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "post",
    contentType: "application/json",
    headers: {
      "User-Agent": client.ua,
      "X-YouTube-Client-Name": String(client.id),
      "X-YouTube-Client-Version": String(client.ctx.clientVersion),
      "X-Goog-Visitor-Id": vd,
      Origin: "https://www.youtube.com",
    },
    payload: JSON.stringify({ context: { client: ctx }, videoId: videoId, contentCheckOk: true, racyCheckOk: true }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) throw new Error("player HTTP " + r.getResponseCode());
  return JSON.parse(r.getContentText());
}

function audioFormats(formats) {
  return (formats || [])
    .filter(function (f) {
      return f.url && f.mimeType.indexOf("audio/") === 0 && !f.isDrc;
    })
    .sort(function (a, b) {
      var da = a.audioTrack && a.audioTrack.audioIsDefault === false ? 0 : 1;
      var db = b.audioTrack && b.audioTrack.audioIsDefault === false ? 0 : 1;
      return db - da || b.bitrate - a.bitrate;
    });
}

/** Semua client yang lolos, urut sesuai CLIENTS. Error final (private/dihapus) langsung dilempar */
function resolveAll(videoId) {
  var vd = visitor(false);
  var out = [];
  var lastReason = "";
  var refreshed = false;
  for (var i = 0; i < CLIENTS.length; i++) {
    var res;
    try {
      res = player(videoId, CLIENTS[i], vd);
    } catch (err) {
      lastReason = err.message;
      continue;
    }
    var ps = res.playabilityStatus || {};
    var reason = ps.reason || "";
    if (ps.status === "OK") {
      var d = res.videoDetails || {};
      var formats = audioFormats(res.streamingData && res.streamingData.adaptiveFormats);
      if (formats.length) {
        out.push({
          client: CLIENTS[i],
          title: (d.title || videoId).trim(),
          author: (d.author || "").trim(),
          duration: Number(d.lengthSeconds) || 0,
          live: Boolean(d.isLive),
          formats: formats,
        });
      }
      continue;
    }
    lastReason = reason || ps.status || "";
    if (ps.status === "ERROR" || /private video/i.test(reason)) {
      throw fail(/private/i.test(reason) ? "Video private" : "Video tidak tersedia / sudah dihapus", "NOT_FOUND");
    }
    if (/not a bot/i.test(reason) && !refreshed) {
      refreshed = true;
      vd = visitor(true);
      i--;
    }
  }
  if (!out.length) throw fail("YouTube menolak jembatan: " + (lastReason || "tidak ada format audio"), "BRIDGE");
  return out;
}

function info(videoId) {
  var r = resolveAll(videoId)[0];
  return { title: r.title, author: r.author, duration: r.duration, live: r.live };
}

// ============================================================
// UNDUH PER POTONGAN
// Link stream terikat IP peminta & IP Apps Script bisa berganti antar-eksekusi,
// jadi tiap potongan resolve ulang di eksekusi yang sama. itag sama = file sama persis.
// ============================================================

function chunk(videoId, start, itag) {
  var all = resolveAll(videoId);
  var lastErr = "";
  for (var i = 0; i < all.length; i++) {
    var r = all[i];
    var candidates = itag
      ? r.formats.filter(function (f) {
          return f.itag === itag;
        })
      : r.formats.slice(0, 2);
    for (var j = 0; j < candidates.length; j++) {
      var f = candidates[j];
      var total = Number(f.contentLength) || Number((f.url.match(/[?&]clen=(\d+)/) || [])[1]) || 0;
      if (!total) continue;
      if (total > MAX_BYTES) throw fail("File audio terlalu besar", "TOO_LARGE");
      if (start >= total) throw fail("start di luar ukuran file", "BRIDGE");
      var end = Math.min(total, start + CHUNK) - 1;
      var res = UrlFetchApp.fetch(f.url, {
        headers: { Range: "bytes=" + start + "-" + end, "User-Agent": r.client.ua },
        muteHttpExceptions: true,
      });
      var code = res.getResponseCode();
      if (code !== 200 && code !== 206) {
        lastErr = r.client.name + " itag " + f.itag + ": HTTP " + code;
        continue;
      }
      var bytes = res.getContent();
      if (!bytes.length) {
        lastErr = r.client.name + " itag " + f.itag + ": potongan kosong";
        continue;
      }
      return {
        title: r.title,
        author: r.author,
        duration: r.duration,
        live: r.live,
        itag: f.itag,
        mime: f.mimeType,
        total: total,
        start: start,
        data: Utilities.base64Encode(bytes),
      };
    }
  }
  throw fail("Unduhan ditolak YouTube: " + (lastErr || "format tidak ada"), "BRIDGE");
}

// ============================================================
// PLAYLIST (maks. 50 video pertama)
// ============================================================

function playlist(listId) {
  var r = UrlFetchApp.fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
    method: "post",
    contentType: "application/json",
    headers: { "User-Agent": BROWSER_UA },
    payload: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "en", gl: "US" } },
      browseId: "VL" + listId,
    }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() === 404) throw fail("Playlist kosong / private", "NOT_FOUND");
  if (r.getResponseCode() !== 200) throw fail("browse HTTP " + r.getResponseCode(), "BRIDGE");
  var data = JSON.parse(r.getContentText());
  var items = [];
  var seen = {};
  walk(data, function (key, v) {
    if (items.length >= 50) return true;
    if (key === "lockupViewModel" && v.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" && ID_RE.test(v.contentId || "")) {
      if (!seen[v.contentId]) {
        seen[v.contentId] = true;
        var meta = (v.metadata && v.metadata.lockupMetadataViewModel) || {};
        items.push({ videoId: v.contentId, title: (meta.title && meta.title.content) || v.contentId, duration: badgeSeconds(v) });
      }
      return true;
    }
    if (key === "playlistVideoRenderer" && ID_RE.test(v.videoId || "") && v.isPlayable !== false) {
      if (!seen[v.videoId]) {
        seen[v.videoId] = true;
        items.push({
          videoId: v.videoId,
          title: (v.title && v.title.runs && v.title.runs[0] && v.title.runs[0].text) || v.videoId,
          duration: Number(v.lengthSeconds) || null,
        });
      }
      return true;
    }
    return false;
  });
  if (!items.length) throw fail("Playlist kosong / private", "NOT_FOUND");
  var md = data.metadata && data.metadata.playlistMetadataRenderer;
  return { title: (md && md.title) || "Playlist", items: items };
}

/** Jalan rekursif; cb(key, value) → true = jangan masuk lebih dalam */
function walk(o, cb) {
  if (Array.isArray(o)) {
    for (var i = 0; i < o.length; i++) walk(o[i], cb);
  } else if (o && typeof o === "object") {
    for (var k in o) {
      if (o[k] && typeof o[k] === "object" && cb(k, o[k])) continue;
      walk(o[k], cb);
    }
  }
}

/** Durasi dari badge thumbnail ("3:55" / "1:02:03") */
function badgeSeconds(v) {
  var m = JSON.stringify(v.contentImage || {}).match(/"text":"(\d+(?::\d{2}){1,2})"/);
  if (!m) return null;
  return m[1].split(":").reduce(function (s, n) {
    return s * 60 + Number(n);
  }, 0);
}

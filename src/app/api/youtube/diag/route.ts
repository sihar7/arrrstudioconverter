import { ok } from "@/lib/server/http";

// SEMENTARA: diagnostik jalur YouTube dari IP server (video tetap, tanpa input user). Hapus setelah selesai.

const VID = "kJQP7kiw5Fk";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

const CLIENTS: [string, number, string, Record<string, string | number>][] = [
  ["ANDROID_VR", 28, "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip", { clientVersion: "1.65.10", deviceMake: "Oculus", deviceModel: "Quest 3", androidSdkVersion: 32, osName: "Android", osVersion: "12L" }],
  ["IOS", 5, "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)", { clientVersion: "20.10.4", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82" }],
  ["VISIONOS", 101, UA, { clientVersion: "0.1", deviceMake: "Apple", deviceModel: "RealityDevice14,1", osName: "visionOS", osVersion: "1.3.21O771" }],
  ["TVHTML5", 7, "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version", { clientVersion: "7.20250923.13.00" }],
  ["WEB_EMBEDDED_PLAYER", 56, UA, { clientVersion: "1.20250923.21.00" }],
  ["MWEB", 2, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", { clientVersion: "2.20250925.01.00" }],
];

export const GET = async () => {
  const out: Record<string, unknown> = {};
  let vd = "";
  try {
    const r = await fetch("https://www.youtube.com/sw.js_data", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    const txt = await r.text();
    out.sw = r.status;
    vd = JSON.parse(txt.replace(/^\)\]\}'/, ""))[0][2][0][0][13] ?? "";
    out.visitor = vd.slice(0, 12);
  } catch (e) {
    out.swErr = (e as Error).message;
  }
  for (const host of ["https://www.youtube.com", "https://youtubei.googleapis.com"]) {
    for (const [name, id, ua, ctx] of CLIENTS) {
      try {
        const r = await fetch(`${host}/youtubei/v1/player?prettyPrint=false`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": ua, "X-YouTube-Client-Name": String(id), "X-YouTube-Client-Version": String(ctx.clientVersion), ...(vd ? { "X-Goog-Visitor-Id": vd } : {}) },
          body: JSON.stringify({ context: { client: { clientName: name, ...ctx, hl: "en", gl: "US", ...(vd ? { visitorData: vd } : {}) }, ...(name === "WEB_EMBEDDED_PLAYER" ? { thirdParty: { embedUrl: "https://www.google.com/" } } : {}) }, videoId: VID, contentCheckOk: true, racyCheckOk: true }),
          signal: AbortSignal.timeout(10_000),
        });
        const j = (await r.json().catch(() => ({}))) as { playabilityStatus?: { status?: string; reason?: string }; streamingData?: { adaptiveFormats?: { url?: string; mimeType: string }[] } };
        const a = j.streamingData?.adaptiveFormats?.find((f) => f.mimeType.startsWith("audio/") && f.url);
        let dl: number | string = "-";
        if (a?.url) dl = (await fetch(a.url, { headers: { Range: "bytes=0-65535", "User-Agent": ua }, signal: AbortSignal.timeout(10_000) })).status;
        out[`${host.includes("googleapis") ? "api" : "www"}:${name}`] = `${r.status} ${j.playabilityStatus?.status ?? ""} ${(j.playabilityStatus?.reason ?? "").slice(0, 60)} dl=${dl}`;
      } catch (e) {
        out[`${host}:${name}`] = (e as Error).message;
      }
    }
  }
  return ok(out);
};

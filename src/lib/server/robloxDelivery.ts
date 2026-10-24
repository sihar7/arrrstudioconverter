import "server-only";
import Url from "@/Url/Url";
import { config } from "./config";
import { AppError } from "./http";

// Unduh isi aset Roblox untuk Spoof (upload ulang ke akun / grup sendiri).
// Akses mengikuti aturan Roblox: Open Cloud hanya memberi aset yang boleh diakses pemilik API key
// (milik sendiri / grup pemilik key), fallback publik hanya untuk aset publik. Tidak ada bypass.

const ALLOWED_HOSTS = ["roblox.com", "rbxcdn.com"];

export type SpoofKind = "audio" | "animation";

export interface DownloadedAsset {
  bytes: Buffer;
  kind: SpoofKind | "other";
  mime: string;
  ext: string;
  sourceId: string;
}

const AUDIO_SIGS: [string | number[], string, string][] = [
  ["OggS", "audio/ogg", "ogg"],
  ["fLaC", "audio/flac", "flac"],
  ["ID3", "audio/mpeg", "mp3"],
  [[0xff, 0xfb], "audio/mpeg", "mp3"],
  [[0xff, 0xf3], "audio/mpeg", "mp3"],
  [[0xff, 0xf2], "audio/mpeg", "mp3"],
];

export function detect(bytes: Buffer): Omit<DownloadedAsset, "bytes" | "sourceId"> {
  for (const [sig, mime, ext] of AUDIO_SIGS) {
    const head = typeof sig === "string" ? Buffer.from(sig, "latin1") : Buffer.from(sig);
    if (bytes.subarray(0, head.length).equals(head)) return { kind: "audio", mime, ext };
  }
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WAVE") {
    return { kind: "audio", mime: "audio/wav", ext: "wav" };
  }
  const head = bytes.subarray(0, 64).toString("latin1").replace(/^﻿|^\xEF\xBB\xBF/, "");
  if (head.startsWith("<roblox")) {
    const binary = head.startsWith("<roblox!");
    // Cari nama class animasi di isi file (binary: tabel INST berisi nama class sebagai teks)
    const text = bytes.toString("latin1");
    const isAnim = text.includes("KeyframeSequence") || text.includes("CurveAnimation");
    return {
      kind: isAnim ? "animation" : "other",
      mime: "model/x-rbxm",
      ext: binary ? "rbxm" : "rbxmx",
    };
  }
  return { kind: "other", mime: "application/octet-stream", ext: "bin" };
}

function pickLocation(json: Record<string, unknown>): string | null {
  if (typeof json.location === "string") return json.location;
  const list = json.locations as { location?: string }[] | undefined;
  return list?.find((l) => typeof l.location === "string")?.location ?? null;
}

function deliveryHint(status: number, msg: string) {
  if (status === 401) return "API key tidak valid / IP belum diizinkan";
  if (status === 403 && /scope|insufficient/i.test(msg)) return "API key belum punya scope legacy-asset:manage";
  if (status === 404) return "Asset ID tidak ditemukan";
  if (status === 429) return "Kena rate limit Roblox, coba lagi sebentar";
  if (/not authorized|forbidden|403/i.test(msg) || status === 403) {
    return "Aset private ini bukan milik pemilik API key. Roblox hanya mengizinkan aset milikmu sendiri (aset grup → pakai API key grup) atau aset publik";
  }
  if (/not approved|moderat/i.test(msg)) return "Aset masih direview / ditolak moderasi Roblox";
  return msg || `HTTP ${status}`;
}

async function getJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* bukan JSON */
  }
  return { status: res.status, json, text };
}

async function resolveLocation(apiKey: string, assetId: string): Promise<string> {
  const cloud = await getJson(`${Url.robloxDelivery}/${assetId}`, { "x-api-key": apiKey }).catch(() => null);
  const loc = cloud && cloud.status === 200 ? pickLocation(cloud.json) : null;
  if (loc) return loc;

  // Fallback: hanya aset publik (tanpa autentikasi)
  const pub = await getJson(`${Url.robloxDeliveryPublic}/${assetId}`, { Accept: "application/json" }).catch(() => null);
  const pubLoc = pub && pub.status === 200 ? pickLocation(pub.json) : null;
  if (pubLoc) return pubLoc;

  const errors = cloud?.json.errors as { message?: string }[] | undefined;
  const msg = String(cloud?.json.message ?? errors?.[0]?.message ?? "");
  throw new AppError(`Gagal mengambil aset ${assetId}: ${deliveryHint(cloud?.status ?? 0, msg)}`, 422, "ROBLOX_DELIVERY");
}

async function fetchLocation(url: string): Promise<Buffer> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new AppError("Lokasi unduhan aset tidak valid", 502);
  }
  const host = u.hostname.toLowerCase();
  // Cegah SSRF: hanya https ke domain Roblox
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new AppError("Lokasi unduhan aset tidak valid", 502);
  }
  const res = await fetch(u, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new AppError(`Gagal mengunduh file aset (HTTP ${res.status})`, 502);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > config.limits.robloxMaxBytes) throw new AppError("File aset lebih dari 20 MB", 422, "TOO_BIG");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > config.limits.robloxMaxBytes) throw new AppError("File aset lebih dari 20 MB", 422, "TOO_BIG");
  return buf;
}

/** ID aset di dalam XML (mis. Sound/Decal model): rbxassetid://123 atau asset/?id=123 */
function innerAssetId(bytes: Buffer): string | null {
  const m = bytes.subarray(0, 200_000).toString("latin1").match(/(?:asset\/?\?id=|rbxassetid:\/\/)(\d{1,20})/i);
  return m ? m[1] : null;
}

export async function downloadAsset(apiKey: string, assetId: string, want: SpoofKind, depth = 0): Promise<DownloadedAsset> {
  const bytes = await fetchLocation(await resolveLocation(apiKey, assetId));
  const info = detect(bytes);

  // Model berisi Sound → ikuti ID audio di dalamnya (sekali)
  if (want === "audio" && info.kind !== "audio" && depth === 0) {
    const inner = innerAssetId(bytes);
    if (inner && inner !== assetId) return downloadAsset(apiKey, inner, want, 1);
  }
  if (info.kind !== want) {
    throw new AppError(
      want === "audio" ? `Aset ${assetId} bukan audio` : `Aset ${assetId} bukan animasi (KeyframeSequence)`,
      422,
      "WRONG_KIND",
    );
  }
  return { bytes, ...info, sourceId: assetId };
}

/** Nama aset (hanya bisa untuk aset yang boleh dibaca pemilik key) — null kalau tidak bisa */
export async function assetName(apiKey: string, assetId: string): Promise<string | null> {
  const r = await getJson(`${Url.robloxAssets}/assets/${assetId}`, { "x-api-key": apiKey }).catch(() => null);
  const name = r?.status === 200 ? r.json.displayName : null;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

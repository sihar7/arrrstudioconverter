import "server-only";
import { randomBytes } from "node:crypto";
import Url from "@/Url/Url";
import { AppError } from "./http";
import type { ModerationState } from "@/type/history";

// Roblox Open Cloud. API key milik user TIDAK pernah disimpan / di-log — hanya diteruskan.
// Scope yang dipakai: asset:read, asset:write, asset-permissions:write (opsional untuk izin).

type Json = Record<string, unknown>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const headers = (apiKey: string, extra: Record<string, string> = {}) => ({ "x-api-key": apiKey, ...extra });

async function call(url: string, init: RequestInit): Promise<{ status: number; json: Json; text: string }> {
  let res!: Response;
  // 429 / 5xx / jaringan sesaat → ulangi maks 2x (hormati Retry-After). Upload (POST) hanya diulang saat 429
  // karena 5xx/timeout bisa berarti Roblox sudah menerima file → mencegah aset dobel.
  const idempotent = !init.method || init.method === "GET";
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
    } catch {
      if (idempotent && attempt < 2) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw new AppError("Tidak bisa terhubung ke Roblox, coba lagi", 502, "ROBLOX_NETWORK");
    }
    if ((res.status === 429 || (idempotent && res.status >= 500)) && attempt < 2) {
      const after = Number(res.headers.get("retry-after"));
      await res.body?.cancel();
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 10) * 1000 : 1000 * 2 ** attempt);
      continue;
    }
    break;
  }
  const text = await res.text();
  let json: Json = {};
  try {
    json = text ? (JSON.parse(text) as Json) : {};
  } catch {
    /* bukan JSON */
  }
  return { status: res.status, json, text };
}

function errMsg(json: Json, text: string): string {
  const e = json.error as Json | undefined;
  const errors = json.errors as Json[] | undefined;
  const msg = (json.message ?? errors?.[0]?.message ?? e?.message ?? e?.code) as string | undefined;
  return msg || text.replace(/<[^>]+>/g, "").slice(0, 200) || "tanpa pesan";
}

function hint(status: number, msg: string) {
  if (/scope|permission/i.test(msg) || status === 403) {
    return " — cek scope API key (asset:read, asset:write, asset-permissions:write) dan pemilik key";
  }
  if (status === 401) return " — API key tidak valid / IP belum diizinkan";
  if (status === 429) return " — kena rate limit Roblox, coba sebentar lagi";
  return "";
}

// ============================================================
// API KEY
// ============================================================

export interface KeyInfo {
  ok: boolean;
  name: string | null;
  ownerId: string | null;
  enabled: boolean | null;
  expired: boolean | null;
  scopes: string[];
  missing: string[];
}

const REQUIRED = ["asset:read", "asset:write"];
const OPTIONAL = ["asset-permissions:write", "legacy-asset:manage", "user.inventory-item:read", "creator-store-product:write"];

export async function introspect(apiKey: string): Promise<KeyInfo & { missingOptional: string[] }> {
  const r = await call(Url.robloxIntrospect, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  if (r.status === 400 || r.status === 401 || r.status === 403) {
    throw new AppError(`API key ditolak Roblox: ${errMsg(r.json, r.text)}`, 400, "ROBLOX_KEY");
  }
  if (r.status !== 200) throw new AppError(`Gagal cek API key (HTTP ${r.status})`, 502, "ROBLOX");

  // scopes: [{name:"asset", operations:["read","write"]}, ...]
  const scopes = new Set<string>();
  for (const s of (r.json.scopes as Json[] | undefined) ?? []) {
    const name = String(s.name ?? s.scopeType ?? "").replace(/^universe-places$/, "universe-places");
    for (const op of ((s.operations ?? s.permissions) as string[] | undefined) ?? []) {
      scopes.add(String(op).includes(":") ? String(op) : `${name}:${op}`);
    }
  }
  const list = [...scopes];
  const missing = list.length ? REQUIRED.filter((x) => !scopes.has(x)) : [];
  const enabled = typeof r.json.enabled === "boolean" ? r.json.enabled : null;
  const expired = typeof r.json.expired === "boolean" ? r.json.expired : null;
  return {
    ok: enabled !== false && expired !== true && missing.length === 0,
    name: (r.json.name as string) ?? null,
    ownerId: r.json.authorizedUserId != null ? String(r.json.authorizedUserId) : null,
    enabled,
    expired,
    scopes: list,
    missing,
    missingOptional: list.length ? OPTIONAL.filter((x) => !scopes.has(x)) : [],
  };
}

// ============================================================
// UPLOAD AUDIO
// ============================================================

export interface UploadResult {
  assetId: string | null;
  operationId: string | null;
}

function operationResult(json: Json): UploadResult {
  if (json.error) throw new AppError(`Upload gagal: ${errMsg(json.error as Json, "")}`, 422, "ROBLOX_UPLOAD");
  const response = json.response as Json | undefined;
  if (json.done && response?.assetId) return { assetId: String(response.assetId), operationId: null };
  let op = json.operationId as string | undefined;
  if (!op && typeof json.path === "string") op = json.path.split("/").pop();
  if (!op) throw new AppError("Respons Roblox tidak dikenali", 502, "ROBLOX");
  return { assetId: null, operationId: op };
}

export type AssetType = "Audio" | "Animation";

// Content-Type yang diterima Open Cloud per ekstensi
const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
};

type Part = { name: string; value: string } | { name: string; filename: string; type: string; value: Buffer };

function multipart(parts: Part[]): { body: Buffer; contentType: string } {
  const boundary = `----arrc${randomBytes(12).toString("hex")}`;
  const chunks: Buffer[] = [];
  for (const p of parts) {
    const head =
      "filename" in p
        ? `Content-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\nContent-Type: ${p.type}\r\n\r\n`
        : `Content-Disposition: form-data; name="${p.name}"\r\n\r\n`;
    chunks.push(Buffer.from(`--${boundary}\r\n${head}`), typeof p.value === "string" ? Buffer.from(p.value) : p.value, Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

export async function uploadAudio(
  apiKey: string,
  file: { bytes: Buffer; mime: string; ext: string },
  meta: { displayName: string; description: string; creatorType: "user" | "group"; creatorId: string },
): Promise<UploadResult> {
  return uploadAsset(apiKey, "Audio", file, meta);
}

export async function uploadAsset(
  apiKey: string,
  assetType: AssetType,
  file: { bytes: Buffer; mime: string; ext: string },
  meta: { displayName: string; description: string; creatorType: "user" | "group"; creatorId: string },
): Promise<UploadResult> {
  const request = {
    assetType,
    displayName: meta.displayName.replace(/[^\p{L}\p{N} _.\-()]/gu, "").slice(0, 50) || assetType,
    description: meta.description.slice(0, 1000) || "Uploaded via ARRR Studio Converter",
    creationContext: {
      creator: meta.creatorType === "group" ? { groupId: meta.creatorId } : { userId: meta.creatorId },
    },
  };
  // Multipart dirakit manual: `request` WAJIB field teks biasa (Blob → dikirim sebagai file → Roblox membalas
  // "Request body cannot be empty"), dan body berupa Buffer utuh supaya Content-Length pasti (bukan chunked).
  const { body, contentType } = multipart([
    { name: "request", value: JSON.stringify(request) },
    { name: "fileContent", filename: `asset.${file.ext}`, type: CONTENT_TYPES[file.ext] ?? file.mime, value: file.bytes },
  ]);

  const r = await call(`${Url.robloxAssets}/assets`, {
    method: "POST",
    headers: headers(apiKey, { "Content-Type": contentType, "Content-Length": String(body.length) }),
    body: new Uint8Array(body),
  });
  if (r.status < 200 || r.status >= 300) {
    const msg = errMsg(r.json, r.text);
    throw new AppError(`Upload ditolak Roblox (HTTP ${r.status}): ${msg}${hint(r.status, msg)}`, 422, "ROBLOX_UPLOAD");
  }
  return operationResult(r.json);
}

export async function getOperation(apiKey: string, operationId: string): Promise<UploadResult> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(operationId)) throw new AppError("Operation ID tidak valid", 400);
  const r = await call(`${Url.robloxAssets}/operations/${operationId}`, { headers: headers(apiKey) });
  if (r.status !== 200) {
    const msg = errMsg(r.json, r.text);
    throw new AppError(`Gagal cek status upload (HTTP ${r.status}): ${msg}${hint(r.status, msg)}`, 422, "ROBLOX");
  }
  return operationResult(r.json);
}

/** Tunggu sebentar sampai upload menghasilkan asset ID */
export async function waitOperation(apiKey: string, res: UploadResult, maxMs = 12_000): Promise<UploadResult> {
  const deadline = Date.now() + maxMs;
  let cur = res;
  while (!cur.assetId && cur.operationId && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    cur = await getOperation(apiKey, cur.operationId);
  }
  return cur;
}

// ============================================================
// MODERASI
// ============================================================

export async function moderationState(apiKey: string, assetId: string): Promise<ModerationState> {
  const r = await call(`${Url.robloxAssets}/assets/${assetId}`, { headers: headers(apiKey) });
  if (r.status === 429) throw new AppError("Rate limit Roblox — cek lagi nanti", 429, "RATE_LIMIT");
  if (r.status !== 200) {
    const msg = errMsg(r.json, r.text);
    throw new AppError(`Gagal cek status aset (HTTP ${r.status}): ${msg}${hint(r.status, msg)}`, 422, "ROBLOX");
  }
  const state = (r.json.moderationResult as Json | undefined)?.moderationState;
  return state === "Approved" || state === "Rejected" ? state : "Reviewing";
}

// ============================================================
// IZIN PAKAI (Asset Permissions API)
// ============================================================

/** Place ID → Universe ID (endpoint publik) */
export async function universeFromPlace(placeId: string): Promise<string | null> {
  const r = await call(`${Url.robloxUniverses}/${placeId}/universe`, { headers: { Accept: "application/json" } }).catch(
    () => null,
  );
  const id = r?.json.universeId;
  return r?.status === 200 && id != null ? String(id) : null;
}

const GRANT_CODES: Record<string, string> = {
  CannotManageAsset: "Aset bukan milik pemilik API key (aset grup → pakai API key grup)",
  // Batasan Roblox: izin hanya bisa diberikan ke game yang BISA DIEDIT pemilik API key
  CannotManageSubject:
    "Roblox hanya mengizinkan game yang bisa kamu edit — minta pemilik map menambahkanmu sebagai kolaborator (edit), atau jadikan audio publik lewat Creator Store",
  SubjectNotFound: "Game tidak ditemukan — cek Place ID",
  AssetNotFound: "Asset ID tidak ditemukan",
  AssetTypeNotEnabled:
    "Roblox belum mengizinkan audio dijadikan publik lewat API — pakai 'Distribute on Creator Store' di Creator Dashboard",
  PermissionLimitReached: "Batas jumlah izin aset ini sudah tercapai",
};

export interface GrantResult {
  granted: string[];
  failed: Record<string, string>;
  universeId: string | null;
}

// ============================================================
// PUBLIK (Creator Store Products, scope creator-store-product:write)
// ============================================================

const FREE = { currencyCode: "USD", quantity: { significand: 0, exponent: 0 } };

function publicReason(status: number, msg: string): string {
  if (status === 401 || status === 403 || /scope|permission|forbidden/i.test(msg)) {
    return `Tambahkan scope creator-store-product:write ke API key (Creator Dashboard → Credentials) — ${msg}`;
  }
  if (/verif|publishing requirements|seller/i.test(msg)) {
    // Roblox hanya membuka distribusi publik untuk efek suara; musik/lagu tetap privat untuk akun biasa
    return "Roblox hanya mengizinkan EFEK SUARA jadi publik — musik/lagu tidak bisa dipublikasikan akun biasa. Pakai izin place (game milikmu / tempat kamu kolaborator)";
  }
  if (/moderat|review|pending/i.test(msg)) return `Audio masih direview Roblox — coba lagi setelah Disetujui (${msg})`;
  return `HTTP ${status}: ${msg}`;
}

/** Satu audio → produk gratis & published di Creator Store (buat baru; kalau sudah ada → update) */
async function publishOne(apiKey: string, assetId: string): Promise<string | null> {
  const product = { audioAssetId: assetId, published: true, basePrice: FREE };
  const h = headers(apiKey, { "Content-Type": "application/json" });
  const created = await call(Url.robloxCreatorStore, { method: "POST", headers: h, body: JSON.stringify(product) });
  if (created.status >= 200 && created.status < 300) return null;
  if (created.status === 401 || created.status === 403) return publicReason(created.status, errMsg(created.json, created.text));

  // Pernah didistribusikan → PATCH (allowMissing = buat kalau ternyata belum ada)
  const q = new URLSearchParams({ allowMissing: "true", updateMask: "published,basePrice" });
  const updated = await call(`${Url.robloxCreatorStore}/CreatorMarketplaceAsset-Audio-${assetId}?${q}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify(product),
  });
  if (updated.status >= 200 && updated.status < 300) return null;
  // Tampilkan pesan create kalau PATCH tidak memberi info lebih jelas
  const r = updated.status === 404 ? created : updated;
  return publicReason(r.status, errMsg(r.json, r.text));
}

async function distributePublic(apiKey: string, assetIds: string[], parallel = 4): Promise<GrantResult> {
  const failed: Record<string, string> = {};
  let next = 0;
  const worker = async () => {
    while (next < assetIds.length) {
      const id = assetIds[next++];
      const reason = await publishOne(apiKey, id).catch((e: Error) => e.message);
      if (reason) failed[id] = reason;
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, assetIds.length) }, worker));
  return { granted: assetIds.filter((id) => !failed[id]), failed, universeId: null };
}

export async function grantPermission(
  apiKey: string,
  assetIds: string[],
  target: { mode: "place"; placeId: string } | { mode: "public" },
): Promise<GrantResult> {
  // Publik = distribusi gratis di Creator Store (Asset Permissions API menolak subject "All")
  if (target.mode === "public") return distributePublic(apiKey, assetIds);

  let universeId: string | null = null;
  if (target.mode === "place") {
    universeId = await universeFromPlace(target.placeId);
    if (!universeId) throw new AppError("Place ID tidak ditemukan", 404, "PLACE_NOT_FOUND");
  }

  const body = {
    subjectType: "Universe",
    subjectId: universeId ?? undefined,
    action: "Use",
    requests: assetIds.map((id) => ({ assetId: Number(id), grantToDependencies: true })),
  };
  const r = await call(Url.robloxPermissions, {
    method: "PATCH",
    headers: headers(apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  const failed: Record<string, string> = {};
  if (r.status < 200 || r.status >= 300) {
    const code = String((r.json.error as Json | undefined)?.code ?? "");
    const msg = errMsg(r.json, r.text);
    const reason = GRANT_CODES[code] ?? `HTTP ${r.status}: ${msg}${hint(r.status, msg)}`;
    for (const id of assetIds) failed[id] = reason;
    return { granted: [], failed, universeId };
  }

  for (const e of (r.json.errors as Json[] | undefined) ?? []) {
    const id = String(e.assetId ?? "");
    const code = String(e.code ?? "");
    if (!id || code === "PublicAssetCannotBeGrantedTo") continue;
    failed[id] = GRANT_CODES[code] ?? (String(e.message ?? "") || code || "ditolak");
  }
  return { granted: assetIds.filter((id) => !failed[id]), failed, universeId };
}

// ============================================================
// AUDIO SAYA (library) — daftar audio milik pemilik API key
// ============================================================

export interface LibraryAsset {
  assetId: string;
  name: string | null;
  state: ModerationState | null;
  creatorType: "user" | "group" | null;
  creatorId: string | null;
  archived: boolean;
  error: string | null;
}

/**
 * Audio di inventory user (Open Cloud Inventory, scope user.inventory-item:read).
 * Aset yang diupload user otomatis ada di inventory-nya → dipakai sebagai daftar "audio saya".
 */
export async function listUserAudio(
  apiKey: string,
  userId: string,
  pageToken?: string,
): Promise<{ assetIds: string[]; nextPageToken: string | null }> {
  const q = new URLSearchParams({ maxPageSize: "50", filter: "inventoryItemAssetTypes=AUDIO" });
  if (pageToken) q.set("pageToken", pageToken);
  const r = await call(`${Url.robloxInventory}/${userId}/inventory-items?${q}`, { headers: headers(apiKey) });
  if (r.status === 401 || r.status === 403) {
    throw new AppError(
      "API key belum punya scope user.inventory-item:read (atau bukan milik user ini) — tambahkan di Creator Dashboard",
      400,
      "ROBLOX_SCOPE",
    );
  }
  if (r.status !== 200) {
    const msg = errMsg(r.json, r.text);
    throw new AppError(`Gagal memuat audio (HTTP ${r.status}): ${msg}${hint(r.status, msg)}`, 502, "ROBLOX");
  }
  const ids = new Set<string>();
  for (const it of (r.json.inventoryItems as Json[] | undefined) ?? []) {
    const id = (it.assetDetails as Json | undefined)?.assetId;
    if (id != null) ids.add(String(id));
  }
  return { assetIds: [...ids], nextPageToken: (r.json.nextPageToken as string) || null };
}

/** Detail aset (nama, moderasi, pemilik) — paralel terbatas supaya tidak kena rate limit */
export async function assetDetails(apiKey: string, assetIds: string[], parallel = 8): Promise<LibraryAsset[]> {
  const out: LibraryAsset[] = new Array(assetIds.length);
  let next = 0;
  const worker = async () => {
    while (next < assetIds.length) {
      const i = next++;
      const assetId = assetIds[i];
      const r = await call(`${Url.robloxAssets}/assets/${assetId}`, { headers: headers(apiKey) }).catch((e: Error) => ({
        status: 0,
        json: {} as Json,
        text: e.message,
      }));
      if (r.status !== 200) {
        out[i] = { assetId, name: null, state: null, creatorType: null, creatorId: null, archived: false, error: errMsg(r.json, r.text) };
        continue;
      }
      const creator = ((r.json.creationContext as Json | undefined)?.creator ?? {}) as Json;
      const mod = (r.json.moderationResult as Json | undefined)?.moderationState;
      out[i] = {
        assetId,
        name: (r.json.displayName as string) ?? null,
        state: mod === "Approved" || mod === "Rejected" ? mod : "Reviewing",
        creatorType: creator.groupId ? "group" : creator.userId ? "user" : null,
        creatorId: creator.groupId != null ? String(creator.groupId) : creator.userId != null ? String(creator.userId) : null,
        archived: r.json.state === "Archived",
        error: null,
      };
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, assetIds.length) }, worker));
  return out;
}

/**
 * Arsipkan / pulihkan aset (Open Cloud, scope asset:write). Roblox tidak punya hapus permanen lewat API —
 * arsip = aset ditarik & berhenti bisa dipakai di game (sama dengan tombol Archive di Creator Dashboard).
 */
export async function setArchived(
  apiKey: string,
  assetIds: string[],
  archive: boolean,
  parallel = 5,
): Promise<{ done: string[]; failed: Record<string, string> }> {
  const done: string[] = [];
  const failed: Record<string, string> = {};
  let next = 0;
  const worker = async () => {
    while (next < assetIds.length) {
      const id = assetIds[next++];
      const r = await call(`${Url.robloxAssets}/assets/${id}:${archive ? "archive" : "restore"}`, {
        method: "POST",
        headers: headers(apiKey, { "Content-Type": "application/json" }),
        body: "{}",
      }).catch((e: Error) => ({ status: 0, json: {} as Json, text: e.message }));
      if (r.status >= 200 && r.status < 300) done.push(id);
      else {
        const msg = errMsg(r.json, r.text);
        failed[id] = `HTTP ${r.status}: ${msg}${hint(r.status, msg)}`;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, assetIds.length) }, worker));
  return { done, failed };
}

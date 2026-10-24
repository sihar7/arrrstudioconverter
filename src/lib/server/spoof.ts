import "server-only";
import { z } from "zod";
import { spoofSchema } from "@/lib/schemas/convert.schema";
import { AppError } from "./http";
import { config } from "./config";
import { downloadAsset, assetName } from "./robloxDelivery";
import { grantPermission, uploadAsset, waitOperation } from "./roblox";
import { saveBytes } from "./storage";
import { addSpoof, newSpoofId, updateSpoof } from "./spoofStore";
import type { SpoofPermission, SpoofRecord } from "@/type/spoof";

type SpoofInput = z.infer<typeof spoofSchema>;

const ASSET_TYPE = { audio: "Audio", animation: "Animation" } as const;

/**
 * Spoof = download aset (audio/animation) milikmu / publik lalu upload ulang jadi ID baru
 * di akun/grup pemilik API key. Akses tunduk pada Open Cloud: tidak menembus aset private
 * orang lain. Animasi yang ditolak upload disediakan sebagai file .rbxm.
 */
export async function runSpoof(uid: string, owner: string, input: SpoofInput): Promise<SpoofRecord> {
  if (input.permission === "place" && !input.placeId) throw new AppError("Isi Place ID untuk izin place", 422);

  const asset = await downloadAsset(input.apiKey, input.sourceId, input.kind);
  if (asset.bytes.length > config.limits.robloxMaxBytes) {
    throw new AppError("File aset lebih dari 20 MB", 422, "TOO_BIG");
  }

  const name = input.name || (await assetName(input.apiKey, input.sourceId)) || `${ASSET_TYPE[input.kind]} ${input.sourceId}`;

  const id = newSpoofId();
  const base: SpoofRecord = {
    id,
    createdAt: Date.now(),
    kind: input.kind,
    sourceId: input.sourceId,
    name,
    creatorType: input.creatorType,
    creatorId: input.creatorId,
    assetId: null,
    operationId: null,
    fileId: null,
    error: null,
    permission: null,
  };

  let result: { assetId: string | null; operationId: string | null };
  try {
    result = await waitOperation(
      input.apiKey,
      await uploadAsset(
        input.apiKey,
        ASSET_TYPE[input.kind],
        { bytes: asset.bytes, mime: asset.mime, ext: asset.ext },
        { displayName: name, description: `Spoof dari ${input.sourceId}`, creatorType: input.creatorType, creatorId: input.creatorId },
      ),
    );
  } catch (e) {
    // Animasi kadang ditolak upload Open Cloud → sediakan file .rbxm untuk import manual di Studio
    if (input.kind === "animation") {
      const file = await saveBytes(asset.bytes, { owner, ext: asset.ext, mime: asset.mime, title: name });
      const rec = { ...base, fileId: file.fileId, error: e instanceof AppError ? e.message : "Upload animasi ditolak Roblox" };
      await addSpoof(uid, rec);
      return rec;
    }
    throw e;
  }

  let permission: SpoofPermission | null = null;
  if (result.assetId && input.permission !== "none") {
    const target =
      input.permission === "place" ? { mode: "place" as const, placeId: input.placeId! } : { mode: "public" as const };
    try {
      const g = await grantPermission(input.apiKey, [result.assetId], target);
      const failed = g.failed[result.assetId];
      permission = {
        mode: input.permission,
        placeId: input.permission === "place" ? input.placeId! : null,
        status: failed ? "failed" : "granted",
        message: failed ?? null,
      };
    } catch (e) {
      permission = {
        mode: input.permission,
        placeId: input.permission === "place" ? input.placeId! : null,
        status: "failed",
        message: e instanceof Error ? e.message : "Gagal memberi izin",
      };
    }
  }

  const rec: SpoofRecord = { ...base, assetId: result.assetId, operationId: result.operationId, permission };
  await addSpoof(uid, rec);
  return rec;
}

/** Cek operasi upload spoof yang masih diproses → isi asset ID + terapkan izin tertunda */
export async function refreshSpoofOperation(uid: string, apiKey: string, rec: SpoofRecord): Promise<SpoofRecord> {
  if (rec.assetId || !rec.operationId) return rec;
  const { getOperation } = await import("./roblox");
  const op = await getOperation(apiKey, rec.operationId);
  if (!op.assetId) return rec;

  let permission = rec.permission;
  if (rec.permission?.status === "pending") {
    const target =
      rec.permission.mode === "place" ? { mode: "place" as const, placeId: rec.permission.placeId! } : { mode: "public" as const };
    const g = await grantPermission(apiKey, [op.assetId], target);
    const failed = g.failed[op.assetId];
    permission = { ...rec.permission, status: failed ? "failed" : "granted", message: failed ?? null };
  }
  return updateSpoof(uid, rec.id, (r) => ({ ...r, assetId: op.assetId, operationId: null, permission }));
}

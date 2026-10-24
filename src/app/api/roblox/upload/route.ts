import { robloxUploadSchema, ROBLOX_FORMATS } from "@/lib/schemas/convert.schema";
import { config } from "@/lib/server/config";
import { AppError, handle, ok, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { findFile, readBytes } from "@/lib/server/storage";
import { uploadAudio, waitOperation } from "@/lib/server/roblox";
import { updateHistory } from "@/lib/server/history";
import { applyPendingPermissions, withPermission } from "@/lib/server/robloxFlow";

export const maxDuration = 120;

// Upload hasil konversi ke Roblox (Open Cloud) + izin place/publik opsional
export const POST = handle(async (req) => {
  const { user, owner } = await requireUser(req);
  await rateLimit("rbxup", user.id, 120, 3600);
  const body = robloxUploadSchema.parse(await readJson(req));
  if (body.permission === "place" && !body.placeId) throw new AppError("Isi Place ID untuk izin place", 422);

  const meta = await findFile(body.fileId, owner);
  if (!(ROBLOX_FORMATS as readonly string[]).includes(meta.format)) {
    throw new AppError("Roblox hanya menerima MP3, OGG, WAV, atau FLAC", 422, "FORMAT");
  }
  if (meta.size > config.limits.robloxMaxBytes) {
    throw new AppError("File lebih dari 20 MB — pakai MP3/OGG atau bitrate lebih kecil", 422, "TOO_BIG");
  }

  const bytes = await readBytes(meta);
  const res = await waitOperation(
    body.apiKey,
    await uploadAudio(
      body.apiKey,
      { bytes, mime: meta.mime, ext: meta.format },
      {
        displayName: body.displayName,
        description: body.description,
        creatorType: body.creatorType,
        creatorId: body.creatorId,
      },
    ),
  );

  let entry = null;
  if (body.historyId) {
    entry = await updateHistory(user.id, body.historyId, (e) => {
      const next = {
        ...e,
        roblox: {
          assetId: res.assetId,
          operationId: res.operationId,
          displayName: body.displayName,
          creatorType: body.creatorType,
          creatorId: body.creatorId,
          state: res.assetId ? ("Reviewing" as const) : ("Processing" as const),
          error: null,
          permissions: [],
          uploadedAt: Date.now(),
          checkedAt: null,
        },
      };
      return body.permission === "none"
        ? next
        : withPermission(next, body.permission, body.permission === "place" ? body.placeId! : null);
    });
    if (res.assetId && body.permission !== "none") {
      entry = await applyPendingPermissions(body.apiKey, user.id, body.historyId);
    }
  }

  return ok({ assetId: res.assetId, operationId: res.operationId, entry });
});

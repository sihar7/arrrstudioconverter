import { robloxPermissionSchema } from "@/lib/schemas/convert.schema";
import { AppError, handle, ok, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { grantPermission } from "@/lib/server/roblox";
import { getHistory, updateHistory } from "@/lib/server/history";
import { applyPendingPermissions, withPermission } from "@/lib/server/robloxFlow";

// Izinkan aset dipakai di place tertentu, atau jadikan publik
export const POST = handle(async (req) => {
  const { user } = await requireUser(req);
  await rateLimit("rbxperm", user.id, 30, 60);
  const body = robloxPermissionSchema.parse(await readJson(req));
  if (body.mode === "place" && !body.placeId) throw new AppError("Isi Place ID", 422);
  const placeId = body.mode === "place" ? body.placeId! : null;

  // Massal dari riwayat (mis. "Jadikan publik" banyak sekaligus) — berurutan agar tidak kena rate limit
  if (body.historyIds?.length) {
    const entries = [];
    for (const id of body.historyIds) {
      const entry = await getHistory(user.id, id).catch(() => null);
      if (!entry?.roblox?.assetId) continue;
      await updateHistory(user.id, id, (e) => withPermission(e, body.mode, placeId));
      entries.push(await applyPendingPermissions(body.apiKey, user.id, id));
    }
    return ok({ entries });
  }

  // Dari riwayat: catat sebagai pending lalu terapkan (ikut tersimpan di riwayat)
  if (body.historyId) {
    const entry = await getHistory(user.id, body.historyId);
    if (!entry.roblox?.assetId) throw new AppError("Aset belum selesai diupload", 409, "NOT_READY");
    await updateHistory(user.id, body.historyId, (e) => withPermission(e, body.mode, placeId));
    const next = await applyPendingPermissions(body.apiKey, user.id, body.historyId);
    return ok({ entry: next });
  }

  const target = body.mode === "place" ? { mode: "place" as const, placeId: placeId! } : { mode: "public" as const };
  return ok(await grantPermission(body.apiKey, body.assetIds, target));
});

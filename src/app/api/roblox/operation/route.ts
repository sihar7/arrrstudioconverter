import { z } from "zod";
import { handle, ok, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { getOperation } from "@/lib/server/roblox";
import { updateHistory } from "@/lib/server/history";
import { applyPendingPermissions } from "@/lib/server/robloxFlow";

const schema = z.object({
  apiKey: z.string().min(20).max(4000),
  operationId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  historyId: z.string().regex(/^[a-f0-9]{16}$/).optional(),
});

// Cek upload yang belum selesai; begitu asset ID ada → simpan & terapkan izin yang menunggu
export const POST = handle(async (req) => {
  const { user } = await requireUser(req);
  await rateLimit("rbxop", user.id, 60, 60);
  const { apiKey, operationId, historyId } = schema.parse(await readJson(req));

  const res = await getOperation(apiKey, operationId);
  let entry = null;
  if (historyId && res.assetId) {
    await updateHistory(user.id, historyId, (e) =>
      e.roblox ? { ...e, roblox: { ...e.roblox, assetId: res.assetId, operationId: null, state: "Reviewing" } } : e,
    );
    entry = await applyPendingPermissions(apiKey, user.id, historyId);
  }
  return ok({ assetId: res.assetId, operationId: res.operationId, entry });
});

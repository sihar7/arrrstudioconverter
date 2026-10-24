import { z } from "zod";
import { handle, ok, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { getOperation, moderationState } from "@/lib/server/roblox";
import { getHistory, updateHistory } from "@/lib/server/history";
import { applyPendingPermissions } from "@/lib/server/robloxFlow";
import type { HistoryEntry } from "@/type/history";

const schema = z.object({
  apiKey: z.string().min(20).max(4000),
  historyIds: z.array(z.string().regex(/^[a-f0-9]{16}$/)).min(1).max(25),
});

// Perbarui status review (moderasi) aset Roblox di riwayat
export const POST = handle(async (req) => {
  const { user } = await requireUser(req);
  await rateLimit("rbxstat", user.id, 20, 60);
  const { apiKey, historyIds } = schema.parse(await readJson(req));

  const entries: HistoryEntry[] = [];
  const errors: Record<string, string> = {};
  for (const id of historyIds) {
    try {
      let e = await getHistory(user.id, id);
      if (!e.roblox) continue;

      if (!e.roblox.assetId && e.roblox.operationId) {
        const op = await getOperation(apiKey, e.roblox.operationId);
        if (op.assetId) {
          await updateHistory(user.id, id, (x) => ({
            ...x,
            roblox: x.roblox && { ...x.roblox, assetId: op.assetId, operationId: null, state: "Reviewing" },
          }));
          e = await applyPendingPermissions(apiKey, user.id, id);
        }
      }
      if (e.roblox?.assetId) {
        const state = await moderationState(apiKey, e.roblox.assetId);
        e = await updateHistory(user.id, id, (x) => ({
          ...x,
          roblox: x.roblox && { ...x.roblox, state, checkedAt: Date.now() },
        }));
        // Baru lolos review → terapkan izin yang menunggu (mis. publik untuk upload baru)
        if (state === "Approved" && e.roblox?.permissions.some((p) => p.status === "pending")) {
          e = await applyPendingPermissions(apiKey, user.id, id);
        }
      }
      entries.push(e);
    } catch (err) {
      errors[id] = (err as Error).message;
      if ((err as { code?: string }).code === "RATE_LIMIT") break;
    }
  }
  return ok({ entries, errors });
});

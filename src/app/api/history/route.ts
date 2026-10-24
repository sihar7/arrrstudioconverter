import { handle, ok } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { clearHistory, listHistory } from "@/lib/server/history";

export const GET = handle(async (req) => {
  const { user } = await requireUser(req);
  return ok({ items: await listHistory(user.id) }, { headers: { "Cache-Control": "no-store" } });
});

export const DELETE = handle(async (req) => {
  const { user } = await requireUser(req);
  await clearHistory(user.id);
  return ok({ ok: true });
});

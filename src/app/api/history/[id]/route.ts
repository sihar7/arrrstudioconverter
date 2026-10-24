import { AppError, handle, ok } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { removeHistory } from "@/lib/server/history";

export const DELETE = handle<RouteContext<"/api/history/[id]">>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{16}$/.test(id)) throw new AppError("ID tidak valid", 400);
  const { user } = await requireUser(req);
  await removeHistory(user.id, id);
  return ok({ ok: true });
});

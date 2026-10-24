import { handle, ok } from "@/lib/server/http";
import { destroySession } from "@/lib/server/identity";

export const POST = handle(async (req) => {
  const res = ok({ ok: true });
  await destroySession(req, res);
  return res;
});

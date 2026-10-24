import { z } from "zod";
import { handle, ok, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { introspect } from "@/lib/server/roblox";

const schema = z.object({ apiKey: z.string().min(20).max(4000) });

// Cek API key Roblox: aktif, pemilik (User ID), scope yang kurang
export const POST = handle(async (req) => {
  const { user } = await requireUser(req);
  await rateLimit("rbxkey", user.id, 20, 60);
  const { apiKey } = schema.parse(await readJson(req));
  return ok(await introspect(apiKey));
});

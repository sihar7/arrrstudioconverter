import { robloxArchiveSchema } from "@/lib/schemas/convert.schema";
import { handle, ok, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { setArchived } from "@/lib/server/roblox";

export const maxDuration = 60;

// Arsipkan (hapus dari pemakaian) / pulihkan audio milik sendiri — maks 50 per request
export const POST = handle(async (req) => {
  const { user } = await requireUser(req);
  await rateLimit("rbxarch", user.id, 20, 60);
  const body = robloxArchiveSchema.parse(await readJson(req));
  return ok(await setArchived(body.apiKey, [...new Set(body.assetIds)], body.archive));
});

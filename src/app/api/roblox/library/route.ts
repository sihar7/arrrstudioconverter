import { robloxLibrarySchema } from "@/lib/schemas/convert.schema";
import { AppError, handle, ok, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { assetDetails, listUserAudio } from "@/lib/server/roblox";

export const maxDuration = 60;

// Audio milik sendiri: dari inventory user (per halaman 50) atau daftar asset ID manual
export const POST = handle(async (req) => {
  const { user } = await requireUser(req);
  await rateLimit("rbxlib", user.id, 60, 60);
  const body = robloxLibrarySchema.parse(await readJson(req));

  if (body.assetIds?.length) {
    return ok({ assets: await assetDetails(body.apiKey, [...new Set(body.assetIds)]), nextPageToken: null });
  }
  if (body.creatorType === "group") {
    throw new AppError("Inventory grup tidak tersedia di Open Cloud — tempel asset ID audio grup secara manual", 422, "GROUP_MANUAL");
  }
  const page = await listUserAudio(body.apiKey, body.creatorId, body.pageToken);
  return ok({ assets: await assetDetails(body.apiKey, page.assetIds), nextPageToken: page.nextPageToken });
});

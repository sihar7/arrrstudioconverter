import { z } from "zod";
import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/server/http";
import { requireUser } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { getProfile } from "@/lib/server/robloxProfile";

const schema = z.object({ type: z.enum(["user", "group"]), id: z.string().regex(/^\d{1,20}$/) });

// Profil publik Roblox (avatar, nama, badge) untuk kartu akun di Pengaturan
export const GET = handle(async (req: NextRequest) => {
  const { user } = await requireUser(req);
  await rateLimit("rbxprof", user.id, 60, 60);
  const q = schema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return ok({ profile: await getProfile(q.type, q.id) }, { headers: { "Cache-Control": "private, max-age=600" } });
});

import { config, devLoginEnabled, discordEnabled } from "@/lib/server/config";
import { handle, ok } from "@/lib/server/http";
import { attachGuest, identify } from "@/lib/server/identity";
import { getQuota } from "@/lib/server/quota";
import type { MeResponse } from "@/type/auth";

export const GET = handle(async (req) => {
  const id = await identify(req);
  const body: MeResponse = {
    user: id.user,
    quota: await getQuota(id),
    auth: {
      discordEnabled: discordEnabled(),
      devLogin: devLoginEnabled(),
      guildRequired: Boolean(config.discord.guildId),
      inviteUrl: config.discord.inviteUrl,
    },
  };
  return attachGuest(ok(body, { headers: { "Cache-Control": "no-store" } }), id);
});

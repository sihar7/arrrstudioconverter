import { handle, ok } from "@/lib/server/http";
import { identify } from "@/lib/server/identity";
import { getJob, toPublic } from "@/lib/server/jobs";

export const GET = handle<RouteContext<"/api/jobs/[id]">>(async (req, ctx) => {
  const { id } = await ctx.params;
  const who = await identify(req);
  const job = await getJob(id, who.owner);
  return ok({ job: toPublic(job) }, { headers: { "Cache-Control": "no-store" } });
});

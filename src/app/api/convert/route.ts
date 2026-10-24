import { after } from "next/server";
import { createJobSchema } from "@/lib/schemas/convert.schema";
import { handle, ok, readJson } from "@/lib/server/http";
import { attachGuest, identify } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { consumeQuota, getQuota, guestKeySnapshot, refundQuota } from "@/lib/server/quota";
import { createJob, runJob, toPublic } from "@/lib/server/jobs";

// Vercel: konversi jalan di after() pada invocation ini → butuh durasi fungsi panjang
export const maxDuration = 300;

export const POST = handle(async (req) => {
  const id = await identify(req);
  // Rem burst (kuota tetap jadi batas utama) — per pemilik & per IP agar guest tidak bisa ganti cookie
  await rateLimit("conv", id.owner, 20, 60);
  await rateLimit("convip", id.ipHash, 40, 60);
  const { videoId, options } = createJobSchema.parse(await readJson(req));

  await consumeQuota(id);
  const keys = guestKeySnapshot(id);
  let job;
  try {
    job = await createJob(id.owner, videoId, options);
  } catch (e) {
    await refundQuota(id.owner, keys);
    throw e;
  }

  after(() => runJob(job.id, keys));
  return attachGuest(ok({ job: toPublic(job), quota: await getQuota(id) }, { status: 202 }), id);
});

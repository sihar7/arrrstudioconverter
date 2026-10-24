import { config } from "@/lib/server/config";
import { AppError, handle, ok } from "@/lib/server/http";
import { cleanupExpired } from "@/lib/server/storage";

// Vercel Cron (lihat vercel.json) — hapus file hasil yang sudah kedaluwarsa dari Blob
export const GET = handle(async (req) => {
  const auth = req.headers.get("authorization");
  if (!config.cronSecret || auth !== `Bearer ${config.cronSecret}`) throw new AppError("Unauthorized", 401);
  return ok(await cleanupExpired());
});

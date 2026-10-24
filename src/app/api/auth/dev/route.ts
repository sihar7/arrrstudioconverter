import { devLoginEnabled } from "@/lib/server/config";
import { AppError, handle, ok } from "@/lib/server/http";
import { createSession, setSessionCookie } from "@/lib/server/identity";

// Login percobaan untuk development saja — mati otomatis di production / saat Discord dikonfigurasi
export const POST = handle(async () => {
  if (!devLoginEnabled()) throw new AppError("Tidak tersedia", 404, "NOT_FOUND");
  const sid = await createSession({
    id: "100000000000000001",
    username: "dev.arr",
    displayName: "Dev ArrStudio",
    avatarUrl: null,
    loginAt: Date.now(),
  });
  const res = ok({ ok: true });
  setSessionCookie(res, sid);
  return res;
});

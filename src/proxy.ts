import { NextResponse, type NextRequest } from "next/server";

/**
 * /api/* diteruskan ke backend (rewrite di next.config.ts). Di sini: header identitas klien yang bisa dipercaya BE.
 * Header x-arr-edge / x-arr-ip dari browser selalu dibuang lalu diisi ulang → klien tidak bisa memalsukan IP.
 * EDGE_SECRET harus sama dengan env BE; kosong = header tidak dikirim (BE memakai perilaku lama).
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("x-arr-edge");
  headers.delete("x-arr-ip");
  const secret = process.env.EDGE_SECRET;
  if (secret) {
    // Di Vercel x-forwarded-for ditimpa edge dengan IP klien asli (tidak bisa dipalsukan dari browser)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    headers.set("x-arr-edge", secret);
    if (ip) headers.set("x-arr-ip", ip);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: "/api/:path*",
};

// Penanda build yang sedang disajikan server (diprerender per deploy). Klien membandingkannya dengan
// NEXT_PUBLIC_BUILD_ID di bundle-nya sendiri → beda = ada versi web baru (lihat UpdateWatcher).
export function GET() {
  return Response.json({ id: process.env.NEXT_PUBLIC_BUILD_ID ?? "" }, { headers: { "Cache-Control": "no-store" } });
}

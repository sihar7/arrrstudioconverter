import { handle } from "@/lib/server/http";
import { identify } from "@/lib/server/identity";
import { findFile, openFile } from "@/lib/server/storage";

function parseRange(header: string | null, size: number) {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return null;
  let start = m[1] ? Number(m[1]) : size - Number(m[2]);
  let end = m[1] && m[2] ? Number(m[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  return start <= end ? { start, end } : null;
}

const disposition = (kind: "attachment" | "inline", filename: string) => {
  const ascii = filename.replace(/[^A-Za-z0-9 ._()-]+/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

// Unduh (?dl=1) atau putar (preview, mendukung Range untuk seek di storage lokal)
export const GET = handle<RouteContext<"/api/files/[id]">>(async (req, ctx) => {
  const { id } = await ctx.params;
  const who = await identify(req);
  const meta = await findFile(id, who.owner);

  const range = meta.blobPath ? null : parseRange(req.headers.get("range"), meta.size);
  const file = await openFile(meta, range);
  const headers = new Headers({
    "Content-Type": meta.mime,
    "Content-Length": String(file.length),
    "Content-Disposition": disposition(req.nextUrl.searchParams.get("dl") ? "attachment" : "inline", meta.filename),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": meta.blobPath ? "none" : "bytes",
  });
  if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${meta.size}`);
  return new Response(file.stream, { status: file.partial ? 206 : 200, headers });
});

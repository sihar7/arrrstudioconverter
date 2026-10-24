import { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { AppError, handle } from "@/lib/server/http";
import { identify } from "@/lib/server/identity";
import { findFile, openFile, type FileMeta } from "@/lib/server/storage";

export const maxDuration = 120;

// Gabung banyak hasil jadi satu ZIP (stream, tanpa kompresi — audio sudah terkompres)
export const GET = handle(async (req) => {
  const who = await identify(req);
  const ids = [...new Set((req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean))].slice(0, 50);
  if (!ids.length) throw new AppError("Tidak ada file dipilih", 400);

  const metas: FileMeta[] = [];
  for (const id of ids) {
    const m = await findFile(id, who.owner).catch(() => null);
    if (m) metas.push(m);
  }
  if (!metas.length) throw new AppError("Semua file sudah kedaluwarsa — convert ulang", 404, "FILE_GONE");

  const zip = new ZipArchive({ store: true });
  zip.on("warning", (e: Error) => console.warn("[zip]", e.message));

  const used = new Set<string>();
  void (async () => {
    try {
      for (const m of metas) {
        let name = m.filename;
        for (let n = 2; used.has(name.toLowerCase()); n++) name = m.filename.replace(/(\.\w+)$/, ` (${n})$1`);
        used.add(name.toLowerCase());
        const { stream } = await openFile(m, null);
        zip.append(Readable.fromWeb(stream as import("node:stream/web").ReadableStream), { name });
      }
      await zip.finalize();
    } catch (e) {
      zip.abort();
      console.error("[zip]", e);
    }
  })();

  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  return new Response(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="arrstudio-audio-${stamp}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
});

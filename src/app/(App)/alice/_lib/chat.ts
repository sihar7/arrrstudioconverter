"use client";

import { withBase } from "@/Url/Url";
import { getDesktop, type StudioContent } from "@/type/desktop";
import { alice, getAlice, replyText, type Msg, type Part, type Usage } from "./store";

// Kirim pesan ke BE /api/alice/chat lalu baca balasan SSE → pesan jawaban di store.
// Delta dikumpulkan dan diterapkan sekali per frame (bukan per token) supaya UI tetap ringan.

type Event =
  | { t: "delta"; text: string }
  | { t: "thinking"; text: string }
  | { t: "tool_start"; id: string; name: string; title: string }
  | { t: "tool_end"; id: string; ok: boolean; text: string }
  | { t: "client_tool"; id: string; name: string; input: unknown }
  /** lokal: gambar hasil alat Studio (screenshot) untuk ditampilkan di chat */
  | { t: "tool_images"; id: string; images: string[] }
  | { t: "done"; truncated?: boolean; usage?: Usage }
  | { t: "error"; error: string };

const running = new Map<string, AbortController>();

export const isStreaming = (convId: string | null) => Boolean(convId && running.has(convId));

export function stop(convId: string) {
  running.get(convId)?.abort();
}

/** Terapkan satu event ke daftar bagian jawaban */
function apply(parts: Part[], e: Event): Part[] {
  const last = parts.at(-1);
  switch (e.t) {
    case "thinking":
      if (last?.k === "thinking" && !last.done) return [...parts.slice(0, -1), { ...last, text: last.text + e.text }];
      return [...parts, { k: "thinking", text: e.text, done: false }];
    case "delta": {
      const closed = closeThinking(parts);
      const tail = closed.at(-1);
      if (tail?.k === "text") return [...closed.slice(0, -1), { k: "text", text: tail.text + e.text }];
      return [...closed, { k: "text", text: e.text }];
    }
    case "tool_start":
      return [...closeThinking(parts), { k: "tool", id: e.id, name: e.name, title: e.title, done: false }];
    case "tool_end":
      return parts.map((p) => (p.k === "tool" && p.id === e.id ? { ...p, done: true, ok: e.ok, output: e.text } : p));
    case "tool_images":
      return parts.map((p) => (p.k === "tool" && p.id === e.id ? { ...p, images: [...(p.images ?? []), ...e.images].slice(0, 6) } : p));
    default:
      return parts;
  }
}

const closeThinking = (parts: Part[]) => parts.map((p) => (p.k === "thinking" && !p.done ? { ...p, done: true } : p));

type Block = { type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

// Gambar dikirim ulang tiap giliran (API tanpa state) → hanya yang terbaru, sisanya diganti catatan
const MAX_IMAGES = 16;

function imageBlock(dataUrl: string): Block | null {
  const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/.exec(dataUrl);
  return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null;
}

/** Riwayat untuk server: teks (+ gambar user terbaru); jawaban kosong/gagal dilewati */
function history(msgs: Msg[]) {
  const out: { role: "user" | "assistant"; content: string | Block[] }[] = [];
  let budget = MAX_IMAGES;
  // Dari yang terbaru ke terlama supaya jatah gambar jatuh ke pesan terakhir
  for (const m of [...msgs].reverse()) {
    if (m.role === "assistant") {
      const text = replyText(m);
      if (text.trim()) out.push({ role: "assistant", content: text });
      continue;
    }
    const text = m.text?.trim() ?? "";
    const imgs = m.images ?? [];
    const keep = imgs.slice(0, Math.max(0, budget));
    budget -= keep.length;
    const blocks = keep.map(imageBlock).filter((b): b is Block => b !== null);
    const note = imgs.length > keep.length ? `[${imgs.length - keep.length} gambar sebelumnya tidak dikirim ulang]` : "";
    const body = [note, text].filter(Boolean).join("\n");
    if (blocks.length) out.push({ role: "user", content: body ? [...blocks, { type: "text", text: body }] : blocks });
    else if (body) out.push({ role: "user", content: body });
  }
  return out.reverse();
}

/** Alat Roblox Studio dari app desktop (bila disambungkan) → definisi untuk server */
async function studioTools() {
  const s = getAlice();
  const studio = getDesktop()?.studio;
  if (!s.studio || !studio) return { tools: [], error: null as string | null };
  try {
    const list = await studio.listTools();
    return { tools: list.slice(0, 60).map((t) => ({ name: t.name, description: t.description.slice(0, 4000), input_schema: t.inputSchema })), error: null };
  } catch (e) {
    return { tools: [], error: (e as Error).message };
  }
}

/** Hasil MCP → blok konten Claude (teks / gambar; jenis lain jadi teks JSON) */
function toBlocks(content: StudioContent[]): Block[] {
  return content.flatMap((c): Block[] => {
    if (c.type === "text" && typeof c.text === "string") return [{ type: "text", text: c.text.slice(0, 200_000) }];
    if (c.type === "image" && typeof c.data === "string" && /^image\/(png|jpeg|gif|webp)$/.test(String(c.mimeType)) && c.data.length < 6_500_000) {
      return [{ type: "image", source: { type: "base64", media_type: String(c.mimeType), data: c.data } }];
    }
    return [{ type: "text", text: JSON.stringify(c).slice(0, 20_000) }];
  });
}

/** Jalankan alat Studio di PC ini lalu kirim hasilnya ke server (yang sedang menunggu) → gambar hasilnya (data URL) */
async function runClientTool(id: string, name: string, input: unknown): Promise<string[]> {
  const studio = getDesktop()?.studio;
  const out = studio ? await studio.call(name, input) : { ok: false, content: [{ type: "text", text: "Roblox Studio tidak tersambung di app ini" }] };
  await fetch(withBase("/api/alice/tool-result"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ id, ok: out.ok, content: toBlocks(out.content as StudioContent[]).slice(0, 20) }),
  }).catch(() => {});
  return (out.content as StudioContent[]).flatMap((c) =>
    c.type === "image" && typeof c.data === "string" && String(c.mimeType).startsWith("image/") ? [`data:${String(c.mimeType)};base64,${c.data}`] : [],
  );
}

export async function send(text: string, images: string[] = []) {
  const s = getAlice();
  if (isStreaming(s.activeId)) return;
  const { convId, replyId } = alice.ask(text, images);
  const conv = getAlice().convs.find((c) => c.id === convId)!;
  const ctrl = new AbortController();
  running.set(convId, ctrl);

  let queue: Event[] = [];
  let frame = 0;
  const flush = () => {
    frame = 0;
    const batch = queue;
    queue = [];
    if (batch.length) alice.patchMsg(convId, replyId, (m) => ({ ...m, parts: batch.reduce(apply, m.parts ?? []) }));
  };
  const push = (...e: Event[]) => {
    queue.push(...e);
    frame ||= requestAnimationFrame(flush);
  };
  const finish = (patch: Partial<Msg>) => {
    if (frame) cancelAnimationFrame(frame);
    flush();
    alice.patchMsg(convId, replyId, (m) => ({ ...m, parts: closeThinking(m.parts ?? []), live: false, ...patch }));
  };

  try {
    const studio = await studioTools();
    // Studio diminta tapi gagal menyala → beri tahu di jawaban, chat tetap jalan tanpa alat Studio
    if (studio.error) push({ t: "tool_start", id: "studio-off", name: "studio", title: "Roblox Studio" }, { t: "tool_end", id: "studio-off", ok: false, text: studio.error });
    const res = await fetch(withBase("/api/alice/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ model: conv.model, effort: conv.effort, messages: history(conv.msgs.slice(0, -1)), clientTools: studio.tools }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const err = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
      return finish({ error: err?.error ?? `Gagal (${res.status})`, errorCode: err?.code });
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    let ended = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let cut: number;
      while ((cut = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const e = JSON.parse(line.slice(6)) as Event;
        if (e.t === "done") {
          ended = true;
          finish(e.truncated ? { note: "truncated" } : {});
          if (e.usage) alice.setUsage(convId, e.usage);
        } else if (e.t === "error") {
          ended = true;
          finish({ error: e.error });
        } else if (e.t === "client_tool") {
          const toolId = e.id;
          void runClientTool(toolId, e.name, e.input).then((images) => images.length && push({ t: "tool_images", id: toolId, images }));
        }
        else push(e);
      }
    }
    if (!ended) finish({ error: "Koneksi terputus sebelum jawaban selesai." });
  } catch (e) {
    if ((e as Error).name === "AbortError") finish({ note: "stopped" });
    else finish({ error: "Tidak bisa terhubung ke server." });
  } finally {
    running.delete(convId);
  }
}

/** Ulangi jawaban terakhir */
export function retry(convId: string) {
  if (isStreaming(convId)) return;
  const q = alice.dropLastReply(convId);
  if (q) void send(q.text, q.images);
}

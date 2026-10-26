/**
 * Runtime AI di perangkat (onnxruntime-web): WebGPU bila ada, jatuh ke WASM.
 * Model diunduh SEKALI dari Hugging Face lalu disimpan di Cache Storage → kunjungan berikutnya instan & offline.
 * Gambar user tidak pernah dikirim ke server.
 */
import type { InferenceSession } from "onnxruntime-web";
import { withBase } from "@/Url/Url";

export interface ModelDef {
  id: string;
  url: string;
  /** perkiraan ukuran unduhan (byte) — untuk teks progres sebelum header Content-Length datang */
  bytes: number;
}

export const MODELS = {
  // ORMBG (Apache-2.0, basis ISNet) — terkuantisasi int8, 1024×1024, keluaran mask 1 kanal
  removeBg: {
    id: "ormbg-int8",
    url: "https://huggingface.co/onnx-community/ormbg-ONNX/resolve/main/onnx/model_quantized.onnx",
    bytes: 44_300_000,
  },
  // Real-ESRGAN general x4v3 (BSD-3-Clause) — SRVGGNetCompact, input RGB 0–1 NCHW dinamis → 4×
  upscale: {
    id: "realesr-general-x4v3",
    url: "https://huggingface.co/jonathanst29/tinier-upscale-models/resolve/main/realesr-general-x4v3.onnx",
    bytes: 4_900_000,
  },
} satisfies Record<string, ModelDef>;

export type Backend = "webgpu" | "wasm";

const CACHE = "arrr-ai-models-v1";
type Ort = typeof import("onnxruntime-web");
let ortPromise: Promise<Ort> | null = null;
export interface LoadedModel {
  session: InferenceSession;
  backend: Backend;
}
const sessions = new Map<string, Promise<LoadedModel>>();

/** Muat onnxruntime-web sekali (dynamic import → tidak membebani halaman lain) */
export function loadOrt(): Promise<Ort> {
  ortPromise ??= import("onnxruntime-web/webgpu").then((ort) => {
    ort.env.wasm.wasmPaths = withBase("/ort/");
    // Tanpa cross-origin isolation SharedArrayBuffer tidak ada → 1 thread (hindari peringatan & percobaan gagal)
    ort.env.wasm.numThreads = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
    ort.env.logLevel = "error";
    return ort as unknown as Ort;
  });
  return ortPromise;
}

/** Unduh model dengan progres (0–1), pakai Cache Storage bila sudah pernah diunduh */
async function fetchModel(model: ModelDef, onProgress?: (p: number) => void): Promise<Uint8Array> {
  const cache = typeof caches !== "undefined" ? await caches.open(CACHE).catch(() => null) : null;
  const hit = await cache?.match(model.url);
  if (hit) {
    onProgress?.(1);
    return new Uint8Array(await hit.arrayBuffer());
  }
  const res = await fetch(model.url);
  if (!res.ok || !res.body) throw new Error(`model HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || model.bytes;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(Math.min(0.99, got / total));
  }
  const bytes = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) {
    bytes.set(c, off);
    off += c.length;
  }
  await cache?.put(model.url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } })).catch(() => {});
  onProgress?.(1);
  return bytes;
}

/** Sesi model (di-cache per model selama tab terbuka). Mengembalikan juga backend yang dipakai. */
export function getSession(model: ModelDef, onProgress?: (p: number) => void): Promise<LoadedModel> {
  let s = sessions.get(model.id);
  if (!s) {
    s = (async () => {
      const [ort, bytes] = await Promise.all([loadOrt(), fetchModel(model, onProgress)]);
      const hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;
      if (hasGpu) {
        try {
          const session = await ort.InferenceSession.create(bytes, { executionProviders: ["webgpu"], graphOptimizationLevel: "all" });
          return { session, backend: "webgpu" as const };
        } catch {
          /* GPU tidak mendukung salah satu operator → WASM */
        }
      }
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      return { session, backend: "wasm" as const };
    })();
    sessions.set(model.id, s);
    s.catch(() => sessions.delete(model.id)); // gagal (offline) → boleh dicoba lagi
  } else {
    void s.then(() => onProgress?.(1));
  }
  return s;
}

export async function isModelCached(model: ModelDef) {
  if (sessions.has(model.id)) return true;
  try {
    return Boolean(await (await caches.open(CACHE)).match(model.url));
  } catch {
    return false;
  }
}

export const formatMb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;

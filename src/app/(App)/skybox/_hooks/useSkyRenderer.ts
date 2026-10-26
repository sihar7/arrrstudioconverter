"use client";

import { useEffect, useState, type RefObject } from "react";
import { SkyRenderer } from "../_lib/skyGl";

export type RendererError = "webgl" | "lost" | null;

/** Satu SkyRenderer per canvas; dibuang (konteks GL dilepas) saat halaman ditinggal */
export function useSkyRenderer(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [renderer, setRenderer] = useState<SkyRenderer | null>(null);
  const [error, setError] = useState<RendererError>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let r: SkyRenderer;
    try {
      r = new SkyRenderer(canvas);
    } catch (e) {
      // setState di luar badan efek sinkron — kegagalan WebGL2 dilaporkan sekali saat mount
      console.error("[skybox] renderer gagal dibuat:", e);
      queueMicrotask(() => setError("webgl"));
      return;
    }
    const onLost = (e: Event) => {
      e.preventDefault();
      setError("lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    queueMicrotask(() => setRenderer(r));
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      setRenderer(null);
      r.dispose();
    };
  }, [canvasRef]);

  return { renderer, error };
}

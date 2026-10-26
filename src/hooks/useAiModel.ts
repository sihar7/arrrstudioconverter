"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, isModelCached, type Backend, type LoadedModel, type ModelDef } from "@/lib/ai/runtime";

export type ModelStatus = "idle" | "loading" | "ready" | "error";

/** Status unduh & siap-pakai satu model AI; `ensure()` memuat sekali lalu memakai ulang sesi */
export function useAiModel(model: ModelDef) {
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [backend, setBackend] = useState<Backend | null>(null);
  const [cached, setCached] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    void isModelCached(model).then((c) => alive.current && setCached(c));
    return () => {
      alive.current = false;
    };
  }, [model]);

  const ensure = useCallback(async (): Promise<LoadedModel> => {
    setStatus("loading");
    try {
      const loaded = await getSession(model, (p) => alive.current && setProgress(p));
      if (alive.current) {
        setStatus("ready");
        setBackend(loaded.backend);
        setCached(true);
      }
      return loaded;
    } catch (e) {
      if (alive.current) setStatus("error");
      throw e;
    }
  }, [model]);

  return { status, progress, backend, cached, ensure };
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Collapse, Cube, Expand, Refresh, User } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import IconButton from "@/components/ui/IconButton";
import { DEFAULT_CAMERA, type SkyAdjust, type SkyCamera, type SkyRenderer } from "../_lib/skyGl";

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  renderer: SkyRenderer | null;
  adjust: SkyAdjust;
  /** naik setiap sumber panorama diganti → paksa render ulang */
  version: number;
  hasSource: boolean;
  /** lapisan saat belum ada sumber (drop zone / pesan error) */
  overlay?: ReactNode;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Viewport 3D: render hanya saat ada perubahan (bukan loop per frame) → idle = 0% GPU.
 * Drag = putar kamera, scroll = zoom, panah keyboard saat canvas fokus.
 */
export default function SkyPreview({ canvasRef, renderer, adjust, version, hasSource, overlay }: Props) {
  const { t } = useT();
  const s = t.skybox;
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const [cam, setCam] = useState<SkyCamera>(DEFAULT_CAMERA);
  const [fov, setFov] = useState(70);
  const [scene, setScene] = useState(true);
  const [edges, setEdges] = useState(false);
  const [full, setFull] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Ukuran canvas mengikuti elemen × DPR (maks 2 → tetap ringan di layar 4K)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(entry.contentRect.width * dpr));
      const h = Math.max(1, Math.round(entry.contentRect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      setSize({ w, h });
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [canvasRef]);

  useEffect(() => {
    if (!renderer || !hasSource || !size.w) return;
    const raf = requestAnimationFrame(() => renderer.renderPreview(adjust, cam, { scene, edges, fov }));
    return () => cancelAnimationFrame(raf);
  }, [renderer, hasSource, adjust, cam, fov, scene, edges, size, version]);

  // Zoom via wheel: listener non-pasif supaya halaman tidak ikut tergulir
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = Math.exp(e.deltaY * 0.0012);
      if (scene) setCam((c) => ({ ...c, distance: clamp(c.distance * k, 6, 42) }));
      else setFov((f) => clamp(f * k, 35, 110));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef, scene]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const turn = (dx: number, dy: number) => setCam((c) => ({ ...c, yaw: c.yaw + dx, pitch: clamp(c.pitch + dy, -1.25, 1.45) }));

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!hasSource) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const k = (fov / 70) * 0.0055;
    turn((e.clientX - d.x) * k, -(e.clientY - d.y) * k);
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const onKey = (e: KeyboardEvent) => {
    const step = 0.08;
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const v = map[e.key];
    if (!v) return;
    e.preventDefault();
    turn(v[0], v[1]);
  };

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.();
  };

  return (
    <div
      ref={wrapRef}
      className={cn("relative isolate overflow-hidden bg-[#0b0b0d]", full ? "h-full w-full" : "aspect-[16/10] w-full rounded sm:aspect-[16/9]")}
    >
      <canvas
        ref={canvasRef}
        tabIndex={hasSource ? 0 : -1}
        aria-label={s.preview}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        className={cn(
          "absolute inset-0 size-full touch-none outline-none transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
          hasSource ? "cursor-grab opacity-100 active:cursor-grabbing" : "pointer-events-none opacity-0",
        )}
      />

      {hasSource && (
        <>
          <div className="absolute right-2 top-2 flex gap-1 rounded-full bg-black/45 p-1 text-white backdrop-blur-md">
            <IconButton size="sm" label={s.showScene} active={scene} onClick={() => setScene((v) => !v)} icon={<User width={18} height={18} />} className="text-white/80 hover:text-white" />
            <IconButton size="sm" label={s.showEdges} active={edges} onClick={() => setEdges((v) => !v)} icon={<Cube width={18} height={18} />} className="text-white/80 hover:text-white" />
            <IconButton
              size="sm"
              label={s.resetCamera}
              onClick={() => {
                setCam(DEFAULT_CAMERA);
                setFov(70);
              }}
              icon={<Refresh width={18} height={18} />}
              className="text-white/80 hover:text-white"
            />
            <IconButton
              size="sm"
              label={full ? s.exitFullscreen : s.fullscreen}
              onClick={toggleFull}
              icon={full ? <Collapse width={18} height={18} /> : <Expand width={18} height={18} />}
              className="text-white/80 hover:text-white"
            />
          </div>
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-medium text-white/85 backdrop-blur-md">
            {s.dragHint}
          </p>
        </>
      )}

      {overlay}
    </div>
  );
}

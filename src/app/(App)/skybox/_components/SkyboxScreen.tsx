"use client";

import { useEffect, useRef, useState } from "react";
import { Download, MediaImagePlus, Trash, WarningTriangle } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/shared/PageHeader";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import { SfCube } from "@/components/icons/SfIcons";
import { useSkyRenderer } from "../_hooks/useSkyRenderer";
import { DEFAULT_ADJUST, edgeMismatch, imageDataToPng, loadBitmap, type SkyAdjust } from "../_lib/skyGl";
import { FACE_PROP, FACES, guessFace, type FaceId } from "../_lib/skyMath";
import { makeZip, saveBlob } from "../_lib/zip";
import { analyzeAtmosphere, atmosphereRbxmx, atmosphereScript, type SkyAtmosphere } from "../_lib/atmosphere";
import SkyPreview from "./SkyPreview";
import DropZone from "@/components/shared/ImageDropZone";
import FaceCross from "./FaceCross";
import AdjustPanel from "./AdjustPanel";
import MergePanel from "./MergePanel";
import InstallCard from "./InstallCard";
import AtmospherePanel from "./AtmospherePanel";
import InputCard, { type SourceInfo } from "./InputCard";
import PreviewEmpty from "./PreviewEmpty";
import PromptPanel from "./PromptPanel";

type Mode = "convert" | "merge" | "prompt";
type FaceFile = { blob: Blob; url: string };
interface Result {
  key: string;
  faces: Record<FaceId, FaceFile>;
}
export type MergeSlot = { name: string; url: string; bitmap: ImageBitmap };

const isImage = (f: File) => /^image\/(png|jpeg|webp)$/.test(f.type);
const baseName = (n: string) => n.replace(/\.[a-z0-9]+$/i, "").replace(/[^\w-]+/g, "-").slice(0, 40) || "skybox";
const yieldFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

export default function SkyboxScreen() {
  const { t, f } = useT();
  const s = t.skybox;
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { renderer, error } = useSkyRenderer(canvasRef);

  const [mode, setMode] = useState<Mode>("convert");
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [adjust, setAdjust] = useState<SkyAdjust>(DEFAULT_ADJUST);
  const [size, setSize] = useState(1024);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [sourceId, setSourceId] = useState(0);
  const [flat, setFlat] = useState(false);
  const [seam, setSeam] = useState(false);
  const [slots, setSlots] = useState<Partial<Record<FaceId, MergeSlot>>>({});
  const [merged, setMerged] = useState<FaceFile | null>(null);
  const [mergeReady, setMergeReady] = useState(false);

  const convertBmp = useRef<ImageBitmap | null>(null);
  const mergeBmp = useRef<ImageBitmap | null>(null);
  const urls = useRef(new Set<string>());

  const track = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  };
  const release = (url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  };

  // Lepas semua object URL & bitmap saat halaman ditinggal (tanpa kebocoran memori)
  useEffect(() => {
    const set = urls.current;
    return () => {
      set.forEach((u) => URL.revokeObjectURL(u));
      set.clear();
      convertBmp.current?.close();
      mergeBmp.current?.close();
    };
  }, []);

  const replaceResult = (next: Result | null) =>
    setResult((prev) => {
      if (prev) FACES.forEach((face) => release(prev.faces[face].url));
      return next;
    });

  const resultKey = JSON.stringify([adjust, size, sourceId, flat, seam]);
  const stale = Boolean(result && result.key !== resultKey);

  const hasSource = mode === "convert" ? Boolean(source) : mergeReady;

  // ---------- Convert ----------
  const loadConvert = async (file: File) => {
    if (!isImage(file)) return toast(s.notImage, "err");
    if (!renderer) return toast(s.noWebgl, "err");
    try {
      const { bitmap, scaled, original } = await loadBitmap(file, renderer.maxTexture);
      convertBmp.current?.close();
      convertBmp.current = bitmap;
      // Rasio jauh dari 2:1 → otomatis mode gambar biasa (bisa diganti manual)
      const isFlat = Math.abs(original.w / original.h - 2) > 0.25;
      renderer.setFlat(isFlat);
      setFlat(isFlat);
      // Tepi kiri-kanan tidak menyambung → rapikan sambungan otomatis (bisa dimatikan)
      const needSeam = !isFlat && edgeMismatch(bitmap) > 14;
      renderer.setSeam(needSeam);
      setSeam(needSeam);
      renderer.setSource(bitmap);
      replaceResult(null);
      release(source?.thumb);
      setSource({ name: file.name, bytes: file.size, thumb: track(file), w: bitmap.width, h: bitmap.height, scaled, original });
      setSourceId((n) => n + 1);
      setVersion((v) => v + 1);
    } catch {
      toast(s.openFail, "err");
    }
  };

  const clearConvert = () => {
    release(source?.thumb);
    convertBmp.current?.close();
    convertBmp.current = null;
    replaceResult(null);
    setSource(null);
  };

  const convert = async () => {
    if (!renderer || !source) return;
    setBusy(true);
    try {
      const faces = {} as Record<FaceId, FaceFile>;
      for (const face of FACES) {
        const blob = await imageDataToPng(renderer.renderFace(face, size, adjust));
        faces[face] = { blob, url: track(blob) };
        await yieldFrame(); // beri napas ke UI di antara sisi
      }
      replaceResult({ key: resultKey, faces });
      toast(s.done, "ok");
    } catch {
      toast(s.convertFail, "err");
    } finally {
      setBusy(false);
      setVersion((v) => v + 1); // render ulang preview setelah pakai framebuffer offscreen
    }
  };

  // Atmosphere: otomatis dari warna langit hasil convert, bisa diatur; ikut ZIP, script & .rbxmx
  const [atmoAuto, setAtmoAuto] = useState<SkyAtmosphere | null>(null);
  const [atmoEdit, setAtmoEdit] = useState<SkyAtmosphere | null>(null);
  const [atmoOn, setAtmoOn] = useState(true);
  useEffect(() => {
    if (!result) return;
    let alive = true;
    analyzeAtmosphere(result.faces).then(
      (a) => {
        if (!alive) return;
        setAtmoAuto(a);
        setAtmoEdit(a);
      },
      () => alive && setAtmoAuto(null),
    );
    return () => {
      alive = false;
    };
  }, [result]);
  const atmosphere = result && atmoOn ? atmoEdit : null;

  const downloadZip = async () => {
    if (!result) return;
    const text = (s: string) => new Blob([s], { type: "text/plain" });
    const zip = await makeZip([
      ...FACES.map((face) => ({ name: `${FACE_PROP[face]}.png`, blob: result.faces[face].blob })),
      ...(atmosphere
        ? [
            { name: "Lighting.rbxmx", blob: text(atmosphereRbxmx(atmosphere, baseName(source?.name ?? "Lighting"))) },
            { name: "Lighting.lua", blob: text(atmosphereScript(atmosphere)) },
          ]
        : []),
    ]);
    saveBlob(zip, `${baseName(source?.name ?? "skybox")}-skybox.zip`);
  };

  // ---------- Gabung 6 sisi ----------
  const addMergeFiles = async (files: File[], target?: FaceId) => {
    const images = files.filter(isImage);
    if (images.length < files.length) toast(s.notImage, "err");
    let unknown = 0;
    const next: Partial<Record<FaceId, MergeSlot>> = {};
    for (const file of images) {
      const face = target ?? guessFace(file.name);
      if (!face) {
        unknown++;
        continue;
      }
      try {
        const { bitmap } = await loadBitmap(file, 2048);
        next[face] = { name: file.name, url: track(file), bitmap };
      } catch {
        toast(s.openFail, "err");
      }
      if (target) break;
    }
    if (unknown) toast(f(s.unknownFace, { n: unknown }), "info");
    if (!Object.keys(next).length) return;
    for (const face of Object.keys(next) as FaceId[]) {
      release(slots[face]?.url);
      slots[face]?.bitmap.close();
    }
    const updated = { ...slots, ...next };
    setSlots(updated);
    await rebuildMerge(updated);
  };

  const clearSlot = (face: FaceId) => {
    release(slots[face]?.url);
    slots[face]?.bitmap.close();
    const rest = { ...slots };
    delete rest[face];
    setSlots(rest);
    void rebuildMerge(rest);
  };

  // Preview gabungan (resolusi sedang) setiap slot berubah
  async function rebuildMerge(next: Partial<Record<FaceId, MergeSlot>>) {
    if (!renderer) return;
    const filled = FACES.filter((face) => next[face]);
    setMerged((prev) => {
      release(prev?.url);
      return null;
    });
    if (!filled.length) {
      mergeBmp.current?.close();
      mergeBmp.current = null;
      setMergeReady(false);
      return;
    }
    const bitmaps = Object.fromEntries(filled.map((face) => [face, next[face]!.bitmap]));
    const bmp = await createImageBitmap(renderer.mergeFaces(bitmaps, Math.min(4096, renderer.maxTexture)));
    mergeBmp.current?.close();
    mergeBmp.current = bmp;
    renderer.setSource(bmp);
    setMergeReady(true);
    setVersion((v) => v + 1);
  }

  // Ganti mode = ganti tekstur sumber preview
  const changeSeam = (v: boolean) => {
    setSeam(v);
    renderer?.setSeam(v);
    setVersion((n) => n + 1);
  };

  const changeFlat = (v: boolean) => {
    setFlat(v);
    renderer?.setFlat(v);
    setVersion((n) => n + 1);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    // panorama gabungan selalu 360°; sumber convert memakai pilihan jenis gambar
    renderer?.setFlat(m === "convert" ? flat : false);
    renderer?.setSeam(m === "convert" ? seam : false);
    const bmp = m === "convert" ? convertBmp.current : m === "merge" ? mergeBmp.current : null;
    if (renderer && bmp) {
      renderer.setSource(bmp);
      setVersion((v) => v + 1);
    }
  };

  const exportMerge = async (faceSize: number) => {
    if (!renderer) return;
    setBusy(true);
    try {
      const bitmaps = Object.fromEntries(FACES.filter((face) => slots[face]).map((face) => [face, slots[face]!.bitmap]));
      const blob = await imageDataToPng(renderer.mergeFaces(bitmaps, faceSize * 4));
      setMerged((prev) => {
        release(prev?.url);
        return { blob, url: track(blob) };
      });
      toast(s.mergeDone, "ok");
    } catch {
      toast(s.convertFail, "err");
    } finally {
      setBusy(false);
      setVersion((v) => v + 1);
    }
  };

  const sendMergedToConvert = async () => {
    if (!merged) return;
    await loadConvert(new File([merged.blob], "panorama.png", { type: "image/png" }));
    setMode("convert");
  };

  // ---------- Tampilan ----------
  const errorText = error === "webgl" ? s.noWebgl : error === "lost" ? s.contextLost : null;

  const overlay = errorText ? (
    <div className="absolute inset-0 grid place-items-center p-6 text-center">
      <p className="flex max-w-sm items-start gap-2 text-[14px] leading-relaxed text-white/80">
        <WarningTriangle width={18} height={18} className="mt-0.5 shrink-0 text-warn" /> {errorText}
      </p>
    </div>
  ) : mode === "convert" && !source ? (
    <DropZone label={s.choose} onFiles={(files) => void loadConvert(files[0])} className="absolute inset-0 grid place-items-center text-center text-white">
      <PreviewEmpty title={s.emptyTitle} sub={s.emptySub} />
    </DropZone>
  ) : mode === "merge" && !mergeReady ? (
    <div className="absolute inset-0 grid place-items-center text-center text-white">
      <PreviewEmpty title={s.emptyTitle} sub={s.mergeSlotsSub} />
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={s.eyebrow}
        title={s.title}
        sub={s.sub}
        actions={
          <Segmented
            label={s.modeLabel}
            value={mode}
            onChange={switchMode}
            className="w-full sm:min-w-[440px]"
            options={[
              { value: "convert", label: s.modeConvert },
              { value: "merge", label: s.modeMerge },
              { value: "prompt", label: s.modePrompt },
            ]}
          />
        }
      />

      {mode === "prompt" && <PromptPanel onOpenConvert={() => switchMode("convert")} />}

      {/* Tetap ter-mount di tab Prompt (hanya disembunyikan) — canvas memegang konteks WebGL */}
      <div className={cn("grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]", mode === "prompt" && "hidden")}>
        <div className="flex min-w-0 flex-col gap-6">
          <CardBox>
            <CardHeader
              title={s.preview}
              aside={<span className="text-[12.5px] text-fg-3">{s.privacy}</span>}
            />
            <div className="p-3 sm:p-4">
              <SkyPreview
                canvasRef={canvasRef}
                renderer={renderer}
                adjust={mode === "convert" ? adjust : DEFAULT_ADJUST}
                atmosphere={mode === "convert" ? atmosphere : null}
                version={version}
                hasSource={hasSource && !errorText}
                overlay={overlay}
              />
            </div>
          </CardBox>

          {mode === "convert" ? (
            <CardBox>
              <CardHeader
                title={s.result}
                aside={
                  result && (
                    <div className="flex items-center gap-2">
                      {stale && <Badge tone="warn">{s.stale}</Badge>}
                      <Button size="sm" variant="primary" icon={<Download width={16} height={16} />} onClick={() => void downloadZip()}>
                        {s.zip}
                      </Button>
                    </div>
                  )
                }
              />
              {result ? (
                <div className={cn("p-3 transition-opacity sm:p-4", stale && "opacity-60")}>
                  <FaceCross
                    renderTile={(face, prop) => (
                      <a
                        href={result.faces[face].url}
                        download={`${prop}.png`}
                        title={f(s.downloadFace, { name: prop })}
                        className="group absolute inset-0 overflow-hidden rounded-s bg-fg/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={result.faces[face].url} alt={s.faces[face]} className="size-full object-cover transition-transform duration-300 ease-[var(--ease)] group-hover:scale-[1.04]" />
                        <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur sm:text-[11.5px]">
                          {prop}
                        </span>
                        <span className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          <Download width={14} height={14} />
                        </span>
                      </a>
                    )}
                  />
                </div>
              ) : (
                <EmptyState icon={<SfCube size={26} />} title={s.resultEmpty} sub={s.resultEmptySub} />
              )}
            </CardBox>
          ) : (
            <CardBox>
              <CardHeader title={s.mergeSlots} aside={<Badge tone={Object.keys(slots).length === 6 ? "ok" : "neutral"}>{f(s.mergeReady, { n: Object.keys(slots).length })}</Badge>} />
              <div className="p-3 sm:p-4">
                <DropZone
                  multiple
                  label={s.mergeSlots}
                  onFiles={(files) => void addMergeFiles(files)}
                  className="mb-3 flex items-center justify-center gap-2 rounded border border-dashed border-line-2 px-4 py-4 text-[13.5px] text-fg-2 hover:border-fg-3 hover:text-fg"
                >
                  <MediaImagePlus width={18} height={18} /> {s.mergeSlotsSub}
                </DropZone>
                <FaceCross
                  renderTile={(face, prop) => {
                    const slot = slots[face];
                    return (
                      <div className="group absolute inset-0">
                        <DropZone
                          label={f(s.pickFace, { name: s.faces[face] })}
                          onFiles={(files) => void addMergeFiles(files, face)}
                          className={cn(
                            "absolute inset-0 overflow-hidden rounded-s",
                            slot ? "bg-fg/[0.06]" : "border border-dashed border-line-2 bg-fg/[0.03] hover:border-fg-3",
                          )}
                        >
                          {slot ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={slot.url} alt={s.faces[face]} className="size-full object-cover" />
                          ) : (
                            <span className="grid size-full place-items-center text-fg-3">
                              <MediaImagePlus width={18} height={18} />
                            </span>
                          )}
                          <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-black/55 px-2 py-0.5 text-center text-[10.5px] font-semibold text-white backdrop-blur sm:text-[11.5px]">
                            {prop}
                          </span>
                        </DropZone>
                        {slot && (
                          <button
                            type="button"
                            aria-label={f(s.clearFace, { name: s.faces[face] })}
                            title={f(s.clearFace, { name: s.faces[face] })}
                            onClick={() => clearSlot(face)}
                            className="absolute right-1 top-1 grid size-7 cursor-pointer place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/75 focus-visible:opacity-100 group-hover:opacity-100 max-[1023px]:opacity-100"
                          >
                            <Trash width={13} height={13} />
                          </button>
                        )}
                      </div>
                    );
                  }}
                />
              </div>
            </CardBox>
          )}

          {mode === "convert" && <InstallCard faces={result?.faces ?? null} stale={stale} atmosphere={atmosphere} />}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {mode === "convert" && (
            <InputCard
              source={source}
              flat={flat}
              onFlat={changeFlat}
              seam={seam}
              onSeam={changeSeam}
              faceSize={size}
              onFile={(file) => void loadConvert(file)}
              onRemove={clearConvert}
            />
          )}
          {mode === "convert" ? (
            <AdjustPanel
              adjust={adjust}
              onAdjust={setAdjust}
              size={size}
              onSize={setSize}
              disabled={!source || Boolean(errorText)}
              busy={busy}
              hasResult={Boolean(result)}
              onConvert={() => void convert()}
            />
          ) : null}
          {mode === "convert" && result && atmoAuto && atmoEdit && (
            <AtmospherePanel value={atmoEdit} auto={atmoAuto} on={atmoOn} onToggle={setAtmoOn} onChange={setAtmoEdit} />
          )}
          {mode === "merge" ? (
            <MergePanel
              filled={Object.keys(slots).length}
              busy={busy}
              merged={merged}
              onMerge={(faceSize) => void exportMerge(faceSize)}
              onUseInConvert={() => void sendMergedToConvert()}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

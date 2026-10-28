"use client";

import { memo, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Check, Copy, Download, NavArrowDown, NavArrowUp, Pause, Play, Refresh, Upload, WarningTriangle, Xmark } from "iconoir-react";
import { isRunning, type ItemStatus, type QueueItem } from "@/store/slices/converterSlice";
import { cn, copyText, formatBytes, formatClock, formatDuration } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Progress from "@/components/ui/Progress";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import RobloxPlaybackChip from "@/components/shared/RobloxPlaybackChip";
import { fileUrl } from "../_service/converter.service";
import { outputDuration } from "../_utils/helpers";
import { summarize } from "@/lib/audioSummary";
import { ROBLOX_SOFT_LIMIT_SEC } from "../_constants/converter.constants";
import type { UploadBlock } from "@/type/roblox";

interface Props {
  item: QueueItem;
  playing: boolean;
  uploadBlock: UploadBlock;
  /** Bisa dipilih untuk upload massal (selesai, belum terupload) */
  selectable: boolean;
  /** Urutan pilihan (1-based) atau null */
  selectIndex: number | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onConvert: () => void;
  onRemove: () => void;
  onTogglePlay: () => void;
  onUpload: () => void;
}

function QueueItemRow({ item, playing, uploadBlock, selectable, selectIndex, canMoveUp, canMoveDown, onSelect, onMove, onConvert, onRemove, onTogglePlay, onUpload }: Props) {
  const { t, f, lang } = useT();
  const toast = useToast();
  const running = isRunning(item.status);
  const done = item.status === "done" && item.result;
  const chips = item.options ? summarize(item.options, t) : [];
  const outDur = item.result?.duration ?? (item.options ? outputDuration(item.options, item.duration) : item.duration);
  const up = item.upload;
  const selected = selectIndex != null;

  const copy = async (text: string) => {
    if (await copyText(text)) toast(t.toast.copied, "ok");
  };

  return (
    <li
      className={cn(
        "group/row grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line/70 px-4 py-4 transition-colors duration-200 last:border-b-0 hover:bg-fg/[0.02] sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:px-5",
        // App desktop: baris track list — cover kotak 44px, satu baris judul, aksi rata kanan
        "desk:grid-cols-[44px_minmax(0,1fr)_auto] desk:items-center desk:gap-x-3 desk:gap-y-1 desk:border-[var(--hairline)] desk:px-4 desk:py-2.5 desk:hover:bg-fg/[0.035]",
        selected && "bg-fg/[0.035] desk:bg-fg/[0.06]",
      )}
    >
      {/* Thumbnail (lazy) — pada item siap upload, cover = tombol pilih bernomor ala photo picker */}
      {selectable ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={f(t.converter.pick, { title: item.title })}
          onClick={onSelect}
          className="group/thumb relative aspect-video w-full cursor-pointer self-start overflow-hidden rounded-s bg-raised transition-transform duration-150 active:scale-[0.96] desk:aspect-square desk:self-center desk:rounded-[8px]"
        >
          <Image
            src={item.thumbnail}
            alt=""
            fill
            sizes="120px"
            unoptimized
            loading="lazy"
            className={cn(
              "object-cover transition-[transform,filter] duration-300 ease-[var(--ease)] desk:scale-[1.35]",
              selected ? "scale-[1.08] brightness-[0.42]" : "group-hover/thumb:brightness-[0.8]",
            )}
          />
          {selected ? (
            <span
              key={selectIndex}
              aria-hidden="true"
              className="pick-pop absolute inset-0 m-auto grid size-8 place-items-center rounded-full bg-accent font-mono text-[13px] font-semibold tabular-nums text-on-accent desk:size-6 desk:text-[11.5px]"
            >
              {selectIndex}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="absolute left-1.5 top-1.5 size-5 rounded-full border-[1.5px] border-white/90 bg-black/30 desk:inset-0 desk:m-auto desk:size-4 transition-opacity duration-200 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/thumb:opacity-100 [@media(hover:hover)]:group-focus-visible/thumb:opacity-100"
            />
          )}
          {/* Penanda aktif = garis bawah (konvensi navbar) */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-transform duration-300 ease-[var(--ease)]",
              selected ? "scale-x-100" : "scale-x-0",
            )}
          />
          <span className="absolute bottom-1 right-1 bg-black/75 px-1 font-mono text-[10.5px] text-white desk:hidden">{formatDuration(outDur)}</span>
        </button>
      ) : (
        <div className="relative aspect-video w-full self-start overflow-hidden rounded-s bg-raised desk:aspect-square desk:self-center desk:rounded-[8px]">
          <Image src={item.thumbnail} alt="" fill sizes="120px" unoptimized loading="lazy" className="object-cover desk:scale-[1.35]" />
          <span className="absolute bottom-1 right-1 bg-black/75 px-1 font-mono text-[10.5px] text-white desk:hidden">{formatDuration(outDur)}</span>
        </div>
      )}

      {/* Info + status */}
      <div className="min-w-0">
        <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug [overflow-wrap:anywhere] desk:line-clamp-1 desk:text-[13.5px]" title={item.title}>
          {item.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-fg-3 desk:mt-0.5 desk:text-[12px]">
          <span className="hidden font-mono tabular-nums desk:inline">{formatDuration(outDur)}</span>
          {(item.artist ?? item.author) && (
            <span className="truncate" title={[item.artist ?? item.author, item.album].filter(Boolean).join(" · ")}>
              {[item.artist ?? item.author, item.album].filter(Boolean).join(" · ")}
            </span>
          )}
          {done && (
            <span className="font-mono">
              {item.result!.format.toUpperCase()} · {formatBytes(item.result!.size)}
            </span>
          )}
          {done && item.result!.saved ? (
            <span title={t.converter.savedHint} className="rounded-full bg-ok/12 px-2 py-0.5 text-[11.5px] font-semibold text-ok">
              {f(t.converter.saved, { n: item.result!.saved })}
            </span>
          ) : null}
          {chips.length > 0 && <span className="font-mono text-[11.5px] text-fg-2">{chips.join("  ·  ")}</span>}
        </div>

        <div className="mt-2.5 desk:mt-1 desk:empty:hidden">
          {running && <RunningStatus item={item} />}
          {item.status === "error" && (
            <p className="flex items-start gap-1.5 text-[13px] text-err" role="alert">
              <WarningTriangle width={14} height={14} className="mt-0.5 shrink-0" /> {item.error}
            </p>
          )}
          {done && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ok" dot>
                {t.converter.status.done}
              </Badge>
              <span className="text-[12px] text-fg-3">{f(t.converter.expires, { time: formatClock(item.result!.expiresAt, lang) })}</span>
              <RobloxPlaybackChip options={item.options} />
              {(item.result!.duration ?? 0) > ROBLOX_SOFT_LIMIT_SEC && (
                <span className="text-[12px] text-warn">{t.converter.robloxLimit}</span>
              )}
            </div>
          )}

          {/* Status upload Roblox */}
          {up.status === "uploading" && (
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-fg-2">
              <Spinner className="size-3.5" /> {t.upload.uploading}
            </p>
          )}
          {up.status === "processing" && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-[12.5px] text-fg-2">{t.upload.processing}</p>
              <Progress value={null} label={t.upload.processing} />
            </div>
          )}
          {up.status === "done" && up.assetId && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copy(up.assetId!)}
                className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[12.5px] text-fg transition-colors hover:text-accent"
                title={t.history.copyId}
              >
                rbxassetid://{up.assetId} <Copy width={13} height={13} />
              </button>
              <Badge tone="warn">{t.history.states.Reviewing}</Badge>
            </div>
          )}
          {up.status === "error" && <p className="mt-2 text-[12.5px] text-err">{up.error}</p>}

          {/* Cover album → Decal (berjalan bersama upload audio) */}
          {item.decal.status !== "idle" && (
            <div className="mt-2 flex min-w-0 items-center gap-2 text-[12.5px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.cover ?? item.thumbnail} alt="" className="size-5 shrink-0 rounded-[5px] object-cover" />
              {(item.decal.status === "uploading" || item.decal.status === "processing") && (
                <span className="flex items-center gap-1.5 text-fg-2">
                  <Spinner className="size-3" /> {item.decal.status === "uploading" ? t.upload.coverUploading : t.upload.coverProcessing}
                </span>
              )}
              {item.decal.status === "done" && (item.decal.imageId ?? item.decal.decalId) && (
                <button
                  type="button"
                  onClick={() => copy(item.decal.imageId ?? item.decal.decalId!)}
                  className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 font-mono text-fg transition-colors hover:text-accent"
                  title={t.history.copyId}
                >
                  <span className="font-sans text-fg-3">{t.upload.coverLabel}</span>
                  <span className="truncate">rbxassetid://{item.decal.imageId ?? item.decal.decalId}</span>
                  <Copy width={13} height={13} className="shrink-0" />
                </button>
              )}
              {item.decal.status === "error" && <span className="text-err">{f(t.upload.coverFailed, { error: item.decal.error ?? "" })}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Aksi */}
      <div className="col-span-2 flex flex-wrap items-center justify-end gap-1.5 sm:col-span-1 sm:flex-nowrap sm:self-center desk:col-span-1 desk:row-start-1 desk:col-start-3 desk:flex-nowrap desk:gap-1">
        {/* Urutan proses — hanya untuk yang belum dikirim; di desktop muncul saat hover baris */}
        {item.status === "idle" && (canMoveUp || canMoveDown) && (
          <span className="mr-auto flex sm:mr-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:transition-opacity [@media(hover:hover)]:group-focus-within/row:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100">
            <IconButton label={t.converter.moveUp} size="sm" disabled={!canMoveUp} icon={<NavArrowUp width={16} height={16} />} onClick={() => onMove(-1)} />
            <IconButton label={t.converter.moveDown} size="sm" disabled={!canMoveDown} icon={<NavArrowDown width={16} height={16} />} onClick={() => onMove(1)} />
          </span>
        )}
        {item.status === "idle" && (
          <Button size="sm" variant="ghost" onClick={onConvert}>
            {t.converter.convert}
          </Button>
        )}
        {item.status === "error" && (
          <Button size="sm" variant="ghost" icon={<Refresh width={14} height={14} />} onClick={onConvert}>
            {t.common.retry}
          </Button>
        )}
        {done && (
          <>
            <IconButton
              label={playing ? t.converter.pause : t.converter.preview}
              active={playing}
              icon={playing ? <Pause width={18} height={18} /> : <Play width={18} height={18} />}
              onClick={onTogglePlay}
            />
            <a
              href={fileUrl(item.result!.fileId, true)}
              download
              aria-label={t.common.download}
              title={t.common.download}
              className="inline-flex size-10 items-center justify-center rounded-s text-fg-2 transition-colors hover:bg-hover hover:text-fg desk:size-8 desk:rounded-[8px]"
            >
              <Download width={18} height={18} />
            </a>
            {up.status !== "done" && (
              <Button
                size="sm"
                variant={uploadBlock ? "ghost" : "primary"}
                icon={<Upload width={14} height={14} />}
                disabled={up.status === "uploading" || up.status === "processing" || uploadBlock === "format"}
                title={
                  uploadBlock === "login" ? t.converter.loginToUpload : uploadBlock === "format" ? t.converter.robloxFormatOnly : undefined
                }
                onClick={onUpload}
              >
                Roblox
              </Button>
            )}
          </>
        )}
        <IconButton
          label={t.common.remove}
          icon={<Xmark width={16} height={16} />}
          size="sm"
          disabled={running || up.status === "uploading"}
          onClick={onRemove}
          className={cn(running && "invisible")}
        />
      </div>
    </li>
  );
}

// ============================================================
// PROGRES BERTAHAP: Antre → Unduh → Proses (+ detail & waktu berjalan)
// ============================================================

const stageOf = (s: ItemStatus) => (s === "downloading" ? 1 : s === "processing" ? 2 : 0);

const BARS = 44;
/** "Sidik jari" gelombang per lagu — tinggi bar deterministik dari id (tiap lagu polanya beda, stabil antar render) */
function fingerprint(id: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return Array.from({ length: BARS }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    const env = Math.sin((i / (BARS - 1)) * Math.PI) * 0.55 + 0.45; // tengah lebih tinggi
    return Math.max(0.18, (((h >>> 0) % 1000) / 1000) * env);
  });
}

function Elapsed() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{formatDuration((now - start) / 1000)}</>;
}

function RunningStatus({ item }: { item: QueueItem }) {
  const { t, f } = useT();
  const stage = stageOf(item.status);
  const labels = [t.converter.stages.queue, t.converter.stages.download, t.converter.stages.process];
  const d = t.converter.detail;
  const detail =
    item.status === "processing" && item.options
      ? f(d.processing, { format: item.options.format.toUpperCase(), bitrate: item.options.bitrate })
      : d[item.status as "pending" | "queued" | "downloading"];
  const pct = stage === 0 ? null : Math.round(item.progress);
  // Satu skala dengan angka persen (progres total server), bukan per tahap
  const fill = stage === 0 ? 0 : Math.min(1, Math.max(0, item.progress / 100));
  const bars = useMemo(() => fingerprint(item.videoId), [item.videoId]);

  return (
    <div
      role="progressbar"
      aria-label={`${item.title} — ${detail}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className="flex min-w-0 items-center gap-2 text-fg">
          <span className="eq shrink-0 text-accent" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="truncate">{detail}</span>
        </span>
        <span className="shrink-0 font-mono tabular-nums text-fg-3">
          {pct != null && <span className="text-fg-2">{pct}% · </span>}
          <Elapsed />
        </span>
      </div>
      {/* Gelombang = progress bar: bar menyala sampai tepat di angka persen, playhead di ujungnya; antre = bernapas */}
      <div className={cn("wave-track", stage === 0 && "is-waiting")} aria-hidden="true">
        {bars.map((v, i) => (
          <i key={i} data-lit={(i + 0.5) / BARS <= fill ? "done" : "idle"} style={{ "--h": v, "--d": `${i * 28}ms` } as CSSProperties} />
        ))}
        {stage > 0 && <span className="wave-head" style={{ left: `${fill * 100}%` }} />}
      </div>
      <ol className="flex items-center gap-1.5 text-[12px] font-medium" aria-hidden="true">
        {labels.map((label, i) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors duration-300",
              i < stage ? "text-fg-2" : i === stage ? "bg-fg/[0.08] text-fg" : "text-fg-3",
            )}
          >
            {i < stage ? (
              <Check width={12} height={12} strokeWidth={2.4} className="pick-pop" />
            ) : i === stage ? (
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--ios-green)]" />
            ) : null}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default memo(QueueItemRow);

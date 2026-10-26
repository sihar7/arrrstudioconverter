"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Image from "next/image";
import { Check, Copy, Download, Lock, NavArrowDown, OpenNewWindow, Trash, Upload } from "iconoir-react";
import { cn, copyText, formatBytes, formatClock, formatDuration } from "@/lib/utils";
import { summarize } from "@/lib/audioSummary";
import { ROBLOX_FORMATS } from "@/lib/schemas/convert.schema";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import RobloxPlaybackChip from "@/components/shared/RobloxPlaybackChip";
import { relTime, stateTone } from "../_utils/helpers";
import { robloxAssetConfigureUrl } from "@/Url/Url";
import type { HistoryItem } from "@/type/history";

const LONG_PRESS_MS = 450;

interface Props {
  item: HistoryItem;
  selecting: boolean;
  selected: boolean;
  /** shift = Shift+klik (pilih rentang) */
  onToggle: (shift: boolean) => void;
  /** tekan lama (HP) → masuk mode pilih dengan item ini */
  onLongPress: () => void;
  onUpload: () => void;
  onPermission: () => void;
  onDelete: () => void;
}

/**
 * Satu riwayat. Mode biasa: klik kartu = buka/tutup detail, aksi cepat di kanan.
 * Mode pilih: klik kartu = pilih (sorot + centang di thumbnail), aksi disembunyikan.
 */
export default function HistoryRow({ item, selecting, selected, onToggle, onLongPress, onUpload, onPermission, onDelete }: Props) {
  const { t, f, lang } = useT();
  const h = t.history;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean }>({ timer: null, fired: false });
  const rb = item.roblox;
  const chips = summarize(item.options, t);
  const canUpload = item.fileAvailable && !rb && (ROBLOX_FORMATS as readonly string[]).includes(item.format);
  const failed = rb?.permissions.filter((p) => p.status === "failed") ?? [];

  const copy = async (text: string) => {
    if (await copyText(text)) toast(t.toast.copied, "ok");
  };

  // Tekan lama (sentuh) → mode pilih; klik biasa tidak terpengaruh
  const onPointerDown = (e: PointerEvent) => {
    if (selecting || e.pointerType === "mouse") return;
    press.current.fired = false;
    press.current.timer = setTimeout(() => {
      press.current.fired = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (press.current.timer) clearTimeout(press.current.timer);
    press.current.timer = null;
  };
  const onCardClick = (e: MouseEvent) => {
    if (press.current.fired) {
      press.current.fired = false;
      return;
    }
    if (selecting) onToggle(e.shiftKey);
    else setOpen((v) => !v);
  };

  return (
    <li
      className={cn(
        "group relative border-b border-line/60 transition-colors duration-200 last:border-b-0",
        selected ? "bg-accent/[0.07]" : "hover:bg-raised/50",
      )}
    >
      {/* Penanda terpilih di tepi kiri */}
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-0.5 origin-center bg-accent transition-transform duration-300 ease-[var(--ease)]", selected ? "scale-y-100" : "scale-y-0")} />

      <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
        <button
          type="button"
          onClick={onCardClick}
          onPointerDown={onPointerDown}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => press.current.fired && e.preventDefault()}
          aria-pressed={selecting ? selected : undefined}
          aria-expanded={selecting ? undefined : open}
          className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-3 text-left sm:gap-4"
        >
          <span className={cn("relative aspect-video w-[96px] shrink-0 overflow-hidden rounded-s bg-raised transition-transform duration-200 sm:w-[120px]", selected && "scale-[0.94]")}>
            <Image src={item.thumbnail} alt="" fill sizes="120px" unoptimized loading="lazy" className="object-cover" />
            <span className="absolute bottom-1 right-1 rounded-xs bg-black/75 px-1 font-mono text-[10.5px] text-white">{formatDuration(item.duration)}</span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-accent/55 text-on-accent transition-opacity duration-200",
                selected ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-accent shadow-[var(--elev-2)]">
                <Check width={18} height={18} strokeWidth={2.4} />
              </span>
            </span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-[14.5px] font-semibold leading-snug [overflow-wrap:anywhere] sm:line-clamp-2" title={item.title}>
              {item.title}
            </span>
            <span className="mt-1 block truncate font-mono text-[11.5px] text-fg-3">
              {relTime(item.createdAt, t)} · {item.format.toUpperCase()} · {formatBytes(item.size)}
              {chips.length > 0 && ` · ${chips.slice(0, 2).join(" · ")}`}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              {rb ? (
                <Badge tone={stateTone(rb.state)}>{h.states[rb.state]}</Badge>
              ) : (
                <Badge tone="neutral" dot={false}>
                  {h.notUploaded}
                </Badge>
              )}
              {failed.length > 0 && <Badge tone="err">{t.permission.failed}</Badge>}
              <span className="text-[11.5px] text-fg-3">{item.fileAvailable ? f(h.fileUntil, { time: formatClock(item.fileExpiresAt, lang) }) : h.fileExpired}</span>
            </span>
          </span>
        </button>

        {/* Aksi cepat — disembunyikan di mode pilih; di desktop muncul saat hover/fokus */}
        {!selecting && (
          <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-200 [@media(hover:hover)]:opacity-60 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
            {item.fileAvailable && (
              <a
                href={`/api/files/${item.fileId}?dl=1`}
                download
                aria-label={t.common.download}
                title={t.common.download}
                className="hidden size-10 items-center justify-center rounded-s text-fg-2 transition-colors hover:bg-hover hover:text-fg sm:inline-flex"
              >
                <Download width={18} height={18} />
              </a>
            )}
            {canUpload && (
              <Button size="sm" variant="ghost" icon={<Upload width={14} height={14} />} onClick={onUpload} className="hidden md:inline-flex">
                Roblox
              </Button>
            )}
            {rb?.assetId && (
              <Button size="sm" variant="ghost" icon={<Lock width={14} height={14} />} onClick={onPermission} className="hidden md:inline-flex">
                {h.setPermission}
              </Button>
            )}
            <IconButton label={t.common.delete} icon={<Trash width={16} height={16} />} onClick={onDelete} className="hover:text-err" />
            <IconButton
              label={h.details}
              icon={<NavArrowDown width={18} height={18} className={cn("transition-transform duration-300", open && "rotate-180")} />}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            />
          </div>
        )}
      </div>

      {/* Detail (buka/tutup) */}
      {open && !selecting && (
        <div className="fade-swap grid gap-4 border-t border-line/50 bg-bg/30 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-[1fr_1fr_auto]">
          <div className="min-w-0">
            <p className="caps text-[10px] text-fg-3">{h.effects}</p>
            <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-fg-2">{chips.length ? chips.join(" · ") : h.noEffects}</p>
            <p className="caps mt-4 text-[10px] text-fg-3">{h.playback}</p>
            <RobloxPlaybackChip options={item.options} className="mt-1.5" />
          </div>

          <div className="min-w-0">
            <p className="caps text-[10px] text-fg-3">Roblox</p>
            {rb?.assetId ? (
              <div className="mt-1.5 flex flex-col items-start gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copy(rb.assetId!)}
                    title={h.copyId}
                    className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xs bg-raised px-2 font-mono text-[12.5px] text-fg transition-colors hover:bg-hover"
                  >
                    {rb.assetId} <Copy width={13} height={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(`rbxassetid://${rb.assetId}`)}
                    className="min-h-8 cursor-pointer text-[12px] text-fg-3 underline decoration-line-2 underline-offset-4 hover:text-fg"
                  >
                    {h.copyRbx}
                  </button>
                </div>
                {rb.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rb.permissions.map((p) => (
                      <span key={`${p.mode}-${p.placeId}`} title={p.message ?? undefined}>
                        <Badge tone={p.status === "granted" ? "ok" : p.status === "failed" ? "err" : "neutral"}>
                          {p.mode === "public" ? t.upload.permPublic : `${t.upload.permPlace} ${p.placeId}`} ·{" "}
                          {t.permission[p.status === "granted" ? "granted" : p.status === "failed" ? "failed" : "pending"]}
                        </Badge>
                      </span>
                    ))}
                  </div>
                )}
                {failed.map((p) => (
                  <p key={`${p.mode}-${p.placeId}`} className="text-[12px] leading-snug text-err">
                    {p.mode === "public" ? t.upload.permPublic : `${t.upload.permPlace} ${p.placeId}`}: {p.message ?? t.permission.failed}
                  </p>
                ))}
                <a
                  href={robloxAssetConfigureUrl(rb.assetId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 items-center gap-1.5 text-[12.5px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg"
                >
                  <OpenNewWindow width={13} height={13} aria-hidden="true" />
                  {h.openDashboard}
                </a>
              </div>
            ) : (
              <p className="mt-1.5 text-[13px] text-fg-3">{h.notUploaded}</p>
            )}
          </div>

          {/* Aksi lengkap untuk layar kecil (di desktop sudah ada di baris) */}
          <div className="flex flex-wrap items-start gap-2 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-end">
            {item.fileAvailable && (
              <a href={`/api/files/${item.fileId}?dl=1`} download className="inline-flex min-h-10 items-center gap-2 rounded-s border border-line px-3 text-[13px] font-semibold text-fg-2 transition-colors hover:border-line-2 hover:text-fg sm:hidden">
                <Download width={15} height={15} aria-hidden="true" />
                {t.common.download}
              </a>
            )}
            {canUpload && (
              <Button size="sm" variant="tonal" icon={<Upload width={14} height={14} />} onClick={onUpload} className="md:hidden">
                Roblox
              </Button>
            )}
            {rb?.assetId && (
              <Button size="sm" variant="tonal" icon={<Lock width={14} height={14} />} onClick={onPermission} className="md:hidden">
                {h.setPermission}
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

"use client";

import { Check, Copy, OpenNewWindow, Pause, Play, Refresh, Upload, WarningTriangle, Xmark } from "iconoir-react";
import { cn, copyText, formatBytes, formatDuration } from "@/lib/utils";
import { robloxAssetConfigureUrl } from "@/Url/Url";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Progress from "@/components/ui/Progress";
import { inputClass } from "@/components/ui/Field";
import type { FileItem } from "../_hooks/useFileUpload";

interface Props {
  item: FileItem;
  playing: boolean;
  canUpload: boolean;
  onPlay: () => void;
  onRename: (name: string) => void;
  onUpload: () => void;
  onRemove: () => void;
}

/** Satu file: pratinjau · nama aset (bisa diubah) · status · aksi */
export default function FileRow({ item, playing, canUpload, onPlay, onRename, onUpload, onRemove }: Props) {
  const { t, f } = useT();
  const U = t.fileUpload;
  const toast = useToast();
  const running = item.status === "sending" || item.status === "processing";
  const locked = running || item.status === "done";

  return (
    <li className="relative border-b border-line/60 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 desk:py-2.5">
        {/* Pratinjau: ubin format + tombol putar */}
        <button
          type="button"
          onClick={onPlay}
          aria-label={`${playing ? U.pause : U.play} — ${item.file.name}`}
          aria-pressed={playing}
          className={cn(
            "ios-press relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-s transition-colors duration-200 desk:size-10 desk:rounded-[8px]",
            playing ? "bg-accent text-on-accent" : "bg-fg/[0.07] text-fg-2 hover:bg-fg/[0.12] hover:text-fg",
          )}
        >
          {playing ? <Pause width={18} height={18} /> : <Play width={18} height={18} />}
          <span className="absolute -bottom-1.5 rounded-[4px] bg-surface px-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-fg-3 shadow-[0_0_0_1px_var(--hairline)]">
            {item.ext}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <input
            aria-label={`${t.upload.name} — ${item.file.name}`}
            maxLength={50}
            value={item.name}
            disabled={locked}
            onChange={(e) => onRename(e.target.value)}
            className={cn(inputClass, "h-10 text-[14.5px] font-semibold desk:h-8 desk:text-[13px]", locked && "disabled:opacity-100 bg-transparent px-0 hover:bg-transparent")}
          />
          <p className="mt-1 truncate font-mono text-[11.5px] text-fg-3" title={item.file.name}>
            {item.file.name} · {formatBytes(item.file.size)} · {formatDuration(item.duration)}
          </p>
        </div>

        {/* Status + aksi; layar sempit: aksi tetap di kanan, status turun ke bawah */}
        <div className="hidden w-[150px] shrink-0 justify-end sm:flex" aria-live="polite">
          <Status item={item} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {item.status === "done" && item.assetId ? (
            <>
              <button
                type="button"
                onClick={async () => (await copyText(item.assetId!)) && toast(t.toast.copied, "ok")}
                title={U.copyId}
                className="state-layer inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 font-mono text-[12.5px] text-fg transition-colors hover:text-accent desk:h-8 desk:rounded-[8px]"
              >
                {item.assetId}
                <Copy width={14} height={14} aria-hidden="true" />
              </button>
              <a
                href={robloxAssetConfigureUrl(item.assetId)}
                target="_blank"
                rel="noreferrer"
                aria-label={U.openRoblox}
                title={U.openRoblox}
                className="state-layer hidden size-10 items-center justify-center rounded-full text-fg-2 hover:text-fg sm:inline-flex desk:size-8 desk:rounded-[8px]"
              >
                <OpenNewWindow width={16} height={16} />
              </a>
            </>
          ) : (
            <Button
              size="sm"
              variant={item.status === "error" ? "tonal" : "primary"}
              loading={running}
              disabled={!canUpload || !item.name.trim()}
              icon={item.status === "error" ? <Refresh /> : <Upload />}
              onClick={onUpload}
            >
              {item.status === "error" ? U.retry : U.uploadOne}
            </Button>
          )}
          <IconButton size="sm" label={U.remove} icon={<Xmark width={18} height={18} />} disabled={running} onClick={onRemove} />
        </div>
      </div>

      <div className="-mt-1.5 px-4 pb-3 empty:hidden sm:hidden" aria-live="polite">
        {item.status !== "idle" && <Status item={item} />}
      </div>
      {item.status === "error" && item.error && (
        <p role="alert" className="-mt-1 flex items-start gap-1.5 px-4 pb-3.5 text-[13px] text-err sm:px-5 sm:pl-[84px] desk:pl-[72px]">
          <WarningTriangle width={14} height={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {item.error}
        </p>
      )}
      {running && (
        <Progress
          value={item.status === "sending" ? item.progress : null}
          label={item.status === "sending" ? f(U.sending, { pct: item.progress }) : U.processing}
          className="absolute inset-x-0 bottom-0 h-0.5 rounded-none"
        />
      )}
    </li>
  );
}

function Status({ item }: { item: FileItem }) {
  const { t, f } = useT();
  const U = t.fileUpload;
  switch (item.status) {
    case "sending":
      return <Badge tone="accent">{f(U.sending, { pct: item.progress })}</Badge>;
    case "processing":
      return <Badge tone="warn">{U.processing}</Badge>;
    case "done":
      return (
        <Badge tone="ok" dot={false}>
          <Check width={13} height={13} strokeWidth={2.4} aria-hidden="true" /> {U.done}
        </Badge>
      );
    case "error":
      return <Badge tone="err">{U.failed}</Badge>;
    default:
      return (
        <Badge tone="neutral" dot={false}>
          {U.ready}
        </Badge>
      );
  }
}

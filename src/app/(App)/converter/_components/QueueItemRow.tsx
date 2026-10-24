"use client";

import { memo } from "react";
import Image from "next/image";
import { Copy, Download, Pause, Play, Refresh, Upload, WarningTriangle, Xmark } from "iconoir-react";
import { isRunning, type QueueItem } from "@/store/slices/converterSlice";
import { cn, copyText, formatBytes, formatClock, formatDuration } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Progress from "@/components/ui/Progress";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { fileUrl } from "../_service/converter.service";
import { outputDuration } from "../_utils/helpers";
import { summarize } from "@/lib/audioSummary";
import { ROBLOX_SOFT_LIMIT_SEC } from "../_constants/converter.constants";
import type { UploadBlock } from "@/type/roblox";

interface Props {
  item: QueueItem;
  playing: boolean;
  uploadBlock: UploadBlock;
  onConvert: () => void;
  onRemove: () => void;
  onTogglePlay: () => void;
  onUpload: () => void;
}

function QueueItemRow({ item, playing, uploadBlock, onConvert, onRemove, onTogglePlay, onUpload }: Props) {
  const { t, f, lang } = useT();
  const toast = useToast();
  const running = isRunning(item.status);
  const done = item.status === "done" && item.result;
  const chips = item.options ? summarize(item.options, t) : [];
  const outDur = item.result?.duration ?? (item.options ? outputDuration(item.options, item.duration) : item.duration);
  const up = item.upload;

  const copy = async (text: string) => {
    if (await copyText(text)) toast(t.toast.copied, "ok");
  };

  return (
    <li className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line px-4 py-4 last:border-b-0 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:px-5">
      {/* Thumbnail (lazy) */}
      <div className="relative aspect-video w-full overflow-hidden rounded-s bg-raised">
        <Image src={item.thumbnail} alt="" fill sizes="112px" unoptimized loading="lazy" className="object-cover" />
        <span className="absolute bottom-1 right-1 bg-black/75 px-1 font-mono text-[10.5px] text-white">
          {formatDuration(outDur)}
        </span>
      </div>

      {/* Info + status */}
      <div className="min-w-0">
        <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug [overflow-wrap:anywhere]" title={item.title}>
          {item.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-fg-3">
          {item.author && <span className="truncate">{item.author}</span>}
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

        <div className="mt-2.5">
          {running && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-fg-2">
                  <span className="eq text-accent" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  {t.converter.status[item.status]}
                </span>
                <span className="font-mono tabular-nums text-fg-3">{item.status === "pending" ? "" : `${Math.round(item.progress)}%`}</span>
              </div>
              <Progress
                value={item.status === "pending" || item.status === "queued" ? null : item.progress}
                label={`${item.title} — ${t.converter.status[item.status]}`}
              />
            </div>
          )}
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
        </div>
      </div>

      {/* Aksi */}
      <div className="col-span-2 flex flex-wrap items-center justify-end gap-1.5 sm:col-span-1 sm:flex-nowrap sm:self-center">
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
              className="inline-flex size-10 items-center justify-center rounded-s text-fg-2 transition-colors hover:bg-hover hover:text-fg"
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

export default memo(QueueItemRow);

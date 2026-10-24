"use client";

import Image from "next/image";
import { Copy, Download, Lock, Trash, Upload } from "iconoir-react";
import { cn, copyText, formatBytes, formatClock, formatDate, formatDuration } from "@/lib/utils";
import { summarize } from "@/lib/audioSummary";
import { ROBLOX_FORMATS } from "@/lib/schemas/convert.schema";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import { stateTone } from "../_utils/helpers";
import { robloxAssetConfigureUrl } from "@/Url/Url";
import type { HistoryItem } from "@/type/history";

interface Props {
  item: HistoryItem;
  onUpload: () => void;
  onPermission: () => void;
  onDelete: () => void;
}

export default function HistoryRow({ item, onUpload, onPermission, onDelete }: Props) {
  const { t, f, lang } = useT();
  const toast = useToast();
  const rb = item.roblox;
  const chips = summarize(item.options, t);
  const canUpload = item.fileAvailable && !rb && (ROBLOX_FORMATS as readonly string[]).includes(item.format);

  const copy = async (text: string) => {
    if (await copyText(text)) toast(t.toast.copied, "ok");
  };

  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line px-4 py-4 last:border-b-0 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:px-5">
      <div className="relative aspect-video w-full overflow-hidden rounded-s bg-raised">
        <Image src={item.thumbnail} alt="" fill sizes="112px" unoptimized loading="lazy" className="object-cover" />
      </div>

      <div className="min-w-0">
        <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug [overflow-wrap:anywhere]" title={item.title}>
          {item.title}
        </p>
        <p className="mt-1 font-mono text-[11.5px] text-fg-3">
          {formatDate(item.createdAt, lang)} · {item.format.toUpperCase()} · {formatBytes(item.size)} · {formatDuration(item.duration)}
        </p>
        {chips.length > 0 && <p className="mt-1 font-mono text-[11.5px] text-fg-2">{chips.join("  ·  ")}</p>}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {rb ? (
            <>
              {rb.assetId ? (
                <button
                  type="button"
                  onClick={() => copy(rb.assetId!)}
                  title={t.history.copyId}
                  className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[12.5px] text-fg transition-colors hover:text-accent"
                >
                  {rb.assetId} <Copy width={13} height={13} />
                </button>
              ) : null}
              <Badge tone={stateTone(rb.state)} dot>
                {t.history.states[rb.state]}
              </Badge>
              {rb.permissions.map((p) => (
                <span key={`${p.mode}-${p.placeId}`} title={p.message ?? undefined}>
                  <Badge tone={p.status === "granted" ? "ok" : p.status === "failed" ? "err" : "neutral"}>
                    {p.mode === "public" ? t.upload.permPublic : `${t.upload.permPlace} ${p.placeId}`} ·{" "}
                    {t.permission[p.status === "granted" ? "granted" : p.status === "failed" ? "failed" : "pending"]}
                  </Badge>
                </span>
              ))}
              {rb.assetId && (
                <button
                  type="button"
                  onClick={() => copy(`rbxassetid://${rb.assetId}`)}
                  className="cursor-pointer text-[12px] text-fg-3 underline decoration-line-2 underline-offset-4 hover:text-fg"
                >
                  {t.history.copyRbx}
                </button>
              )}
            </>
          ) : (
            <span className="text-[12.5px] text-fg-3">{t.history.notUploaded}</span>
          )}
          <span className={cn("text-[12px]", item.fileAvailable ? "text-fg-3" : "text-fg-3/70")}>
            · {item.fileAvailable ? f(t.history.fileUntil, { time: formatClock(item.fileExpiresAt, lang) }) : t.history.fileExpired}
          </span>
        </div>
        {rb?.permissions.some((p) => p.status === "failed") && (
          <ul className="mt-2 flex flex-col gap-1">
            {rb.permissions
              .filter((p) => p.status === "failed")
              .map((p) => (
                <li key={`${p.mode}-${p.placeId}`} className="flex flex-wrap items-baseline gap-x-2 text-[12px] leading-snug text-err">
                  <span>
                    {p.mode === "public" ? t.upload.permPublic : `${t.upload.permPlace} ${p.placeId}`}: {p.message ?? t.permission.failed}
                  </span>
                  {p.mode === "public" && rb.assetId && (
                    <a
                      href={robloxAssetConfigureUrl(rb.assetId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg"
                    >
                      {t.history.openDashboard}
                    </a>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="col-span-2 flex flex-wrap items-center justify-end gap-1.5 sm:col-span-1 sm:flex-nowrap sm:self-center">
        {item.fileAvailable && (
          <a
            href={`/api/files/${item.fileId}?dl=1`}
            download
            aria-label={t.common.download}
            title={t.common.download}
            className="inline-flex size-10 items-center justify-center rounded-s text-fg-2 transition-colors hover:bg-hover hover:text-fg"
          >
            <Download width={18} height={18} />
          </a>
        )}
        {canUpload && (
          <Button size="sm" variant="ghost" icon={<Upload width={14} height={14} />} onClick={onUpload}>
            Roblox
          </Button>
        )}
        {rb?.assetId && (
          <Button size="sm" variant="ghost" icon={<Lock width={14} height={14} />} onClick={onPermission}>
            {t.history.setPermission}
          </Button>
        )}
        <IconButton label={t.common.delete} icon={<Trash width={16} height={16} />} onClick={onDelete} />
      </div>
    </li>
  );
}

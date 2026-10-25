"use client";

import { Archive, CloudUpload, MusicDoubleNote, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearFinished, enqueue, isRunning, removeItem, type QueueItem } from "@/store/slices/converterSlice";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Button, { buttonClass } from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Progress from "@/components/ui/Progress";
import QueueItemRow from "./QueueItemRow";
import { zipUrl } from "../_service/converter.service";
import type { UploadBlock } from "@/type/roblox";

interface Props {
  playing: string | null;
  onTogglePlay: (fileId: string) => void;
  onUpload: (item: QueueItem) => void;
  blockReason: (item: QueueItem) => UploadBlock;
  /** Item siap upload massal (urut antrean) */
  uploadableKeys: string[];
  /** Pilihan upload, urut sesuai saat dipilih */
  selection: string[];
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  /** Buka dialog upload massal: pilihan kalau ada, kalau tidak semua yang siap */
  onUploadMany: () => void;
}

export default function QueueCard({
  playing,
  onTogglePlay,
  onUpload,
  blockReason,
  uploadableKeys,
  selection,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onUploadMany,
}: Props) {
  const items = useAppSelector((s) => s.converter.items);
  const dispatch = useAppDispatch();
  const { t, f } = useT();
  const c = t.converter;

  const ready = items.filter((i) => i.status === "idle" || i.status === "error").length;
  const doneIds = items.filter((i) => i.status === "done" && i.result).map((i) => i.result!.fileId);
  const finished = items.some((i) => i.status === "done" || i.status === "error");

  // Ringkasan batch: item yang sudah dikirim (bukan idle)
  const started = items.filter((i) => i.status !== "idle");
  const running = started.filter((i) => isRunning(i.status)).length;
  const failed = started.filter((i) => i.status === "error").length;
  const doneCount = started.filter((i) => i.status === "done").length;
  const batchPct = started.length
    ? started.reduce((sum, i) => sum + (i.status === "done" || i.status === "error" ? 100 : isRunning(i.status) ? i.progress : 0), 0) /
      started.length
    : 0;

  const selIndex = new Map(selection.map((k, i) => [k, i + 1]));
  const uploadable = new Set(uploadableKeys);
  const selectedFileIds = items.filter((i) => selIndex.has(i.key) && i.result).map((i) => i.result!.fileId);

  return (
    <CardBox className="rise overflow-clip [animation-delay:60ms]">
      <CardHeader
        step={3}
        title={
          <>
            {c.queue} <span className="ml-1 font-mono text-fg-3">{items.length}</span>
          </>
        }
        aside={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {finished && (
              <Button size="sm" variant="subtle" onClick={() => dispatch(clearFinished())}>
                {c.clearDone}
              </Button>
            )}
            {doneIds.length >= 2 && (
              <a href={zipUrl(doneIds)} className={buttonClass("ghost", "sm")}>
                <Archive width={14} height={14} /> {c.zip}
              </a>
            )}
            {uploadableKeys.length > 0 && selection.length === 0 && (
              <Button size="sm" variant="tonal" icon={<CloudUpload width={16} height={16} />} onClick={onUploadMany}>
                {f(c.uploadAll, { n: uploadableKeys.length })}
              </Button>
            )}
            {ready > 0 && (
              <Button size="sm" variant="primary" onClick={() => dispatch(enqueue())}>
                {f(c.convertAll, { n: ready })}
              </Button>
            )}
          </div>
        }
      />

      {/* Ringkasan batch */}
      {started.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line/70 px-5 py-3 text-[12.5px]">
          <div className="flex min-w-[180px] flex-1 items-center gap-3">
            <Progress value={batchPct} tone={running === 0 && failed === 0 ? "ok" : "accent"} label={f(c.batchDone, { done: doneCount, total: started.length })} />
            <span className="shrink-0 font-mono tabular-nums text-fg-2">{f(c.batchDone, { done: doneCount, total: started.length })}</span>
          </div>
          <div className="flex items-center gap-4" aria-live="polite">
            {running > 0 && (
              <span className="flex items-center gap-1.5 text-fg-2">
                <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-accent" />
                {f(c.batchRunning, { n: running })}
              </span>
            )}
            {failed > 0 && <span className="text-err">{f(c.batchFailed, { n: failed })}</span>}
            {uploadableKeys.length > 0 && selection.length === 0 && <span className="text-fg-3">{c.pickHint}</span>}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<MusicDoubleNote width={22} height={22} />} title={c.emptyTitle} sub={c.emptySub} />
      ) : (
        <ul>
          {items.map((item) => (
            <QueueItemRow
              key={item.key}
              item={item}
              playing={Boolean(item.result && playing === item.result.fileId)}
              uploadBlock={blockReason(item)}
              selectable={uploadable.has(item.key)}
              selectIndex={selIndex.get(item.key) ?? null}
              onSelect={() => onToggleSelect(item.key)}
              onConvert={() => dispatch(enqueue([item.key]))}
              onRemove={() => dispatch(removeItem(item.key))}
              onTogglePlay={() => item.result && onTogglePlay(item.result.fileId)}
              onUpload={() => onUpload(item)}
            />
          ))}
        </ul>
      )}

      {/* Dock aksi pilihan — menempel di bawah layar selama antrean terlihat (di atas tab bar HP) */}
      {selection.length > 0 && (
        <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 px-3 pb-3 xl:bottom-6">
          <div
            role="region"
            aria-label={c.pickBar}
            className="dock-in flex items-center gap-1.5 rounded-full border border-line bg-[var(--glass)] p-1.5 pl-4 shadow-[var(--shadow)] backdrop-blur-xl backdrop-saturate-150"
          >
            <span aria-live="polite" className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-fg">
              {f(c.picked, { n: selection.length })}
            </span>
            {selection.length < uploadableKeys.length && (
              <button
                type="button"
                onClick={onSelectAll}
                className="state-layer h-10 shrink-0 cursor-pointer rounded-full px-3 text-[13px] font-medium text-fg-2 transition-colors hover:text-fg"
              >
                {f(c.pickAll, { n: uploadableKeys.length })}
              </button>
            )}
            <span className="flex-1" />
            {selectedFileIds.length >= 2 && (
              <a href={zipUrl(selectedFileIds)} aria-label={c.zip} title={c.zip} className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>
                <Archive width={14} height={14} /> {c.zip}
              </a>
            )}
            <IconButton label={c.pickClear} size="sm" icon={<Xmark width={16} height={16} />} onClick={onClearSelection} />
            <Button size="sm" variant="primary" icon={<CloudUpload width={16} height={16} />} onClick={onUploadMany}>
              {f(c.uploadSelected, { n: selection.length })}
            </Button>
          </div>
        </div>
      )}
    </CardBox>
  );
}

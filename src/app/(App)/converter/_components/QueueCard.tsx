"use client";

import { useState } from "react";
import { Archive, Bell, BellNotification, CloudUpload, KeyCommand, MusicDoubleNote, Refresh, Search, Trash, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearFinished, enqueue, isRunning, moveItem, removeItem, removeMany, type QueueItem } from "@/store/slices/converterSlice";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Button, { buttonClass } from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Progress from "@/components/ui/Progress";
import QueueItemRow from "./QueueItemRow";
import { zipUrl } from "../_service/converter.service";
import type { UploadBlock } from "@/type/roblox";

type Filter = "all" | "ready" | "running" | "done" | "error";
const FILTERS: Filter[] = ["all", "ready", "running", "done", "error"];

const matches = (i: QueueItem, f: Filter) =>
  f === "all" || (f === "ready" ? i.status === "idle" : f === "running" ? isRunning(i.status) : i.status === f);

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
  onShowShortcuts: () => void;
  notify: { on: boolean; supported: boolean; toggle: () => void };
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
  onShowShortcuts,
  notify,
}: Props) {
  const items = useAppSelector((s) => s.converter.items);
  const dispatch = useAppDispatch();
  const { t, f } = useT();
  const c = t.converter;
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = Object.fromEntries(FILTERS.map((k) => [k, items.filter((i) => matches(i, k)).length])) as Record<Filter, number>;
  // Filter yang kosongnya karena item habis → kembali ke "Semua" otomatis
  const active = counts[filter] ? filter : "all";
  const q = query.trim().toLowerCase();
  const shown = items.filter((i) => matches(i, active) && (!q || i.title.toLowerCase().includes(q) || i.author.toLowerCase().includes(q)));

  const ready = items.filter((i) => i.status === "idle" || i.status === "error").length;
  const failedKeys = items.filter((i) => i.status === "error").map((i) => i.key);
  const doneIds = items.filter((i) => i.status === "done" && i.result).map((i) => i.result!.fileId);
  const finished = items.some((i) => i.status === "done" || i.status === "error");

  // Ringkasan batch: item yang sudah dikirim (bukan idle)
  const started = items.filter((i) => i.status !== "idle");
  const running = started.filter((i) => isRunning(i.status)).length;
  const doneCount = started.filter((i) => i.status === "done").length;
  const batchPct = started.length
    ? started.reduce((sum, i) => sum + (i.status === "done" || i.status === "error" ? 100 : isRunning(i.status) ? i.progress : 0), 0) /
      started.length
    : 0;

  const selIndex = new Map(selection.map((k, i) => [k, i + 1]));
  const uploadable = new Set(uploadableKeys);
  const selectedFileIds = items.filter((i) => selIndex.has(i.key) && i.result).map((i) => i.result!.fileId);
  const order = new Map(items.map((i, n) => [i.key, n]));

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
          <div className="flex items-center gap-1">
            <IconButton label={c.shortcuts} size="sm" icon={<KeyCommand width={18} height={18} />} onClick={onShowShortcuts} className="hidden md:inline-flex" />
            {notify.supported && (
              <IconButton
                label={notify.on ? c.notifyOn : c.notifyOff}
                size="sm"
                active={notify.on}
                aria-pressed={notify.on}
                icon={notify.on ? <BellNotification width={18} height={18} /> : <Bell width={18} height={18} />}
                onClick={notify.toggle}
              />
            )}
            {ready > 0 && (
              <Button size="sm" variant="primary" onClick={() => dispatch(enqueue())} className="ml-1">
                {f(c.convertAll, { n: ready })}
              </Button>
            )}
          </div>
        }
      />

      {items.length > 0 && (
        <>
          {/* Toolbar: filter status (garis bawah) + cari */}
          <div className="flex flex-col gap-3 border-b border-line/70 px-5 pt-1 md:flex-row md:items-center md:justify-between">
            <div role="tablist" aria-label={c.queue} className="thin-scroll -mx-2 flex overflow-x-auto">
              {FILTERS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={active === k}
                  disabled={k !== "all" && !counts[k]}
                  onClick={() => setFilter(k)}
                  className={cn(
                    "state-layer relative flex h-11 shrink-0 cursor-pointer items-center gap-1.5 px-2.5 text-[13px] font-semibold transition-colors disabled:cursor-default disabled:opacity-35",
                    active === k ? "text-fg" : "text-fg-3 hover:text-fg-2",
                  )}
                >
                  {c.filters[k]}
                  <span className={cn("font-mono text-[11px] tabular-nums", k === "error" && counts.error ? "text-err" : "text-fg-3")}>{counts[k]}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2 bottom-0 h-0.5 bg-accent transition-transform duration-300 ease-[var(--ease)]",
                      active === k ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </button>
              ))}
            </div>
            {items.length > 4 && (
              <label className="relative mb-3 flex items-center md:mb-0 md:w-60">
                <Search width={16} height={16} aria-hidden="true" className="pointer-events-none absolute left-3 text-fg-3" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={c.search}
                  aria-label={c.search}
                  className="h-10 w-full rounded-s border border-line bg-bg/40 pl-9 pr-3 text-[14px] text-fg placeholder:text-fg-3 transition-colors hover:border-line-2 focus:border-fg-3 focus:outline-none"
                />
              </label>
            )}
          </div>

          {/* Progres batch + aksi massal sekunder */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line/70 px-5 py-2.5">
            {started.length > 0 ? (
              <div className="flex min-w-[200px] flex-1 items-center gap-3 text-[12.5px]">
                <Progress value={batchPct} tone={running === 0 && !failedKeys.length ? "ok" : "accent"} label={f(c.batchDone, { done: doneCount, total: started.length })} />
                <span className="shrink-0 font-mono tabular-nums text-fg-2">{f(c.batchDone, { done: doneCount, total: started.length })}</span>
                {running > 0 && (
                  <span className="hidden shrink-0 items-center gap-1.5 text-fg-2 sm:flex">
                    <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-accent" />
                    {f(c.batchRunning, { n: running })}
                  </span>
                )}
              </div>
            ) : (
              <p className="flex-1 text-[12.5px] text-fg-3">{uploadableKeys.length ? c.pickHint : c.guide[2].desc}</p>
            )}
            <div className="flex flex-wrap items-center gap-1">
              {failedKeys.length > 0 && (
                <Button size="sm" variant="subtle" className="h-9 px-3 text-err" icon={<Refresh width={14} height={14} />} onClick={() => dispatch(enqueue(failedKeys))}>
                  {f(c.retryFailed, { n: failedKeys.length })}
                </Button>
              )}
              {doneIds.length >= 2 && (
                <a href={zipUrl(doneIds)} className={buttonClass("subtle", "sm", "h-9 px-3")}>
                  <Archive width={14} height={14} /> {c.zip}
                </a>
              )}
              {uploadableKeys.length > 0 && selection.length === 0 && (
                <Button size="sm" variant="subtle" className="h-9 px-3" icon={<CloudUpload width={14} height={14} />} onClick={onUploadMany}>
                  {f(c.uploadAll, { n: uploadableKeys.length })}
                </Button>
              )}
              {finished && (
                <Button size="sm" variant="subtle" className="h-9 px-3" icon={<Trash width={14} height={14} />} onClick={() => dispatch(clearFinished())}>
                  {c.clearDone}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {items.length === 0 ? (
        <div>
          <EmptyState icon={<MusicDoubleNote width={22} height={22} />} title={c.emptyTitle} sub={c.emptySub} />
          {/* Satu blok berbingkai + garis pemisah tunggal (tanpa garis dobel antar kartu) */}
          <div className="-mt-6 px-5 pb-6">
            <ol className="mx-auto grid max-w-2xl divide-y divide-line/60 overflow-hidden rounded-s border border-line/60 bg-bg/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {c.emptyTips.map((tip, n) => (
                <li key={tip} className="flex gap-3 px-4 py-4 text-[13px] leading-relaxed text-fg-2">
                  <span aria-hidden="true" className="pt-px font-mono text-[11px] text-fg-3">
                    {String(n + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">{tip}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Search width={22} height={22} />}
          title={c.noMatch}
          sub={c.noMatchSub}
          action={
            <Button
              size="sm"
              variant="ghost"
              icon={<Xmark width={14} height={14} />}
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              {c.filters.all}
            </Button>
          }
        />
      ) : (
        <>
          <ul>
            {shown.map((item) => {
              const n = order.get(item.key)!;
              return (
                <QueueItemRow
                  key={item.key}
                  item={item}
                  playing={Boolean(item.result && playing === item.result.fileId)}
                  uploadBlock={blockReason(item)}
                  selectable={uploadable.has(item.key)}
                  selectIndex={selIndex.get(item.key) ?? null}
                  canMoveUp={n > 0}
                  canMoveDown={n < items.length - 1}
                  onSelect={() => onToggleSelect(item.key)}
                  onConvert={() => dispatch(enqueue([item.key]))}
                  onRemove={() => dispatch(removeItem(item.key))}
                  onMove={(dir) => dispatch(moveItem({ key: item.key, dir }))}
                  onTogglePlay={() => item.result && onTogglePlay(item.result.fileId)}
                  onUpload={() => onUpload(item)}
                />
              );
            })}
          </ul>
          {(q || active !== "all") && shown.length > 1 && (
            <div className="flex justify-end border-t border-line/70 px-5 py-2">
              <Button
                size="sm"
                variant="subtle"
                className="h-9 px-3"
                icon={<Trash width={14} height={14} />}
                onClick={() => dispatch(removeMany(shown.map((i) => i.key)))}
              >
                {c.removeFiltered}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dock aksi pilihan — menempel di bawah layar selama antrean terlihat (di atas tab bar HP) */}
      {selection.length > 0 && (
        <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 px-3 pb-3 tabless:bottom-6">
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

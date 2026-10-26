"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ClockRotateRight, Discord, Globe, ListSelect, Refresh, Search, Trash, Xmark } from "iconoir-react";
import { useHistoryQuery, useMeQuery } from "@/store/api/baseApi";
import { useAppSelector } from "@/store/hooks";
import { shortName } from "@/lib/shortName";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import CardBox from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Button, { buttonClass } from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import Skeleton from "@/components/ui/Skeleton";
import { inputClass } from "@/components/ui/Field";
import HistoryRow from "./HistoryRow";
import DeleteDialog from "./DeleteDialog";
import { useHistoryActions } from "../_hooks/useHistoryActions";
import { canGoPublic, dayLabel, filterHistory, groupByDay, needsCheck, quickMatch, type HistoryFilter, type QuickSelect } from "../_utils/helpers";
import type { HistoryItem } from "@/type/history";

const RobloxUploadDialog = dynamic(() => import("@/components/roblox/RobloxUploadDialog"), {
  ssr: false,
  loading: () => <PageLoader variant="inline" />,
});
const PermissionDialog = dynamic(() => import("./PermissionDialog"), { ssr: false });

function ListSkeleton() {
  return (
    <ul aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-4 border-b border-line/60 px-5 py-4">
          <Skeleton className="aspect-video w-[120px] shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-40" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="caps truncate text-[10px] text-fg-3">{label}</p>
      <p className="mt-1 font-display text-[22px] font-bold tabular-nums leading-none tracking-[-0.02em]">{value}</p>
    </div>
  );
}

export default function HistoryScreen() {
  const { t, f, lang } = useT();
  const h = t.history;
  const { data: me, isLoading: meLoading } = useMeQuery();
  const loggedIn = Boolean(me?.user);
  const { data, isLoading, isFetching, refetch } = useHistoryQuery(undefined, { skip: !loggedIn });
  const roblox = useAppSelector((s) => s.roblox);
  const actions = useHistoryActions();

  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");
  const [uploadFor, setUploadFor] = useState<HistoryItem | null>(null);
  const [permFor, setPermFor] = useState<HistoryItem | null>(null);
  const [toDelete, setToDelete] = useState<HistoryItem[] | null>(null);

  // Mode pilih (tanpa checkbox): klik kartu = pilih, Shift+klik = rentang, tekan lama di HP = masuk mode
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);

  const items = useMemo(() => data?.items ?? [], [data]);
  const shown = useMemo(() => filterHistory(items, filter, query), [items, filter, query]);
  const groups = useMemo(() => groupByDay(shown), [shown]);
  const publicCandidates = useMemo(() => items.filter(canGoPublic), [items]);
  const pendingCount = useMemo(() => items.filter(needsCheck).length, [items]);
  const hasRoblox = items.some((i) => i.roblox);
  // Pilihan yang sudah tidak ada (terhapus / tersaring) otomatis gugur
  const selected = useMemo(() => shown.filter((i) => picked.has(i.id)), [shown, picked]);

  const exitSelect = useCallback(() => {
    setSelecting(false);
    setPicked(new Set());
    anchor.current = null;
  }, []);

  const toggle = (item: HistoryItem, shift: boolean) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (shift && anchor.current) {
        const a = shown.findIndex((i) => i.id === anchor.current);
        const b = shown.findIndex((i) => i.id === item.id);
        if (a !== -1 && b !== -1) {
          for (const i of shown.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(i.id);
          return next;
        }
      }
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    anchor.current = item.id;
  };

  const quick = (q: QuickSelect) => setPicked(new Set(shown.filter(quickMatch[q]).map((i) => i.id)));

  // Keyboard di mode pilih: Esc keluar, Ctrl/Cmd+A pilih semua yang tampil
  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (toDelete) return;
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea");
      if (e.key === "Escape") exitSelect();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !typing) {
        e.preventDefault();
        setPicked(new Set(shown.map((i) => i.id)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, shown, exitSelect, toDelete]);

  // Cek status senyap tiap 60 dtk selama ada yang direview / izin menunggu (mis. publik setelah Disetujui)
  const { checkAll } = actions;
  useEffect(() => {
    if (!pendingCount || !roblox.apiKey) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkAll(items, true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [pendingCount, roblox.apiKey, items, checkAll]);

  const confirmDelete = async (archive: boolean) => {
    if (!toDelete) return;
    const ok = await actions.removeMany(toDelete, archive);
    if (!ok) return;
    setToDelete(null);
    setPicked((prev) => {
      const next = new Set(prev);
      for (const i of toDelete) next.delete(i.id);
      return next;
    });
  };

  if (meLoading) return <PageLoader />;

  if (!loggedIn) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow={h.eyebrow} title={h.title} sub={h.sub} />
        <CardBox>
          <EmptyState
            icon={<ClockRotateRight width={22} height={22} />}
            title={h.loginTitle}
            sub={h.loginSub}
            action={
              <a href="/api/auth/discord?next=/history" className={buttonClass("primary")}>
                <Discord width={18} height={18} /> {t.login.discord}
              </a>
            }
          />
        </CardBox>
      </div>
    );
  }

  const quickOptions: QuickSelect[] = ["all", "expired", "local", "rejected"];

  return (
    <div className={cn("flex flex-col gap-8", selecting && "pb-36")}>
      <PageHeader
        eyebrow={h.eyebrow}
        title={h.title}
        sub={h.sub}
        actions={
          <>
            {hasRoblox && (
              <Button variant="ghost" loading={actions.checking} icon={<Refresh width={16} height={16} />} onClick={() => actions.checkAll(items)}>
                {actions.checking ? h.checking : h.checkStatus}
              </Button>
            )}
            {publicCandidates.length > 0 && (
              <Button variant="tonal" loading={actions.publishing} icon={<Globe width={16} height={16} />} onClick={() => actions.publishMany(publicCandidates)}>
                {h.publicBulk} <span className="font-mono text-fg-3">{publicCandidates.length}</span>
              </Button>
            )}
            {items.length > 0 && (
              <Button
                variant={selecting ? "primary" : "ghost"}
                icon={selecting ? <Xmark width={16} height={16} /> : <ListSelect width={16} height={16} />}
                onClick={() => (selecting ? exitSelect() : setSelecting(true))}
                aria-pressed={selecting}
              >
                {selecting ? h.selectDone : h.select}
              </Button>
            )}
          </>
        }
      />

      {items.length > 0 && (
        <div className="rise grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label={h.stats.total} value={items.length} />
          <Stat label={h.stats.onRoblox} value={items.filter((i) => i.roblox?.assetId).length} />
          <Stat label={h.stats.reviewing} value={items.filter((i) => i.roblox?.state === "Reviewing").length} />
          <Stat label={h.stats.files} value={items.filter((i) => i.fileAvailable).length} />
        </div>
      )}

      <CardBox className="rise overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-5">
          <div className="relative flex-1">
            <Search width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden="true" />
            <input
              type="search"
              aria-label={h.search}
              placeholder={h.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <Segmented
            label="Filter"
            className="sm:w-[380px]"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: h.filterAll },
              { value: "uploaded", label: h.filterUploaded },
              { value: "local", label: h.filterLocal },
            ]}
          />
        </div>

        {selecting && <p className="border-b border-line/60 bg-bg/30 px-5 py-2.5 text-[12.5px] text-fg-3">{h.selectHint}</p>}

        {isLoading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClockRotateRight width={22} height={22} />}
            title={h.emptyTitle}
            sub={h.emptySub}
            action={
              <a href="/converter" className={buttonClass("primary")}>
                {t.landing.ctaStart}
              </a>
            }
          />
        ) : shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-[14px] text-fg-3">{h.noResult}</p>
        ) : (
          <div aria-busy={isFetching} className={cn("transition-opacity", isFetching && "opacity-70")}>
            {groups.map((g) => (
              <section key={g.day} aria-label={dayLabel(g.day, t, lang)}>
                <h2 className="caps flex items-center justify-between border-b border-line/60 bg-bg/40 px-5 py-2 text-[10.5px] text-fg-3">
                  <span>{dayLabel(g.day, t, lang)}</span>
                  <span className="font-mono normal-case tracking-normal">{g.items.length}</span>
                </h2>
                <ul>
                  {g.items.map((item) => (
                    <HistoryRow
                      key={item.id}
                      item={item}
                      selecting={selecting}
                      selected={picked.has(item.id)}
                      onToggle={(shift) => toggle(item, shift)}
                      onLongPress={() => {
                        setSelecting(true);
                        setPicked(new Set([item.id]));
                        anchor.current = item.id;
                      }}
                      onUpload={() => setUploadFor(item)}
                      onPermission={() => setPermFor(item)}
                      onDelete={() => setToDelete([item])}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </CardBox>

      {/* Bar aksi mode pilih — melayang di atas tab bar HP */}
      {selecting && (
        <div
          role="toolbar"
          aria-label={f(h.selected, { n: selected.length })}
          className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 xl:bottom-6"
        >
          <div className="mat flex w-full max-w-3xl animate-[dock-in_.4s_var(--ease)_both] flex-col gap-3 rounded-l border border-line/70 bg-[var(--glass)] p-3 shadow-[var(--elev-3)] backdrop-blur-xl sm:flex-row sm:items-center">
            <p className="shrink-0 px-2 text-[14px] font-semibold tabular-nums" aria-live="polite">
              {selected.length ? f(h.selected, { n: selected.length }) : h.selectNone}
            </p>
            <div className="thin-scroll flex flex-1 gap-1.5 overflow-x-auto">
              {quickOptions.map((q) => {
                const n = shown.filter(quickMatch[q]).length;
                return (
                  <button
                    key={q}
                    type="button"
                    disabled={n === 0}
                    onClick={() => quick(q)}
                    className="state-layer inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-s border border-line px-3 text-[12.5px] font-semibold text-fg-2 transition-colors hover:border-line-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {h.quick[q]}
                    <span className="font-mono text-[11px] text-fg-3">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="subtle" size="sm" onClick={exitSelect}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" size="sm" disabled={!selected.length} onClick={() => setToDelete(selected)} icon={<Trash aria-hidden="true" />}>
                {h.deleteSelected}
                {selected.length > 0 && <span className="font-mono">{selected.length}</span>}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DeleteDialog items={toDelete} hasKey={Boolean(roblox.apiKey)} busy={actions.deleting} onClose={() => setToDelete(null)} onConfirm={confirmDelete} />

      {uploadFor && (
        <RobloxUploadDialog
          title={uploadFor.title}
          block={!roblox.apiKey || !roblox.creatorId ? "key" : null}
          initial={{
            displayName: shortName(uploadFor.title),
            description: "",
            creatorType: roblox.creatorType,
            creatorId: roblox.creatorId,
            permission: roblox.defaultPermission,
            placeId: roblox.placeId,
          }}
          onClose={() => setUploadFor(null)}
          onSubmit={async (form) => {
            const ok = await actions.upload(uploadFor, form);
            if (ok) void refetch();
            return ok;
          }}
        />
      )}
      {permFor && <PermissionDialog entry={permFor} onClose={() => setPermFor(null)} onApply={(mode, placeId) => actions.setPermission(permFor, mode, placeId)} />}
    </div>
  );
}

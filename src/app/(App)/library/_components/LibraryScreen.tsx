"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Album, Check, Copy, Discord, Download, Globe, OpenNewWindow, Pause, Refresh, Search, Trash, Undo } from "iconoir-react";
import { useMeQuery } from "@/store/api/baseApi";
import { cn, copyText } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useHydrated } from "@/hooks/useHydrated";
import { useConfirm } from "@/hooks/useConfirm";
import { robloxAssetConfigureUrl } from "@/Url/Url";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import CardBox from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Button, { ButtonLink, buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { stateTone } from "../../history/_utils/helpers";
import { useLibrary } from "../_hooks/useLibrary";
import { parseIds } from "../_service/library.service";
import ExportDialog from "./ExportDialog";

type LibFilter = "all" | "Approved" | "Reviewing" | "Rejected" | "archived";
const FILTERS: LibFilter[] = ["all", "Approved", "Reviewing", "Rejected", "archived"];

export default function LibraryScreen() {
  const { t, f } = useT();
  const L = t.library;
  const toast = useToast();
  const hydrated = useHydrated();
  const { data: me, isLoading: meLoading } = useMeQuery();
  const lib = useLibrary();
  const [confirm, confirmDialog] = useConfirm();
  const removeSelected = async () => {
    const ids = [...lib.selected];
    if (ids.length && (await confirm(f(L.archiveConfirm, { n: ids.length })))) void lib.archive(ids, true);
  };
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const place = placeId ?? lib.savedPlace;

  const [filter, setFilter] = useState<LibFilter>("all");
  // Arsip disembunyikan kecuali tab "Arsip" dipilih
  const counts = useMemo(() => {
    const c: Record<LibFilter, number> = { all: 0, Approved: 0, Reviewing: 0, Rejected: 0, archived: 0 };
    for (const a of lib.assets) {
      if (a.archived) c.archived++;
      else {
        c.all++;
        if (a.state === "Approved" || a.state === "Reviewing" || a.state === "Rejected") c[a.state]++;
      }
    }
    return c;
  }, [lib.assets]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lib.assets.filter((a) => {
      if (filter === "archived" ? !a.archived : a.archived) return false;
      if (filter !== "all" && filter !== "archived" && a.state !== filter) return false;
      return !q || a.assetId.includes(q) || Boolean(a.name?.toLowerCase().includes(q));
    });
  }, [lib.assets, query, filter]);
  const [exportOpen, setExportOpen] = useState(false);
  const selectedAssets = useMemo(() => lib.assets.filter((a) => lib.selected.has(a.assetId)), [lib.assets, lib.selected]);

  // Bar aksi massal muncul → FAB "ke atas" naik di atasnya (lewat CSS var, FAB ada di Header)
  const bar = useRef<HTMLFormElement>(null);
  const hasSel = lib.selected.size > 0;
  useEffect(() => {
    const root = document.documentElement;
    const el = bar.current;
    if (!hasSel || !el) {
      root.style.removeProperty("--fab-lift");
      return;
    }
    const ro = new ResizeObserver(() => root.style.setProperty("--fab-lift", `${el.offsetHeight + 12}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--fab-lift");
    };
  }, [hasSel]);

  const allOn = shown.length > 0 && shown.every((a) => lib.selected.has(a.assetId));
  const manualIds = parseIds(manual);

  // Infinite scroll ala YouTube: sentinel di dasar daftar, halaman berikut dimuat ~600px sebelum terlihat
  const loadMore = useRef(() => {});
  useEffect(() => {
    loadMore.current = () => {
      if (lib.nextToken && !lib.loading) void lib.load({ more: true });
    };
  });
  const observer = useRef<IntersectionObserver | null>(null);
  const sentinel = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new IntersectionObserver(([e]) => e.isIntersecting && loadMore.current(), { rootMargin: "600px 0px" });
    observer.current.observe(el);
  }, []);

  if (!hydrated || meLoading) return <PageLoader />;

  const header = <PageHeader eyebrow={L.eyebrow} title={L.title} sub={L.sub} />;

  if (!me?.user) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <CardBox>
          <EmptyState
            icon={<Album width={22} height={22} />}
            title={t.history.loginTitle}
            sub={t.history.loginSub}
            action={
              <a href="/api/auth/discord?next=/library" className={buttonClass("primary")}>
                <Discord width={18} height={18} /> {t.login.discord}
              </a>
            }
          />
        </CardBox>
      </div>
    );
  }

  if (!lib.ready) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <CardBox>
          <EmptyState
            icon={<Album width={22} height={22} />}
            title={L.needKeyTitle}
            sub={L.needKeySub}
            action={
              <ButtonLink href="/settings" variant="primary">
                {t.converter.panel.setupKey}
              </ButtonLink>
            }
          />
        </CardBox>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <PageHeader
        eyebrow={L.eyebrow}
        title={L.title}
        sub={L.sub}
        actions={
          <>
            {lib.assets.length > 0 && (
              <Button variant="tonal" icon={<Download width={16} height={16} />} onClick={() => setExportOpen(true)}>
                {L.export}
              </Button>
            )}
            {lib.ownerType === "user" &&
              (lib.loadingAll != null ? (
                <Button variant="tonal" icon={<Pause width={16} height={16} />} onClick={lib.stopLoadAll}>
                  {f(L.loadingAll, { n: lib.loadingAll })} · {L.stop}
                </Button>
              ) : (
                <>
                  <Button variant="tonal" disabled={lib.loading} onClick={() => void lib.loadAll()}>
                    {L.loadAll}
                  </Button>
                  <Button variant="primary" loading={lib.loading} icon={<Refresh width={16} height={16} />} onClick={() => lib.load()}>
                    {lib.loading ? L.loading : L.load}
                  </Button>
                </>
              ))}
          </>
        }
      />

      <CardBox className="rise overflow-hidden">
        {/* Toolbar: cari + tempel asset ID manual */}
        <div className="grid gap-3 border-b border-line p-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="relative">
            <Search width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden="true" />
            <input
              type="search"
              aria-label={L.search}
              placeholder={L.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualIds.length) return;
              void lib.load({ assetIds: manualIds }).then(() => setManual(""));
            }}
          >
            <input
              aria-label={L.manualLabel}
              title={L.manualHint}
              placeholder={`${L.manualLabel}: ${L.manualPlaceholder}`}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className={cn(inputClass, "min-w-0 flex-1 font-mono text-[13px]")}
            />
            <Button type="submit" variant="tonal" disabled={!manualIds.length || lib.loading}>
              {L.manualLoad}
              {manualIds.length > 0 && <span className="font-mono text-fg-3">{manualIds.length}</span>}
            </Button>
          </form>
        </div>

        {lib.assets.length === 0 ? (
          lib.loading ? (
            <PageLoader variant="inline" />
          ) : (
            <EmptyState icon={<Album width={22} height={22} />} title={L.emptyTitle} sub={`${L.emptySub} ${L.manualHint}`} />
          )
        ) : (
          <>
            {/* Filter status — tab teks bergaris bawah (konsisten dengan navbar) */}
            <div role="tablist" aria-label={L.filterLabel} className="thin-scroll flex gap-1 overflow-x-auto border-b border-line/70 px-2 sm:px-3">
              {FILTERS.map((k) => {
                const on = filter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(k)}
                    className={cn(
                      "relative flex h-12 shrink-0 cursor-pointer items-center gap-2 px-3 text-[13.5px] font-medium transition-colors",
                      on ? "text-fg" : "text-fg-3 hover:text-fg",
                    )}
                  >
                    {L.filters[k]}
                    <span className={cn("font-mono text-[11.5px]", on ? "text-fg-2" : "text-fg-3")}>{counts[k]}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-fg transition-[transform,opacity] duration-300 ease-[var(--ease)]",
                        on ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex h-12 items-center justify-between gap-3 border-b border-line/70 px-4 text-[13px] sm:px-5">
              <button
                type="button"
                onClick={() =>
                  lib.setSelected((s) => {
                    const n = new Set(s);
                    for (const a of shown) {
                      if (allOn) n.delete(a.assetId);
                      else n.add(a.assetId);
                    }
                    return n;
                  })
                }
                className="flex cursor-pointer items-center gap-3 font-medium text-fg-2 hover:text-fg"
              >
                <Box on={allOn} />
                {L.selectAll}
              </button>
              <span className="font-mono text-fg-3">{shown.length}</span>
            </div>
            <ul>
              {shown.map((a) => {
                const on = lib.selected.has(a.assetId);
                const g = lib.grants[a.assetId];
                const notOwner = a.creatorId != null && (a.creatorType !== lib.ownerType || a.creatorId !== lib.ownerId);
                return (
                  <li
                    key={a.assetId}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/70 px-4 py-3 transition-colors last:border-b-0 sm:px-5",
                      on && "bg-raised/50",
                      a.archived && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={a.name ?? a.assetId}
                      onClick={() => lib.toggle(a.assetId)}
                      className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-hover"
                    >
                      <Box on={on} />
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-semibold">{a.name ?? a.error ?? a.assetId}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <button
                          type="button"
                          title={L.copyId}
                          onClick={async () => (await copyText(a.assetId)) && toast(t.toast.copied, "ok")}
                          className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[12px] text-fg-3 hover:text-fg"
                        >
                          {a.assetId} <Copy width={12} height={12} />
                        </button>
                        {a.state && (
                          <Badge tone={stateTone(a.state)} dot>
                            {t.history.states[a.state]}
                          </Badge>
                        )}
                        {a.archived && <Badge tone="err">{L.archived}</Badge>}
                        {notOwner && <Badge tone="warn">{L.notOwner}</Badge>}
                        {g && (
                          <span title={g.status === "failed" ? g.message : undefined}>
                            <Badge tone={g.status === "granted" ? "ok" : "err"}>{g.status === "granted" ? L.granted : L.failed}</Badge>
                          </span>
                        )}
                      </div>
                      {g?.status === "failed" && <p className="mt-1 text-[12px] leading-snug text-err">{g.message}</p>}
                    </div>
                    {a.archived ? (
                      <Button size="sm" variant="ghost" loading={lib.archiving} icon={<Undo width={16} height={16} />} onClick={() => lib.archive([a.assetId], false)}>
                        {L.restore}
                      </Button>
                    ) : (
                      <a
                        href={robloxAssetConfigureUrl(a.assetId)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={L.openDashboard}
                        title={L.openDashboard}
                        className="grid size-10 place-items-center rounded-full text-fg-3 transition-colors hover:bg-hover hover:text-fg"
                      >
                        <OpenNewWindow width={16} height={16} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
            {lib.nextToken && (
              // key = jumlah aset → sentinel dipasang ulang tiap halaman masuk, jadi tetap memicu kalau masih terlihat
              <div key={lib.assets.length} ref={sentinel} className="flex h-16 items-center justify-center border-t border-line/70 text-fg-3">
                {lib.loading && <Spinner />}
                <span className="sr-only">{L.loadMore}</span>
              </div>
            )}
          </>
        )}
      </CardBox>

      <p className="-mt-4 text-[12.5px] leading-relaxed text-fg-3">
        {L.publicNote} {L.archiveNote}
      </p>
      {confirmDialog}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} shown={shown} selected={selectedAssets} partial={Boolean(lib.nextToken)} />

      {/* Bar aksi massal — muncul saat ada yang dipilih, di atas tab bar HP */}
      <div
        className={cn(
          "fixed inset-x-0 z-40 px-4 transition-[transform,opacity] duration-300 ease-[var(--ease)] bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-6",
          lib.selected.size ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        )}
        aria-hidden={!lib.selected.size}
      >
        <form
          ref={bar}
          className="mat mx-auto flex max-w-[760px] flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-raised p-2 pl-4 shadow-[var(--elev-3)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{1,20}$/.test(place)) void lib.grant("place", place);
          }}
        >
          <span className="text-[13.5px] font-semibold">{f(L.selected, { n: lib.selected.size })}</span>
          <button
            type="button"
            tabIndex={lib.selected.size ? 0 : -1}
            onClick={() => lib.setSelected(new Set())}
            className="cursor-pointer text-[12.5px] text-fg-3 underline decoration-line-2 underline-offset-4 hover:text-fg"
          >
            {L.clear}
          </button>
          <Button
            type="button"
            size="sm"
            variant="tonal"
            tabIndex={lib.selected.size ? 0 : -1}
            loading={lib.granting}
            icon={<Globe width={16} height={16} />}
            onClick={() => lib.grant("public")}
          >
            {L.makePublic}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            tabIndex={lib.selected.size ? 0 : -1}
            loading={lib.archiving}
            icon={<Trash width={16} height={16} />}
            onClick={removeSelected}
          >
            {L.archive}
          </Button>
          <div className="ml-auto flex min-w-0 flex-1 gap-2 sm:flex-none">
            <input
              aria-label={L.placeId}
              placeholder={L.placeId}
              inputMode="numeric"
              tabIndex={lib.selected.size ? 0 : -1}
              value={place}
              onChange={(e) => setPlaceId(e.target.value.replace(/\D/g, ""))}
              className={cn(inputClass, "h-10 min-w-0 flex-1 font-mono text-[13px] sm:w-44")}
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              tabIndex={lib.selected.size ? 0 : -1}
              loading={lib.granting}
              disabled={!/^\d{1,20}$/.test(place)}
            >
              {lib.granting ? L.granting : L.grantPlace}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-[18px] place-items-center rounded-[4px] border-2 transition-colors",
        on ? "border-accent bg-accent text-on-accent" : "border-fg-3",
      )}
    >
      {on && <Check width={14} height={14} strokeWidth={2.6} />}
    </span>
  );
}

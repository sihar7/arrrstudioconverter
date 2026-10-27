"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { withBase } from "@/Url/Url";
import { Album, Crown, Discord, Download, Globe, ListSelect, Lock, Pause, Refresh, Search, Trash, Xmark } from "iconoir-react";
import { useMeQuery } from "@/store/api/baseApi";
import { cn } from "@/lib/utils";
import { PLANS, cheapestPlan } from "@/lib/schemas/plans";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import { useConfirm } from "@/hooks/useConfirm";
import { useSelectMode } from "@/hooks/useSelectMode";
import SelectionDock from "@/components/shared/SelectionDock";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import CardBox from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Spinner from "@/components/ui/Spinner";
import Button, { ButtonLink, buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { useLibrary } from "../_hooks/useLibrary";
import { parseIds } from "../_service/library.service";
import ExportDialog from "@/components/shared/ExportDialog";
import LibraryRow from "./LibraryRow";

type LibFilter = "all" | "Approved" | "Reviewing" | "Rejected" | "archived";
const FILTERS: LibFilter[] = ["all", "Approved", "Reviewing", "Rejected", "archived"];

export default function LibraryScreen() {
  const { t, f } = useT();
  const L = t.library;
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
  const [exportOpen, setExportOpen] = useState(false);
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
  const selectedAssets = useMemo(() => lib.assets.filter((a) => lib.selected.has(a.assetId)), [lib.assets, lib.selected]);

  // Mode pilih tanpa checkbox (sama dengan Riwayat) — pilihan disimpan di useLibrary untuk izin/arsip massal
  const shownIds = useMemo(() => shown.map((a) => a.assetId), [shown]);
  const sel = useSelectMode(shownIds, [lib.selected, lib.setSelected], exportOpen);
  const pickCount = shown.filter((a) => lib.selected.has(a.assetId)).length;
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
              <a href={withBase("/api/auth/discord?next=/library")} className={buttonClass("primary")}>
                <Discord width={18} height={18} /> {t.login.discord}
              </a>
            }
          />
        </CardBox>
      </div>
    );
  }

  // Audio saya khusus plan tertentu (Pro+) — server juga menolak dengan 403 PLAN_REQUIRED
  if (PLANS[me.plan?.id ?? "free"].library === "off") {
    const need = t.plan.names[cheapestPlan((p) => p.library !== "off")];
    return (
      <div className="flex flex-col gap-8">
        {header}
        <CardBox>
          <EmptyState
            icon={<Lock width={22} height={22} />}
            title={f(t.plan.locked, { plan: need })}
            sub={L.lockedSub}
            action={
              <ButtonLink href="/pricing" variant="primary" icon={<Crown width={18} height={18} aria-hidden="true" />}>
                {f(t.pricing.switchTo, { plan: need })}
              </ButtonLink>
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

  const fullLib = PLANS[me.plan?.id ?? "free"].library === "full";
  const fullPlan = t.plan.names[cheapestPlan((p) => p.library === "full")];

  return (
    <div className={cn("flex flex-col gap-8 pb-24", sel.selecting && "pb-44")}>
      <PageHeader
        eyebrow={L.eyebrow}
        title={L.title}
        sub={L.sub}
        actions={
          <>
            {lib.assets.length > 0 && (
              <Button
                variant={sel.selecting ? "primary" : "ghost"}
                icon={sel.selecting ? <Xmark width={16} height={16} /> : <ListSelect width={16} height={16} />}
                onClick={() => (sel.selecting ? sel.exit() : sel.start())}
                aria-pressed={sel.selecting}
              >
                {sel.selecting ? L.selectDone : L.select}
              </Button>
            )}
            {/* Muat semua & ekspor khusus plan "full" (Studio); di bawahnya tampil terkunci → ke halaman Harga */}
            {lib.assets.length > 0 &&
              (fullLib ? (
                <Button variant="tonal" icon={<Download width={16} height={16} />} onClick={() => setExportOpen(true)}>
                  {L.export}
                </Button>
              ) : (
                <ButtonLink href="/pricing" variant="subtle" icon={<Lock width={16} height={16} />} title={f(L.fullLocked, { plan: fullPlan })}>
                  {L.export} · {fullPlan}
                </ButtonLink>
              ))}
            {lib.ownerType === "user" &&
              (lib.loadingAll != null ? (
                <Button variant="tonal" icon={<Pause width={16} height={16} />} onClick={lib.stopLoadAll}>
                  {f(L.loadingAll, { n: lib.loadingAll })} · {L.stop}
                </Button>
              ) : (
                <>
                  {fullLib ? (
                    <Button variant="tonal" disabled={lib.loading} onClick={() => void lib.loadAll()}>
                      {L.loadAll}
                    </Button>
                  ) : (
                    <ButtonLink href="/pricing" variant="subtle" icon={<Lock width={16} height={16} />} title={f(L.fullLocked, { plan: fullPlan })}>
                      {L.loadAll} · {fullPlan}
                    </ButtonLink>
                  )}
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
            {/* Petunjuk komunikatif: apa yang terjadi kalau baris diketuk */}
            <p className="flex h-11 items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 text-[13px] text-fg-3 sm:px-5">
              <span className="truncate">
                <span className="sm:hidden">{t.common.tapToSelect}</span>
                <span className="hidden sm:inline">{sel.selecting ? L.selectHint : t.common.tapToSelect}</span>
              </span>
              <span className="shrink-0 font-mono">{shown.length}</span>
            </p>
            <ul>
              {shown.map((a) => (
                <LibraryRow
                  key={a.assetId}
                  asset={a}
                  selecting={sel.selecting}
                  selected={lib.selected.has(a.assetId)}
                  notOwner={a.creatorId != null && (a.creatorType !== lib.ownerType || a.creatorId !== lib.ownerId)}
                  grant={lib.grants[a.assetId]}
                  restoring={lib.archiving}
                  onPick={(shift) => (sel.selecting ? sel.toggle(a.assetId, shift) : sel.start(a.assetId))}
                  onLongPress={() => sel.start(a.assetId)}
                  onRestore={() => lib.archive([a.assetId], false)}
                />
              ))}
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

      {/* Dock aksi massal (mode pilih) — pengganti checkbox + bar lama */}
      <SelectionDock
        open={sel.selecting}
        count={pickCount}
        label={pickCount ? t.common.pickedWord : t.common.tapToSelect}
        onExit={sel.exit}
        quick={[
          { key: "all", label: L.selectAllShown, n: shown.length, onClick: () => sel.pick(shownIds) },
          ...(["Approved", "Reviewing", "Rejected"] as const).map((k) => {
            const ids = shown.filter((a) => a.state === k).map((a) => a.assetId);
            return { key: k, label: L.filters[k], n: ids.length, onClick: () => sel.pick(ids) };
          }),
        ]}
      >
        <Button size="sm" variant="tonal" disabled={!pickCount} loading={lib.granting} icon={<Globe />} onClick={() => lib.grant("public")}>
          {L.makePublic}
        </Button>
        <Button size="sm" variant="danger" disabled={!pickCount} loading={lib.archiving} icon={<Trash />} onClick={removeSelected}>
          {L.archive}
        </Button>
        <form
          className="flex min-w-0 basis-full gap-2 sm:basis-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (pickCount && /^\d{1,20}$/.test(place)) void lib.grant("place", place);
          }}
        >
          <input
            aria-label={L.placeId}
            placeholder={L.placeId}
            inputMode="numeric"
            value={place}
            onChange={(e) => setPlaceId(e.target.value.replace(/\D/g, ""))}
            className={cn(inputClass, "h-9 min-w-0 flex-1 rounded-full font-mono text-[13px] sm:w-36")}
          />
          <Button type="submit" size="sm" variant="primary" loading={lib.granting} disabled={!pickCount || !/^\d{1,20}$/.test(place)}>
            {lib.granting ? L.granting : L.grantPlace}
          </Button>
        </form>
      </SelectionDock>
    </div>
  );
}

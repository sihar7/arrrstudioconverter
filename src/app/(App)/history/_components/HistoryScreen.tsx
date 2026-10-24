"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ClockRotateRight, Discord, Globe, Refresh, Search, Trash } from "iconoir-react";
import { useHistoryQuery, useMeQuery } from "@/store/api/baseApi";
import { useAppSelector } from "@/store/hooks";
import { shortName } from "@/lib/shortName";
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
import { useHistoryActions } from "../_hooks/useHistoryActions";
import { canGoPublic, filterHistory, needsCheck, type HistoryFilter } from "../_utils/helpers";
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
        <li key={i} className="grid grid-cols-[88px_1fr] gap-4 border-b border-line px-5 py-4 sm:grid-cols-[112px_1fr]">
          <Skeleton className="aspect-video w-full" />
          <div className="flex flex-col gap-2 pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-40" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function HistoryScreen() {
  const { t } = useT();
  const { data: me, isLoading: meLoading } = useMeQuery();
  const loggedIn = Boolean(me?.user);
  const { data, isLoading, isFetching, refetch } = useHistoryQuery(undefined, { skip: !loggedIn });
  const roblox = useAppSelector((s) => s.roblox);
  const actions = useHistoryActions();

  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");
  const [uploadFor, setUploadFor] = useState<HistoryItem | null>(null);
  const [permFor, setPermFor] = useState<HistoryItem | null>(null);

  const items = useMemo(() => data?.items ?? [], [data]);
  const shown = useMemo(() => filterHistory(items, filter, query), [items, filter, query]);
  const hasRoblox = items.some((i) => i.roblox);
  const publicCandidates = useMemo(() => items.filter(canGoPublic), [items]);
  const pendingCount = useMemo(() => items.filter(needsCheck).length, [items]);

  // Cek status senyap tiap 60 dtk selama ada yang direview / izin menunggu (mis. publik setelah Disetujui)
  const { checkAll } = actions;
  useEffect(() => {
    if (!pendingCount || !roblox.apiKey) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkAll(items, true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [pendingCount, roblox.apiKey, items, checkAll]);

  if (meLoading) return <PageLoader />;

  if (!loggedIn) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow={t.history.eyebrow} title={t.history.title} sub={t.history.sub} />
        <CardBox>
          <EmptyState
            icon={<ClockRotateRight width={22} height={22} />}
            title={t.history.loginTitle}
            sub={t.history.loginSub}
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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t.history.eyebrow}
        title={t.history.title}
        sub={t.history.sub}
        actions={
          <>
            {hasRoblox && (
              <Button
                variant="ghost"
                loading={actions.checking}
                icon={<Refresh width={16} height={16} />}
                onClick={() => actions.checkAll(items)}
              >
                {actions.checking ? t.history.checking : t.history.checkStatus}
              </Button>
            )}
            {publicCandidates.length > 0 && (
              <Button
                variant="tonal"
                loading={actions.publishing}
                icon={<Globe width={16} height={16} />}
                onClick={() => actions.publishMany(publicCandidates)}
              >
                {t.history.publicBulk} <span className="font-mono text-fg-3">{publicCandidates.length}</span>
              </Button>
            )}
            {items.length > 0 && (
              <Button variant="danger" loading={actions.clearing} icon={<Trash width={16} height={16} />} onClick={actions.clearAll}>
                {t.history.clearAll}
              </Button>
            )}
          </>
        }
      />

      <CardBox className="rise overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-5">
          <div className="relative flex-1">
            <Search width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden="true" />
            <input
              type="search"
              aria-label={t.history.search}
              placeholder={t.history.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <Segmented
            label="Filter"
            className="sm:w-[360px]"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t.history.filterAll },
              { value: "uploaded", label: t.history.filterUploaded },
              { value: "local", label: t.history.filterLocal },
            ]}
          />
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClockRotateRight width={22} height={22} />}
            title={t.history.emptyTitle}
            sub={t.history.emptySub}
            action={
              <a href="/converter" className={buttonClass("primary")}>
                {t.landing.ctaStart}
              </a>
            }
          />
        ) : shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-[14px] text-fg-3">{t.history.noResult}</p>
        ) : (
          <ul aria-busy={isFetching} className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            {shown.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                onUpload={() => setUploadFor(item)}
                onPermission={() => setPermFor(item)}
                onDelete={() => actions.remove(item.id)}
              />
            ))}
          </ul>
        )}
      </CardBox>

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
      {permFor && (
        <PermissionDialog entry={permFor} onClose={() => setPermFor(null)} onApply={(mode, placeId) => actions.setPermission(permFor, mode, placeId)} />
      )}
      {actions.confirmDialog}
    </div>
  );
}

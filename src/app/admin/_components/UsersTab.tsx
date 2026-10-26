"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Crown, Group, LogOut, Search, Trash } from "iconoir-react";
import EmptyState from "@/components/shared/EmptyState";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/hooks/useToast";
import type { AdminUser } from "@/type/admin";
import { getUsers, revokeUser } from "../_service/admin.service";
import { errorText, useAdminConfirm, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ErrorBox, ListBox, ListSkeleton, RefreshButton, Toolbar, ago, dateShort, nf } from "./parts";
import PlanDialog from "./PlanDialog";

const COLS = "md:grid-cols-[minmax(0,1.5fr)_150px_80px_90px_120px_auto]";

type PlanFilter = "all" | "paid" | "free";
const PLAN_LABEL = { free: "Free", pro: "Pro", studio: "Studio" } as const;

export default function UsersTab() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useAdminData(() => getUsers(q), [q]);
  const toast = useToast();
  const guard = useAuthGuard();
  const [confirm, dialog] = useAdminConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const shown = (data?.items ?? []).filter((u) => planFilter === "all" || (planFilter === "paid" ? u.plan !== "free" : u.plan === "free"));

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const act = async (u: AdminUser, purge: boolean) => {
    const name = u.displayName ?? u.username ?? u.id;
    const ok = await confirm(
      purge
        ? {
            title: "Hapus data user",
            message: `${name} akan dikeluarkan dari semua perangkat dan seluruh riwayat convert & spoof-nya dihapus permanen.`,
            action: "Hapus data",
          }
        : {
            title: "Paksa keluar",
            message: `${name} akan dikeluarkan dari semua perangkat. Riwayat tetap tersimpan.`,
            action: "Paksa keluar",
          },
    );
    if (!ok) return;
    setBusy(`${u.id}:${purge}`);
    try {
      const r = await revokeUser(u.id, purge);
      toast(purge ? `${r.sessions} sesi dicabut, ${r.rows} data dihapus` : `${r.sessions} sesi dicabut`, "ok");
      void reload();
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <Toolbar
        actions={
          <>
            <Segmented
              size="sm"
              label="Filter plan"
              value={planFilter}
              onChange={setPlanFilter}
              className="w-[240px]"
              options={[
                { value: "all", label: "Semua" },
                { value: "paid", label: "Berbayar" },
                { value: "free", label: "Free" },
              ]}
            />
            <RefreshButton loading={loading} onClick={reload} />
          </>
        }
      >
        <div className="relative max-w-md">
          <Search width={18} height={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-3" />
          <Input
            type="search"
            aria-label="Cari user (nama, username, atau ID Discord)"
            placeholder="Cari nama, username, ID…"
            className="pl-11"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
      </Toolbar>

      {error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Group width={26} height={26} />}
          title={q ? "Tidak ada yang cocok" : "Belum ada user"}
          sub={q ? "Coba kata kunci lain." : "User muncul setelah login Discord atau convert pertama."}
        />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-fg-3" aria-live="polite">
            {nf(shown.length)} user{planFilter !== "all" && ` dari ${nf(data.items.length)}`}
          </p>
          <ListBox
            head={
              <div className={`grid gap-4 ${COLS}`}>
                <span>User</span>
                <span>Plan</span>
                <span>Sesi</span>
                <span>Convert</span>
                <span>Aktivitas</span>
                <span className="sr-only">Aksi</span>
              </div>
            }
          >
            {shown.map((u) => {
              const last = Math.max(u.lastLoginAt ?? 0, u.lastConvertAt ?? 0) || null;
              return (
                <li key={u.id} className={`grid grid-cols-1 gap-3 px-5 py-4 md:items-center md:gap-4 ${COLS}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    {u.avatarUrl ? (
                      <Image src={u.avatarUrl} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full" />
                    ) : (
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tonal text-[13px] font-semibold text-on-tonal">
                        {(u.displayName ?? u.username ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{u.displayName ?? u.username ?? "Tanpa profil"}</p>
                      <p className="truncate font-mono text-[12px] text-fg-3">
                        {u.username ? `@${u.username} · ` : ""}
                        {u.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <Badge tone={u.plan === "free" ? "neutral" : "accent"} dot={u.plan !== "free"}>
                      {PLAN_LABEL[u.plan]}
                    </Badge>
                    {u.plan !== "free" && (
                      <span className="text-[12px] text-fg-3">{u.planExpiresAt ? `s/d ${dateShort(u.planExpiresAt)}` : "permanen"}</span>
                    )}
                  </div>
                  <p className="text-[14px] tabular-nums text-fg-2">
                    <span className="caps mr-2 text-[10.5px] text-fg-3 md:hidden">Sesi</span>
                    {nf(u.sessions)}
                  </p>
                  <p className="text-[14px] tabular-nums text-fg-2">
                    <span className="caps mr-2 text-[10.5px] text-fg-3 md:hidden">Convert</span>
                    {nf(u.conversions)}
                  </p>
                  <p className="text-[14px] text-fg-2">
                    <span className="caps mr-2 text-[10.5px] text-fg-3 md:hidden">Aktif</span>
                    {ago(last)}
                  </p>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      size="sm"
                      variant="tonal"
                      onClick={() => setEditing(u)}
                      icon={<Crown aria-hidden="true" />}
                      aria-label={`Atur plan ${u.displayName ?? u.id}`}
                    >
                      Plan
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={u.sessions === 0}
                      loading={busy === `${u.id}:false`}
                      onClick={() => act(u, false)}
                      icon={<LogOut aria-hidden="true" />}
                      aria-label={`Paksa keluar ${u.displayName ?? u.id}`}
                    >
                      Keluarkan
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busy === `${u.id}:true`}
                      onClick={() => act(u, true)}
                      icon={<Trash aria-hidden="true" />}
                      aria-label={`Hapus data ${u.displayName ?? u.id}`}
                    >
                      Hapus
                    </Button>
                  </div>
                </li>
              );
            })}
          </ListBox>
        </>
      )}
      <PlanDialog user={editing} onClose={() => setEditing(null)} onSaved={reload} />
      {dialog}
    </div>
  );
}

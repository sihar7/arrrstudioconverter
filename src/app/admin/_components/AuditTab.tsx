"use client";

import { ShieldCheck } from "iconoir-react";
import EmptyState from "@/components/shared/EmptyState";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { getAudit } from "../_service/admin.service";
import { useAdminData } from "../_hooks/useAdmin";
import { ErrorBox, ListBox, ListSkeleton, RefreshButton, Toolbar } from "./parts";

const ACTION: Record<string, string> = {
  login: "Masuk",
  "login.fail": "Gagal masuk",
  "login.locked": "Akun dikunci",
  logout: "Keluar",
  "user.revoke": "Paksa keluar user",
  "user.purge": "Hapus data user",
  "file.delete": "Hapus file",
  "maintenance.cleanup": "Bersihkan storage",
  "maintenance.revoke-admin": "Cabut sesi admin",
  "system.janitor": "Jalankan janitor",
};

const COLS = "md:grid-cols-[170px_minmax(0,1.4fr)_minmax(0,1fr)_120px]";

export default function AuditTab() {
  const { data, error, loading, reload } = useAdminData(getAudit, []);

  return (
    <div>
      <Toolbar actions={<RefreshButton loading={loading} onClick={reload} />}>
        <p className="text-[13px] text-fg-3">150 aktivitas admin terbaru. IP disimpan dalam bentuk hash.</p>
      </Toolbar>

      {error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <ListSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState icon={<ShieldCheck width={26} height={26} />} title="Belum ada aktivitas" />
      ) : (
        <ListBox
          head={
            <div className={`grid gap-4 ${COLS}`}>
              <span>Waktu</span>
              <span>Aksi</span>
              <span>Target</span>
              <span>IP</span>
            </div>
          }
        >
          {data.items.map((a) => (
            <li key={a.id} className={`grid grid-cols-1 gap-1.5 px-5 py-3.5 md:items-center md:gap-4 ${COLS}`}>
              <p className="font-mono text-[12.5px] tabular-nums text-fg-2">{formatDate(a.at, "id")}</p>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge tone={a.ok ? "ok" : "err"}>{a.ok ? "OK" : "Ditolak"}</Badge>
                <span className="truncate text-[14px] font-semibold">{ACTION[a.action] ?? a.action}</span>
                <span className="truncate text-[13px] text-fg-3">oleh {a.actor}</span>
              </div>
              <p className="truncate font-mono text-[12.5px] text-fg-2">{a.target ?? "—"}</p>
              <p className="font-mono text-[12px] text-fg-3">{a.ipHash.slice(0, 10)}</p>
            </li>
          ))}
        </ListBox>
      )}
    </div>
  );
}

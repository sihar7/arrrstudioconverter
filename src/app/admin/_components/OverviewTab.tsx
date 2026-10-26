"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserXmark } from "iconoir-react";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
import { formatBytes } from "@/lib/utils";
import { getStats, revokeAdminSessions } from "../_service/admin.service";
import { errorText, useAdminConfirm, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ErrorBox, RefreshButton, StatTile, Toolbar, nf } from "./parts";
import SystemCard from "./SystemCard";

const uptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}h ${h}j` : h ? `${h}j ${m}m` : `${m}m`;
};

export default function OverviewTab() {
  const { data, error, loading, reload } = useAdminData(getStats, [], 30_000);
  const router = useRouter();
  const toast = useToast();
  const guard = useAuthGuard();
  const [confirm, dialog] = useAdminConfirm();
  const [revoking, setRevoking] = useState(false);

  const revoke = async () => {
    const ok = await confirm({
      title: "Cabut semua sesi admin",
      message: "Semua perangkat yang masuk sebagai admin (termasuk perangkat ini) akan keluar. Lanjutkan?",
      action: "Cabut",
    });
    if (!ok) return;
    setRevoking(true);
    try {
      await revokeAdminSessions();
      router.replace("/admin/login");
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
      setRevoking(false);
    }
  };

  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data)
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-l" />
        ))}
      </div>
    );

  const running = data.jobs.queued + data.jobs.downloading + data.jobs.processing;
  const max = Math.max(1, ...data.daily.map((d) => d.count));
  const fmtTotal = Math.max(1, data.formats.reduce((a, f) => a + f.count, 0));
  const week = data.daily.slice(-7).reduce((a, d) => a + d.count, 0);

  return (
    <div className="flex flex-col gap-8">
      <Toolbar actions={<RefreshButton loading={loading} onClick={reload} />}>
        <p className="text-[13px] text-fg-3">Diperbarui otomatis tiap 30 detik.</p>
      </Toolbar>

      <section aria-label="Angka utama" className="-mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="User" value={nf(data.users)} sub={`${nf(data.sessions)} sesi aktif`} />
        <StatTile label="Convert 24 jam" value={nf(data.conversions.last24h)} sub={`${nf(data.conversions.last7d)} dalam 7 hari`} />
        <StatTile label="Total convert" value={nf(data.conversions.total)} sub="user login" />
        <StatTile label="Upload Roblox" value={nf(data.robloxUploads)} sub={`${nf(data.spoofs)} spoof`} />
        <StatTile label="Job berjalan" value={nf(running)} sub={`${nf(data.jobs.error)} gagal · ${nf(data.jobs.done)} selesai`} />
        <StatTile label="File aktif" value={nf(data.files.active)} sub={formatBytes(data.files.bytes)} />
        <StatTile label="Uptime server" value={uptime(data.server.uptimeSec)} sub={`RAM ${formatBytes(data.server.rssBytes)}`} />
        <StatTile label="Batas" value={`${data.server.concurrent}×`} sub={`Guest ${data.server.guestLimit} · user ${data.server.userHourly}/jam`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <CardBox>
          <CardHeader title="Convert per hari" aside={<span className="text-[13px] text-fg-3">14 hari · UTC</span>} />
          <div className="p-5">
            <p className="sr-only">
              Total {nf(week)} convert dalam 7 hari terakhir. Rincian per hari ada di tabel berikut.
            </p>
            <div className="flex h-44 items-end gap-1.5" aria-hidden="true">
              {data.daily.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.count}`}>
                  <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xs bg-fg px-1.5 py-0.5 font-mono text-[11px] text-bg opacity-0 transition-opacity group-hover:opacity-100">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t-xs bg-accent/80 transition-colors group-hover:bg-accent-strong"
                    style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-fg-3" aria-hidden="true">
              <span>{data.daily[0]?.day.slice(5)}</span>
              <span>{data.daily.at(-1)?.day.slice(5)}</span>
            </div>
            <table className="sr-only">
              <caption>Convert per hari</caption>
              <tbody>
                {data.daily.map((d) => (
                  <tr key={d.day}>
                    <th scope="row">{d.day}</th>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBox>

        <CardBox>
          <CardHeader title="Format" />
          <ul className="flex flex-col gap-4 p-5">
            {data.formats.length === 0 && <li className="text-[14px] text-fg-3">Belum ada data.</li>}
            {data.formats.map((f) => (
              <li key={f.format}>
                <div className="flex items-baseline justify-between text-[14px]">
                  <span className="font-semibold uppercase tracking-[0.06em]">{f.format}</span>
                  <span className="font-mono tabular-nums text-fg-2">
                    {nf(f.count)} · {Math.round((f.count / fmtTotal) * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(f.count / fmtTotal) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </CardBox>
      </div>

      <SystemCard />

      <CardBox>
        <CardHeader title="Keamanan" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-semibold">Cabut semua sesi admin</p>
            <p className="mt-1 text-[14px] leading-relaxed text-fg-2">
              Pakai kalau curiga password admin bocor. Ganti juga ADMIN_PASSWORD_HASH di server.
            </p>
          </div>
          <Button
            size="sm"
            variant="danger"
            className="shrink-0 self-start sm:self-auto"
            loading={revoking}
            onClick={revoke}
            icon={<UserXmark aria-hidden="true" />}
          >
            Cabut sesi admin
          </Button>
        </div>
      </CardBox>
      {dialog}
    </div>
  );
}

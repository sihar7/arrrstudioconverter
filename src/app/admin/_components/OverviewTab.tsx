"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Cart, Coins, Crown, Folder, Group, MusicDoubleNote, Timer, UserXmark } from "iconoir-react";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
import { formatBytes } from "@/lib/utils";
import { rupiah } from "@/lib/planFeatures";
import { PLAN_PRICE } from "@/lib/schemas/plans";
import { getStats, revokeAdminSessions } from "../_service/admin.service";
import { errorText, useAdminConfirm, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ErrorBox, RefreshButton, StatTile, Toolbar, nf } from "./parts";

const uptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}h ${h}j` : h ? `${h}j ${m}m` : `${m}m`;
};

const compactRp = (n: number) => (n >= 1_000_000 ? `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")} jt` : n >= 1000 ? `Rp${Math.round(n / 1000)} rb` : rupiah(n));

type Series = "count" | "revenue";

export default function OverviewTab({ onOpen }: { onOpen: (tab: "orders" | "users" | "jobs" | "files") => void }) {
  const { data, error, loading, reload } = useAdminData(getStats, [], 30_000);
  const router = useRouter();
  const toast = useToast();
  const guard = useAuthGuard();
  const [confirm, dialog] = useAdminConfirm();
  const [revoking, setRevoking] = useState(false);
  const [series, setSeries] = useState<Series>("count");

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
      <div className="flex flex-col gap-3" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[136px] rounded-l" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-l" />
      </div>
    );

  const b = data.billing;
  const subs = b.subscribers.pro + b.subscribers.studio;
  // Estimasi pendapatan bulanan berulang dari pelanggan aktif (harga per bulan, tanpa diskon periode)
  const mrr = b.subscribers.pro * PLAN_PRICE.pro + b.subscribers.studio * PLAN_PRICE.studio;
  const running = data.jobs.queued + data.jobs.downloading + data.jobs.processing;
  const values = data.daily.map((d) => (series === "count" ? d.count : d.revenue));
  const max = Math.max(1, ...values);
  const total = values.reduce((a, v) => a + v, 0);
  const fmtTotal = Math.max(1, data.formats.reduce((a, f) => a + f.count, 0));
  const freeUsers = Math.max(0, data.users - subs);
  const planRows = [
    { id: "free", n: freeUsers },
    { id: "pro", n: b.subscribers.pro },
    { id: "studio", n: b.subscribers.studio },
  ] as const;
  const planTotal = Math.max(1, planRows.reduce((a, r) => a + r.n, 0));
  const fmtValue = (v: number) => (series === "count" ? nf(v) : compactRp(v));

  return (
    <div className="flex flex-col gap-6">
      <Toolbar className="-mt-2 mb-0" actions={<RefreshButton loading={loading} onClick={reload} />}>
        <p className="flex items-center gap-2 text-[13px] text-fg-3">
          <span className="size-1.5 animate-pulse rounded-full bg-ok" aria-hidden="true" />
          Live · diperbarui otomatis tiap 30 detik
        </p>
      </Toolbar>

      {/* KPI bisnis */}
      <section aria-label="KPI utama" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile size="lg" label="Pendapatan 30 hari" value={compactRp(b.revenue30d)} sub={`${nf(b.paid30d)} order lunas`} icon={<Coins width={16} height={16} />} />
        <StatTile
          size="lg"
          label="Pelanggan aktif"
          value={nf(subs)}
          sub={`Pro ${nf(b.subscribers.pro)} · Studio ${nf(b.subscribers.studio)}`}
          icon={<Crown width={16} height={16} />}
          onClick={() => onOpen("users")}
        />
        <StatTile
          size="lg"
          label="Perlu dicek"
          value={nf(b.confirming)}
          sub={`${nf(b.awaiting)} menunggu dibayar`}
          icon={<Cart width={16} height={16} />}
          tone={b.confirming > 0 ? "warn" : undefined}
          onClick={() => onOpen("orders")}
        />
        <StatTile size="lg" label="Estimasi MRR" value={compactRp(mrr)} sub="dari pelanggan aktif" icon={<Coins width={16} height={16} />} />
      </section>

      {/* Aktivitas */}
      <section aria-label="Aktivitas" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="User" value={nf(data.users)} sub={`${nf(data.sessions)} sesi aktif`} icon={<Group width={16} height={16} />} />
        <StatTile label="Convert 24 jam" value={nf(data.conversions.last24h)} sub={`${nf(data.conversions.last7d)} dalam 7 hari`} icon={<MusicDoubleNote width={16} height={16} />} />
        <StatTile label="Job berjalan" value={nf(running)} sub={`${nf(data.jobs.error)} gagal · ${nf(data.jobs.done)} selesai`} icon={<Activity width={16} height={16} />} onClick={() => onOpen("jobs")} />
        <StatTile label="File aktif" value={nf(data.files.active)} sub={formatBytes(data.files.bytes)} icon={<Folder width={16} height={16} />} onClick={() => onOpen("files")} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <CardBox>
          <CardHeader
            title={series === "count" ? "Convert per hari" : "Pendapatan per hari"}
            aside={
              <Segmented
                size="sm"
                label="Data grafik"
                value={series}
                onChange={setSeries}
                className="w-[220px]"
                options={[
                  { value: "count", label: "Convert" },
                  { value: "revenue", label: "Pendapatan" },
                ]}
              />
            }
          />
          <div className="p-5">
            <div className="mb-5 flex items-baseline gap-3">
              <p className="font-display text-[26px] font-bold tabular-nums tracking-[-0.03em]">{fmtValue(total)}</p>
              <p className="text-[13px] text-fg-3">14 hari terakhir · UTC</p>
            </div>
            <div className="relative h-48">
              {/* Garis bantu tipis */}
              <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-px bg-line/50" />
                ))}
              </div>
              <div className="relative flex h-full items-end gap-1.5" aria-hidden="true">
                {data.daily.map((d, i) => (
                  <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${fmtValue(values[i])}`}>
                    <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xs bg-fg px-1.5 py-0.5 font-mono text-[11px] text-bg opacity-0 transition-opacity group-hover:opacity-100">
                      {fmtValue(values[i])}
                    </span>
                    <div
                      className="w-full rounded-t-xs bg-accent/75 transition-[height,background-color] duration-500 ease-[var(--ease)] group-hover:bg-accent-strong"
                      style={{ height: `${Math.max(1.5, (values[i] / max) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-fg-3" aria-hidden="true">
              <span>{data.daily[0]?.day.slice(5)}</span>
              <span>{data.daily.at(-1)?.day.slice(5)}</span>
            </div>
            <table className="sr-only">
              <caption>{series === "count" ? "Convert per hari" : "Pendapatan per hari (Rupiah)"}</caption>
              <tbody>
                {data.daily.map((d, i) => (
                  <tr key={d.day}>
                    <th scope="row">{d.day}</th>
                    <td>{values[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBox>

        <div className="flex flex-col gap-6">
          <CardBox>
            <CardHeader title="Distribusi plan" aside={<span className="text-[13px] text-fg-3">{nf(planTotal)} user</span>} />
            <div className="p-5">
              {/* Bar bertumpuk + legenda berlabel (warna bukan satu-satunya penanda) */}
              <div className="flex h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                {planRows.map((r, i) => (
                  <span key={r.id} className={["bg-fg-3/60", "bg-accent", "bg-fg"][i]} style={{ width: `${(r.n / planTotal) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-4 flex flex-col gap-2.5">
                {planRows.map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3 text-[14px]">
                    <span aria-hidden="true" className={`size-2 rounded-full ${["bg-fg-3/60", "bg-accent", "bg-fg"][i]}`} />
                    <span className="flex-1 font-semibold capitalize">{r.id}</span>
                    <span className="font-mono tabular-nums text-fg-2">
                      {nf(r.n)} · {Math.round((r.n / planTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBox>

          <CardBox>
            <CardHeader title="Format populer" />
            <ul className="flex flex-col gap-4 p-5">
              {data.formats.length === 0 && <li className="text-[14px] text-fg-3">Belum ada data.</li>}
              {data.formats.slice(0, 5).map((f) => (
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardBox>
          <CardHeader title="Server" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 text-[14px]">
            <div>
              <dt className="caps text-[10px] text-fg-3">Uptime</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold tabular-nums">
                <Timer width={15} height={15} aria-hidden="true" className="text-fg-3" />
                {uptime(data.server.uptimeSec)}
              </dd>
            </div>
            <div>
              <dt className="caps text-[10px] text-fg-3">RAM</dt>
              <dd className="mt-1 font-semibold tabular-nums">{formatBytes(data.server.rssBytes)}</dd>
            </div>
            <div>
              <dt className="caps text-[10px] text-fg-3">Paralel</dt>
              <dd className="mt-1 font-semibold tabular-nums">{data.server.concurrent} job</dd>
            </div>
            <div>
              <dt className="caps text-[10px] text-fg-3">Kuota</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                Guest {data.server.guestLimit} · Free {data.server.userDaily}/hari
              </dd>
            </div>
          </dl>
        </CardBox>

        <CardBox>
          <CardHeader title="Keamanan" />
          <div className="flex flex-col gap-4 p-5">
            <div>
              <p className="text-[15px] font-semibold">Cabut semua sesi admin</p>
              <p className="mt-1 text-[14px] leading-relaxed text-fg-2">Pakai kalau curiga password admin bocor. Ganti juga ADMIN_PASSWORD_HASH di server.</p>
            </div>
            <Button size="sm" variant="danger" className="self-start" loading={revoking} onClick={revoke} icon={<UserXmark aria-hidden="true" />}>
              Cabut sesi admin
            </Button>
          </div>
        </CardBox>
      </div>
      {dialog}
    </div>
  );
}

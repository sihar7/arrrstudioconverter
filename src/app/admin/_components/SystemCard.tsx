"use client";

import { useState } from "react";
import { Trash } from "iconoir-react";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
import type { CheckStatus, JanitorReport, SystemReport } from "@/type/admin";
import { getSystem, runJanitorNow } from "../_service/admin.service";
import { errorText, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ErrorBox, ago, nf } from "./parts";

const TONE: Record<CheckStatus, { tone: "ok" | "warn" | "err"; label: string }> = {
  ok: { tone: "ok", label: "Sehat" },
  warn: { tone: "warn", label: "Perhatian" },
  error: { tone: "err", label: "Masalah" },
};

const NAME: Record<string, string> = {
  database: "Database",
  storage: "Storage",
  tools: "ffmpeg & yt-dlp",
  janitor: "Janitor",
  jobs: "Antrean job",
  config: "Konfigurasi",
  process: "Proses server",
};

function janitorSummary(r: JanitorReport) {
  if (r.error) return `Janitor gagal: ${r.error}`;
  const files = r.expiredFiles + r.orphanDirs + r.evictedFiles + r.tmpFiles;
  const rows = r.expiredRows + r.orphanRows + r.evictedRows + r.auditRows;
  return `Bersih dalam ${nf(r.ms)}ms: ${nf(files)} file, ${nf(r.cacheDirs)} cache, ${nf(rows)} baris`;
}

/** Kesehatan sistem dari GET /api/admin/system + tombol jalankan janitor */
export default function SystemCard() {
  const { data: fetched, error, loading, reload } = useAdminData(getSystem, [], 60_000);
  const toast = useToast();
  const guard = useAuthGuard();
  const [busy, setBusy] = useState(false);
  // Hasil POST lebih baru dari data GET terakhir → tampilkan itu sampai poll berikutnya
  const [fresh, setFresh] = useState<SystemReport | null>(null);
  const data = fresh && (!fetched || fresh.at >= fetched.at) ? fresh : fetched;

  const runJanitor = async () => {
    setBusy(true);
    try {
      const r = await runJanitorNow();
      setFresh(r.system);
      toast(janitorSummary(r.janitor), r.janitor.error ? "err" : "ok");
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
    } finally {
      setBusy(false);
    }
  };

  const overall = data ? TONE[data.status] : null;

  return (
    <CardBox>
      <CardHeader
        title={
          <span className="flex items-center gap-3">
            Kesehatan sistem
            {overall && <Badge tone={overall.tone}>{overall.label}</Badge>}
          </span>
        }
        aside={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="subtle" loading={loading && !busy} onClick={reload}>
              Cek ulang
            </Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={runJanitor} icon={<Trash aria-hidden="true" />}>
              Jalankan janitor
            </Button>
          </div>
        }
      />
      {error && !data ? (
        <div className="p-5">
          <ErrorBox message={error} onRetry={reload} />
        </div>
      ) : !data ? (
        <div className="flex flex-col gap-2 p-5" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line/60">
            {data.checks.map((c) => {
              const t = TONE[c.status] ?? TONE.error;
              return (
                <li key={c.name} className="grid grid-cols-1 gap-1.5 px-5 py-3.5 sm:grid-cols-[180px_110px_minmax(0,1fr)] sm:items-center sm:gap-4">
                  <span className="text-[14px] font-semibold">{NAME[c.name] ?? c.name}</span>
                  <span>
                    <Badge tone={t.tone}>{t.label}</Badge>
                  </span>
                  <span className="text-[14px] leading-relaxed text-fg-2 [overflow-wrap:anywhere]">{c.message}</span>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line/60 px-5 py-3 text-[12.5px] text-fg-3">Dicek {ago(data.at)} · otomatis tiap menit</p>
        </>
      )}
    </CardBox>
  );
}

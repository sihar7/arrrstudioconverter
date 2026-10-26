"use client";

import { useState } from "react";
import { Cpu, Trash } from "iconoir-react";
import EmptyState from "@/components/shared/EmptyState";
import Badge from "@/components/ui/Badge";
import IconButton from "@/components/ui/IconButton";
import { useToast } from "@/hooks/useToast";
import type { JobStatus } from "@/type/converter";
import { deleteJob, getJobs, purgeJobs } from "../_service/admin.service";
import { errorText, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ErrorBox, ListBox, ListSkeleton, PurgeButton, RefreshButton, Toolbar, ago } from "./parts";

const STATUS: Record<JobStatus, { label: string; tone: "neutral" | "accent" | "ok" | "warn" | "err" }> = {
  queued: { label: "Antre", tone: "neutral" },
  downloading: { label: "Unduh", tone: "accent" },
  processing: { label: "Proses", tone: "warn" },
  done: { label: "Selesai", tone: "ok" },
  error: { label: "Gagal", tone: "err" },
};

const COLS = "md:grid-cols-[minmax(0,1.8fr)_110px_140px_120px_44px]";

export default function JobsTab() {
  const { data, error, loading, reload } = useAdminData(getJobs, [], 5_000);
  const toast = useToast();
  const guard = useAuthGuard();
  const [busy, setBusy] = useState<string | null>(null);
  const finished = data?.items.filter((j) => j.status === "done" || j.status === "error").length ?? 0;

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await deleteJob(id);
      toast("Job dihapus", "ok");
      reload();
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
            <PurgeButton
              label="Hapus selesai"
              title="Hapus job selesai & gagal"
              message={`${finished} job yang sudah selesai atau gagal dihapus dari daftar. File hasil & riwayat user tidak ikut terhapus.`}
              disabled={finished === 0}
              run={purgeJobs}
              onDone={reload}
            />
            <RefreshButton loading={loading} onClick={reload} />
          </>
        }
      >
        <p className="text-[13px] text-fg-3">100 job terbaru (disimpan 6 jam). Diperbarui tiap 5 detik.</p>
      </Toolbar>

      {error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <ListSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState icon={<Cpu width={26} height={26} />} title="Belum ada job" sub="Job konversi muncul di sini selama 6 jam." />
      ) : (
        <ListBox
          head={
            <div className={`grid gap-4 ${COLS}`}>
              <span>Video</span>
              <span>Status</span>
              <span>Pemilik</span>
              <span>Dibuat</span>
              <span className="sr-only">Aksi</span>
            </div>
          }
        >
          {data.items.map((j) => {
            const s = STATUS[j.status] ?? STATUS.queued;
            const active = j.status === "downloading" || j.status === "processing";
            return (
              <li key={j.id} className={`grid grid-cols-1 gap-2 px-5 py-4 md:items-center md:gap-4 ${COLS}`}>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold" title={j.title}>
                    {j.title}
                  </p>
                  <p className="truncate font-mono text-[12px] text-fg-3">
                    {j.videoId} · {j.format.toUpperCase()}
                  </p>
                  {j.error && <p className="mt-1 text-[13px] text-err">{j.error}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.tone}>{s.label}</Badge>
                  {active && <span className="font-mono text-[12px] tabular-nums text-fg-2">{j.progress}%</span>}
                </div>
                <p className="truncate text-[13px] text-fg-2">
                  <span className="caps mr-1.5 text-[10.5px] text-fg-3">{j.ownerType === "user" ? "User" : "Guest"}</span>
                  <span className="font-mono">{j.ownerId}</span>
                </p>
                <p className="text-[13px] text-fg-2">{ago(j.createdAt)}</p>
                <div className="md:justify-self-end">
                  {(j.status === "done" || j.status === "error") && (
                    <IconButton label={`Hapus job ${j.title}`} size="sm" loading={busy === j.id} icon={<Trash width={16} height={16} />} onClick={() => remove(j.id)} className="hover:text-err" />
                  )}
                </div>
              </li>
            );
          })}
        </ListBox>
      )}
    </div>
  );
}

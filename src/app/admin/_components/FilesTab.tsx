"use client";

import { useState } from "react";
import { Folder, Trash } from "iconoir-react";
import EmptyState from "@/components/shared/EmptyState";
import Button from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { AdminFile } from "@/type/admin";
import { deleteFile, getFiles } from "../_service/admin.service";
import { errorText, useAdminConfirm, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ErrorBox, ListBox, ListSkeleton, RefreshButton, Toolbar, nf } from "./parts";

const COLS = "md:grid-cols-[minmax(0,1.8fr)_100px_150px_120px_auto]";

const left = (ts: number) => {
  const m = Math.max(0, Math.round((ts - Date.now()) / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)} jam lagi` : `${m} mnt lagi`;
};

export default function FilesTab() {
  const { data, error, loading, reload } = useAdminData(getFiles, []);
  const toast = useToast();
  const guard = useAuthGuard();
  const [confirm, dialog] = useAdminConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (f: AdminFile) => {
    const ok = await confirm({
      title: "Hapus file",
      message: `"${f.title}" dihapus dari storage. Pemiliknya tidak bisa mengunduh atau meng-upload file ini lagi.`,
      action: "Hapus",
    });
    if (!ok) return;
    setBusy(f.fileId);
    try {
      await deleteFile(f.fileId);
      toast("File dihapus", "ok");
      void reload();
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
    } finally {
      setBusy(null);
    }
  };

  const total = data?.items.reduce((a, f) => a + f.size, 0) ?? 0;

  return (
    <div>
      <Toolbar actions={<RefreshButton loading={loading} onClick={reload} />}>
        {data && (
          <p className="text-[13px] text-fg-3">
            {nf(data.items.length)} file aktif · {formatBytes(total)}
          </p>
        )}
      </Toolbar>

      {error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <ListSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState icon={<Folder width={26} height={26} />} title="Tidak ada file aktif" sub="File hasil convert otomatis terhapus saat kedaluwarsa." />
      ) : (
        <ListBox
          head={
            <div className={`grid gap-4 ${COLS}`}>
              <span>File</span>
              <span>Ukuran</span>
              <span>Pemilik</span>
              <span>Kedaluwarsa</span>
              <span className="sr-only">Aksi</span>
            </div>
          }
        >
          {data.items.map((f) => (
            <li key={f.fileId} className={`grid grid-cols-1 gap-2 px-5 py-4 md:items-center md:gap-4 ${COLS}`}>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold" title={f.title}>
                  {f.title}
                </p>
                <p className="font-mono text-[12px] text-fg-3">
                  {f.format.toUpperCase()} · {formatDuration(f.duration)}
                </p>
              </div>
              <p className="text-[14px] tabular-nums text-fg-2">{formatBytes(f.size)}</p>
              <p className="truncate text-[13px] text-fg-2">
                <span className="caps mr-1.5 text-[10.5px] text-fg-3">{f.ownerType === "user" ? "User" : "Guest"}</span>
                <span className="font-mono">{f.ownerId}</span>
              </p>
              <p className="text-[13px] text-fg-2">{left(f.expiresAt)}</p>
              <Button
                size="sm"
                variant="danger"
                className="self-start md:justify-self-end"
                loading={busy === f.fileId}
                onClick={() => remove(f)}
                icon={<Trash aria-hidden="true" />}
                aria-label={`Hapus file ${f.title}`}
              >
                Hapus
              </Button>
            </li>
          ))}
        </ListBox>
      )}
      {dialog}
    </div>
  );
}

"use client";

import { memo } from "react";
import { Pause, Play, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { batchRemoved, batchUpdated, type Batch } from "@/store/slices/converterSlice";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Progress from "@/components/ui/Progress";
import { useToast } from "@/hooks/useToast";
import { useCancel } from "../_hooks/useCancel";

/** Satu batch impor: dua angka (convert & upload) + status gelombang + jeda/lanjut */
const BatchRow = memo(function BatchRow({ batch }: { batch: Batch }) {
  const { t, f } = useT();
  const c = t.converter.importer;
  const dispatch = useAppDispatch();
  const toast = useToast();
  const cancelMany = useCancel();
  // Batalkan batch: convert yang berjalan / menunggu dihentikan, upload berikutnya tidak dikirim, batch ditutup
  const cancelBatch = () => {
    const n = cancelMany((i) => i.batch === batch.id);
    dispatch(batchRemoved(batch.id));
    toast(f(c.canceledBatch, { n }), "info");
  };
  // Hanya hitungan yang dibaca (bukan item utuh) → baris tidak dirender ulang tiap progres kecil berubah
  const counts = useAppSelector((s) => {
    let n = 0;
    let conv = 0;
    let up = 0;
    for (const i of s.converter.items) {
      if (i.batch !== batch.id) continue;
      n++;
      if (i.status === "done") conv++;
      if (i.upload.status === "done") up++;
    }
    return `${n}:${conv}:${up}`;
  });
  const [n, conv, up] = counts.split(":").map(Number);
  const target = batch.upload ? n * 2 : n;
  const pct = target ? ((conv + (batch.upload ? up : 0)) / target) * 100 : 0;
  const status =
    batch.status === "paused"
      ? (batch.note ?? c.pausedUser)
      : batch.status === "done"
        ? f(c.batchDone, { ok: up, n })
        : batch.upload
          ? batch.wave.length
            ? f(c.batchUploading, { n: batch.waves + 1 })
            : c.batchWaiting
          : null;

  return (
    <li className="flex flex-col gap-2.5 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-fg">{f(c.batchTitle, { label: batch.label })}</p>
          <p className="font-mono text-[12px] tabular-nums text-fg-2">
            {batch.upload ? f(c.batchStats, { conv, up, n }) : `${conv}/${n}`}
            {batch.upload && batch.waves > 0 && <span className="text-fg-3"> · {f(c.batchWave, { n: batch.waves })}</span>}
          </p>
        </div>
        {batch.upload && batch.status !== "done" && (
          <Button
            size="sm"
            variant={batch.status === "paused" ? "primary" : "ghost"}
            icon={batch.status === "paused" ? <Play width={15} height={15} /> : <Pause width={15} height={15} />}
            onClick={() =>
              dispatch(batchUpdated({ id: batch.id, patch: batch.status === "paused" ? { status: "running", note: null } : { status: "paused", note: null } }))
            }
          >
            {batch.status === "paused" ? c.resume : c.pause}
          </Button>
        )}
        {batch.status !== "done" ? (
          <Button size="sm" variant="ghost" icon={<Xmark width={15} height={15} />} onClick={cancelBatch}>
            {c.cancelBatch}
          </Button>
        ) : (
          <IconButton label={c.close} size="sm" icon={<Xmark width={16} height={16} />} onClick={() => dispatch(batchRemoved(batch.id))} />
        )}
      </div>
      <Progress value={pct} tone={batch.status === "done" ? "ok" : "accent"} label={batch.label} />
      {status && <p className={cn("text-[12.5px] leading-relaxed", batch.status === "paused" && batch.note ? "text-warn" : "text-fg-3")}>{status}</p>}
    </li>
  );
});

export default function BatchCard() {
  const batches = useAppSelector((s) => s.converter.batches);
  if (!batches.length) return null;
  return (
    <ul className="rise flex flex-col divide-y divide-line/70 overflow-hidden rounded border border-line bg-raised">
      {batches.map((b) => (
        <BatchRow key={b.id} batch={b} />
      ))}
    </ul>
  );
}

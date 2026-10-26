"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Cart, Check, Copy, MediaImage, OpenNewWindow, Trash, Xmark } from "iconoir-react";
import EmptyState from "@/components/shared/EmptyState";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import IconButton from "@/components/ui/IconButton";
import Segmented from "@/components/ui/Segmented";
import Field, { Textarea } from "@/components/ui/Field";
import { useToast } from "@/hooks/useToast";
import { copyText } from "@/lib/utils";
import { rupiah } from "@/lib/planFeatures";
import type { Order, OrderStatus } from "@/type/billing";
import { deleteOrder, getOrders, orderAction, proofUrl, purgeOrders, type OrderFilter } from "../_service/admin.service";
import { errorText, useAdminConfirm, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ADMIN_EVENT } from "../_hooks/useAdminEvents";
import { ErrorBox, ListBox, ListSkeleton, PurgeButton, RefreshButton, Toolbar, ago, dateShort, nf } from "./parts";

const COLS = "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_130px_130px_auto]";

const STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "ok" | "warn" | "err" }> = {
  awaiting: { label: "Menunggu bayar", tone: "neutral" },
  confirming: { label: "Perlu dicek", tone: "warn" },
  paid: { label: "Lunas", tone: "ok" },
  rejected: { label: "Ditolak", tone: "err" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "open", label: "Terbuka" },
  { value: "paid", label: "Lunas" },
  { value: "all", label: "Semua" },
];

const PLAN_NAME = { pro: "Pro", studio: "Studio" } as const;

/**
 * Konfirmasi pembayaran QRIS: cocokkan nominal (sudah termasuk kode unik) dengan mutasi e-wallet / rekening,
 * lalu "Lunas" → plan user aktif otomatis. "Perlu dicek" (user sudah menekan bayar) selalu di urutan teratas.
 */
export default function OrdersTab({ onChanged }: { onChanged: () => void }) {
  const [filter, setFilter] = useState<OrderFilter>("open");
  const { data, error, loading, reload } = useAdminData(() => getOrders(filter), [filter], 15_000);
  const toast = useToast();
  const guard = useAuthGuard();
  const [busy, setBusy] = useState<string | null>(null);
  const [approve, setApprove] = useState<Order | null>(null);
  const [reject, setReject] = useState<Order | null>(null);
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<Order | null>(null);
  const [confirm, confirmDialog] = useAdminConfirm();

  // Event realtime (order baru / dibayar / bukti) → muat ulang daftar tanpa menunggu polling
  useEffect(() => {
    const onEvent = () => reload();
    window.addEventListener(ADMIN_EVENT, onEvent);
    return () => window.removeEventListener(ADMIN_EVENT, onEvent);
  }, [reload]);

  const remove = async (o: Order) => {
    const ok = await confirm({
      title: "Hapus order",
      message:
        o.status === "paid"
          ? `Order ${o.id} (lunas) dihapus dari catatan beserta buktinya. Plan user TIDAK dicabut — atur di menu User & plan bila perlu.`
          : `Order ${o.id} beserta bukti pembayarannya dihapus permanen.`,
      action: "Hapus",
    });
    if (!ok) return;
    setBusy(o.id);
    try {
      await deleteOrder(o.id);
      toast(`Order ${o.id} dihapus`, "ok");
      reload();
      onChanged();
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
    } finally {
      setBusy(null);
    }
  };

  const run = async (o: Order, action: "approve" | "reject", reason?: string) => {
    setBusy(o.id);
    try {
      await orderAction(o.id, action, reason);
      toast(action === "approve" ? `Order ${o.id} lunas — plan ${PLAN_NAME[o.plan]} aktif` : `Order ${o.id} ditolak`, "ok");
      setApprove(null);
      setReject(null);
      setNote("");
      reload();
      onChanged();
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string) => {
    await copyText(text);
    toast("Disalin", "ok");
  };

  const items = data?.items ?? [];
  const confirming = items.filter((o) => o.status === "confirming");
  const confirmingTotal = confirming.reduce((a, o) => a + o.amount, 0);

  return (
    <div>
      <Toolbar
        actions={
          <>
            <PurgeButton
              label="Hapus tertutup"
              title="Hapus order tertutup"
              message="Semua order yang dibatalkan, kedaluwarsa, atau ditolak dihapus beserta buktinya. Order lunas tetap disimpan sebagai catatan pendapatan."
              run={purgeOrders}
              onDone={() => {
                reload();
                onChanged();
              }}
            />
            <RefreshButton loading={loading} onClick={reload} />
          </>
        }
      >
        <Segmented label="Filter order" value={filter} options={FILTERS} onChange={setFilter} className="w-full sm:w-[340px]" />
      </Toolbar>

      {filter === "open" && confirming.length > 0 && (
        <div role="status" className="mb-4 flex flex-col gap-1 border-l-2 border-warn bg-warn/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] font-semibold text-fg">{nf(confirming.length)} pembayaran menunggu dicek</p>
          <p className="text-[13px] text-fg-2">
            Total <span className="font-mono tabular-nums text-fg">{rupiah(confirmingTotal)}</span> — cocokkan dengan mutasi QRIS
          </p>
        </div>
      )}

      {error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Cart width={26} height={26} />}
          title={filter === "open" ? "Tidak ada order terbuka" : "Belum ada order"}
          sub={filter === "open" ? "Order baru muncul di sini saat user memilih plan di halaman Harga." : "Order yang sudah diproses tampil di sini."}
        />
      ) : (
        <ListBox
          head={
            <div className={`grid gap-4 ${COLS}`}>
              <span>User</span>
              <span>Plan</span>
              <span>Nominal</span>
              <span>Status</span>
              <span className="sr-only">Aksi</span>
            </div>
          }
        >
          {items.map((o) => {
            const st = STATUS[o.status];
            const actionable = o.status === "awaiting" || o.status === "confirming" || o.status === "expired";
            return (
              <li key={o.id} className={`grid grid-cols-1 gap-3 px-5 py-4 md:items-center md:gap-4 ${COLS} ${o.status === "confirming" ? "bg-warn/[0.04]" : ""}`}>
                <div className="flex min-w-0 items-center gap-3">
                  {o.avatarUrl ? (
                    <Image src={o.avatarUrl} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full" />
                  ) : (
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tonal text-[13px] font-semibold text-on-tonal">
                      {o.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{o.displayName}</p>
                    <p className="truncate font-mono text-[12px] text-fg-3">
                      @{o.username} · {o.id}
                    </p>
                  </div>
                </div>
                <div className="text-[14px]">
                  <p className="font-semibold">
                    {PLAN_NAME[o.plan]} · {o.months} bln
                  </p>
                  <p className="text-[12.5px] text-fg-3">
                    {o.status === "paid" && o.planUntil ? `aktif s/d ${dateShort(o.planUntil)}` : ago(o.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div>
                    <p className="font-mono text-[15px] font-semibold tabular-nums">{rupiah(o.amount)}</p>
                    <p className="font-mono text-[11.5px] text-fg-3">kode +{o.uniqueCode}</p>
                  </div>
                  <IconButton label={`Salin nominal ${o.amount}`} size="sm" icon={<Copy width={14} height={14} />} onClick={() => copy(String(o.amount))} />
                </div>
                <div className="flex flex-col items-start gap-1">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {o.proofAt ? (
                    <button
                      type="button"
                      onClick={() => setProof(o)}
                      className="inline-flex min-h-6 cursor-pointer items-center gap-1 text-[12px] font-semibold text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg"
                    >
                      <MediaImage width={13} height={13} aria-hidden="true" />
                      Lihat bukti
                    </button>
                  ) : (
                    (o.status === "awaiting" || o.status === "confirming") && <span className="text-[12px] text-fg-3">Belum ada bukti</span>
                  )}
                  {o.note && <p className="max-w-[160px] truncate text-[12px] text-fg-3" title={o.note}>{o.note}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {actionable && (
                    <>
                      <Button size="sm" variant="ghost" disabled={busy === o.id} onClick={() => setReject(o)} icon={<Xmark aria-hidden="true" />}>
                        Tolak
                      </Button>
                      <Button size="sm" variant="primary" loading={busy === o.id} onClick={() => setApprove(o)} icon={<Check aria-hidden="true" />}>
                        Lunas
                      </Button>
                    </>
                  )}
                  <IconButton label={`Hapus order ${o.id}`} size="sm" disabled={busy === o.id} icon={<Trash width={16} height={16} />} onClick={() => remove(o)} className="hover:text-err" />
                </div>
              </li>
            );
          })}
        </ListBox>
      )}

      <Dialog
        open={approve != null}
        onClose={() => setApprove(null)}
        title="Konfirmasi pembayaran"
        sub={approve ? `Order ${approve.id} · ${approve.displayName} (@${approve.username})` : undefined}
        width="max-w-[460px]"
        footer={
          <>
            <Button variant="subtle" onClick={() => setApprove(null)}>
              Batal
            </Button>
            <Button variant="primary" loading={busy === approve?.id} onClick={() => approve && run(approve, "approve")} icon={<Check aria-hidden="true" />}>
              Tandai lunas
            </Button>
          </>
        }
      >
        {approve && (
          <div className="flex flex-col gap-4">
            <div className="rounded-s bg-raised p-4">
              <p className="caps text-[10px] text-fg-3">Pastikan mutasi masuk persis</p>
              <p className="mt-1 font-display text-[30px] font-bold tabular-nums tracking-[-0.03em]">{rupiah(approve.amount)}</p>
              <p className="mt-1 text-[13px] text-fg-2">
                Harga {rupiah(approve.baseAmount)} + kode unik {approve.uniqueCode}
              </p>
            </div>
            <p className="text-[14px] leading-relaxed text-fg-2">
              Plan <strong className="text-fg">{PLAN_NAME[approve.plan]}</strong> aktif {approve.months * 30} hari untuk user ini. Kalau plan yang sama masih
              aktif, masa aktifnya diperpanjang.
            </p>
          </div>
        )}
      </Dialog>

      <Dialog
        open={proof != null}
        onClose={() => setProof(null)}
        title="Bukti pembayaran"
        sub={proof ? `Order ${proof.id} · ${proof.displayName} · ${rupiah(proof.amount)}` : undefined}
        width="max-w-[560px]"
        footer={
          proof && (
            <>
              <a
                href={proofUrl(proof.id, proof.proofAt)}
                target="_blank"
                rel="noreferrer"
                className="caps inline-flex min-h-11 items-center gap-2 px-3 text-[11px] text-fg-2 hover:text-fg"
              >
                <OpenNewWindow width={14} height={14} aria-hidden="true" />
                Buka ukuran penuh
              </a>
              {(proof.status === "awaiting" || proof.status === "confirming" || proof.status === "expired") && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setApprove(proof);
                    setProof(null);
                  }}
                  icon={<Check aria-hidden="true" />}
                >
                  Lanjut konfirmasi
                </Button>
              )}
            </>
          )
        }
      >
        {proof && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-fg-2">
              Cocokkan nominal <strong className="font-mono text-fg">{rupiah(proof.amount)}</strong> (kode unik +{proof.uniqueCode}) dengan bukti ini.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proofUrl(proof.id, proof.proofAt)} alt={`Bukti pembayaran order ${proof.id}`} className="max-h-[60dvh] w-full rounded-s border border-line/60 bg-bg object-contain" />
          </div>
        )}
      </Dialog>

      <Dialog
        open={reject != null}
        onClose={() => setReject(null)}
        title="Tolak pembayaran"
        sub={reject ? `Order ${reject.id} · ${rupiah(reject.amount)}` : undefined}
        width="max-w-[460px]"
        footer={
          <>
            <Button variant="subtle" onClick={() => setReject(null)}>
              Batal
            </Button>
            <Button variant="danger" loading={busy === reject?.id} onClick={() => reject && run(reject, "reject", note)} icon={<Xmark aria-hidden="true" />}>
              Tolak order
            </Button>
          </>
        }
      >
        <Field label="Alasan (dilihat user)" hint="Mis. nominal tidak sesuai / pembayaran tidak ditemukan.">
          {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </Dialog>
      {confirmDialog}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Timer, WarningCircle, Xmark } from "iconoir-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Spinner from "@/components/ui/Spinner";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { ApiError, copyText, formatDate } from "@/lib/utils";
import { rupiah } from "@/lib/planFeatures";
import type { OrderDetail } from "@/type/billing";
import { getOrder, orderAction } from "../_service/billing.service";

const POLL_MS = 8000;

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Halaman bayar QRIS: QR bernominal + countdown → "sudah bayar" → menunggu admin (polling) → lunas.
 * Status diambil ulang berkala selama dialog terbuka, jadi user cukup menunggu di sini.
 */
export default function CheckoutDialog({
  order,
  onClose,
  onChange,
}: {
  order: OrderDetail | null;
  onClose: () => void;
  onChange: (o: OrderDetail) => void;
}) {
  const { t, f, lang } = useT();
  const c = t.pricing.checkout;
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);

  const status = order?.status;
  const open = order != null;

  // Countdown batas bayar
  useEffect(() => {
    if (status !== "awaiting") return;
    const tm = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tm);
  }, [status]);

  // Polling status selama order masih terbuka
  const id = order?.id;
  useEffect(() => {
    if (!id || (status !== "awaiting" && status !== "confirming")) return;
    let alive = true;
    const tm = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      getOrder(id)
        .then((r) => alive && r.order.status !== status && onChange(r.order))
        .catch(() => {});
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(tm);
    };
  }, [id, status, onChange]);

  const act = async (action: "confirm" | "cancel") => {
    if (!order) return;
    setBusy(action);
    try {
      const r = await orderAction(order.id, action);
      onChange(r.order);
      if (action === "cancel") onClose();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : String(e), "err");
    } finally {
      setBusy(null);
    }
  };

  const copyAmount = async () => {
    if (!order) return;
    await copyText(String(order.amount));
    toast(t.toast.copied, "ok");
  };

  const left = order ? order.payBefore - now : 0;
  const expired = status === "expired" || (status === "awaiting" && left <= 0);
  const qrSrc = order?.qris ? `data:image/svg+xml;utf8,${encodeURIComponent(order.qris.svg)}` : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={order ? f(c.title, { plan: t.plan.names[order.plan] }) : ""}
      sub={order ? f(c.sub, { months: t.pricing.months[order.months], id: order.id }) : undefined}
      width="max-w-[520px]"
      footer={
        order && status === "awaiting" && !expired ? (
          <>
            <Button variant="subtle" loading={busy === "cancel"} disabled={busy != null} onClick={() => act("cancel")} icon={<Xmark aria-hidden="true" />}>
              {c.cancel}
            </Button>
            <Button variant="primary" loading={busy === "confirm"} disabled={busy != null} onClick={() => act("confirm")} icon={<Check aria-hidden="true" />}>
              {c.confirm}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose}>
            {c.done}
          </Button>
        )
      }
    >
      {order && (
        <div aria-live="polite">
          {status === "awaiting" && !expired && qrSrc && (
            <div className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-start">
              <div className="flex flex-col items-center gap-3">
                {/* QR selalu di atas putih supaya terbaca kamera di tema apa pun */}
                <div className="rounded-m bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSrc} alt={c.scan} width={176} height={176} className="size-44" />
                </div>
                <a href={qrSrc} download={`qris-${order.id}.svg`} className="caps inline-flex min-h-11 items-center gap-2 text-[10.5px] text-fg-3 transition-colors hover:text-fg">
                  <Download width={14} height={14} aria-hidden="true" />
                  {c.saveQr}
                </a>
              </div>

              <div className="flex min-w-0 flex-col gap-5">
                <div>
                  <p className="caps text-[10.5px] text-fg-3">{c.amount}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="font-display text-[32px] font-bold leading-none tabular-nums tracking-[-0.03em]">{rupiah(order.amount)}</p>
                    <IconButton label={t.common.copy} size="sm" icon={<Copy width={16} height={16} />} onClick={copyAmount} />
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-fg-2">{c.exact}</p>
                </div>
                {order.qris && (
                  <div>
                    <p className="caps text-[10.5px] text-fg-3">{c.merchant}</p>
                    <p className="mt-1 truncate text-[15px] font-semibold">{order.qris.merchant || "—"}</p>
                  </div>
                )}
                <p className="inline-flex items-center gap-2 self-start rounded-xs bg-raised px-2.5 py-1.5 text-[13px] tabular-nums text-fg-2">
                  <Timer width={15} height={15} aria-hidden="true" />
                  {f(c.expiresIn, { time: clock(left) })}
                </p>
              </div>

              <ol className="flex flex-col gap-2.5 border-t border-line/60 pt-5 sm:col-span-2">
                {c.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-[14px] text-fg-2">
                    <span className="font-mono text-[12px] leading-5 text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {expired && (
            <StateBlock icon={<Timer width={22} height={22} />} title={t.pricing.status.expired} sub={c.expired} />
          )}

          {status === "confirming" && (
            <StateBlock
              icon={<Spinner className="size-6" />}
              title={c.confirmingTitle}
              sub={c.confirmingSub}
              extra={<p className="mt-4 font-display text-[22px] font-bold tabular-nums">{rupiah(order.amount)}</p>}
            />
          )}

          {status === "paid" && (
            <StateBlock
              icon={<Check width={24} height={24} strokeWidth={2} />}
              title={c.paidTitle}
              sub={f(c.paidSub, {
                plan: t.plan.names[order.plan],
                date: order.planUntil ? formatDate(order.planUntil, lang) : t.plan.permanent,
              })}
            />
          )}

          {status === "rejected" && (
            <StateBlock
              icon={<WarningCircle width={24} height={24} />}
              title={c.rejectedTitle}
              sub={f(c.rejectedSub, { note: order.note || c.noReason })}
            />
          )}
        </div>
      )}
    </Dialog>
  );
}

function StateBlock({ icon, title, sub, extra }: { icon: React.ReactNode; title: string; sub: string; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="forged-tile flex size-14 items-center justify-center rounded-l text-fg">{icon}</div>
      <p className="mt-5 font-display text-[19px] font-bold tracking-[-0.02em]">{title}</p>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-fg-2">{sub}</p>
      {extra}
    </div>
  );
}

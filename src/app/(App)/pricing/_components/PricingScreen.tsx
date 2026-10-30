"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Discord, QrCode } from "iconoir-react";
import { useMeQuery, baseApi } from "@/store/api/baseApi";
import { useAppDispatch } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { ApiError, cn, formatDate } from "@/lib/utils";
import { rupiah } from "@/lib/planFeatures";
import { BILLING_PERIODS, PAID_PLANS, PLAN_PRICE, planTotal, type BillingMonths, type PaidPlanId } from "@/lib/schemas/plans";

/** Plan yang ditandai "Paling populer" */
const POPULAR: PaidPlanId = "pro";
import PageHeader from "@/components/shared/PageHeader";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button, { ButtonLink } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import Skeleton from "@/components/ui/Skeleton";
import type { UserPlan } from "@/type/auth";
import type { BillingInfo, Order, OrderDetail, OrderStatus } from "@/type/billing";
import { createOrder, getBilling, getOrder } from "../_service/billing.service";
import PlanCard from "./PlanCard";
import CheckoutDialog from "./CheckoutDialog";

const STATUS_TONE: Record<OrderStatus, "neutral" | "ok" | "warn" | "err"> = {
  awaiting: "warn",
  confirming: "warn",
  paid: "ok",
  rejected: "err",
  expired: "neutral",
  cancelled: "neutral",
};

export default function PricingScreen() {
  const { t, f, lang } = useT();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { data: me } = useMeQuery();
  const [months, setMonths] = useState<BillingMonths>(1);
  const [billing, setBilling] = useState<{ info: BillingInfo; plan: UserPlan; orders: Order[] } | null>(null);
  const [checkout, setCheckout] = useState<OrderDetail | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(() => {
    getBilling()
      .then(setBilling)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const loggedIn = Boolean(me?.user);
  const plan = billing?.plan ?? me?.plan ?? { id: "free" as const, expiresAt: null };
  const period = BILLING_PERIODS.find((p) => p.months === months)!;

  const buy = async (p: PaidPlanId) => {
    setBuying(p);
    try {
      const r = await createOrder(p, months);
      setCheckout(r.order);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : String(e), "err");
    } finally {
      setBuying(null);
    }
  };

  const resume = async (o: Order) => {
    setBuying(o.id);
    try {
      setCheckout((await getOrder(o.id)).order);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : String(e), "err");
    } finally {
      setBuying(null);
    }
  };

  // Status order berubah (dibayar / dikonfirmasi admin) → segarkan plan & kuota di seluruh app
  const onOrderChange = useCallback(
    (o: OrderDetail) => {
      setCheckout(o);
      load();
      if (o.status === "paid") dispatch(baseApi.util.invalidateTags(["Me"]));
    },
    [load, dispatch],
  );

  const paidAction = (id: PaidPlanId) => {
    if (!loggedIn) {
      return (
        <ButtonLink href="/login?next=/pricing" variant={id === POPULAR ? "primary" : "tonal"} className="w-full">
          {t.pricing.loginToBuy}
        </ButtonLink>
      );
    }
    if (billing && !billing.info.enabled) {
      return (
        <ButtonLink href={me?.auth.inviteUrl ?? "#"} target="_blank" rel="noreferrer" variant="tonal" className="w-full" icon={<Discord aria-hidden="true" />}>
          {t.pricing.contact}
        </ButtonLink>
      );
    }
    const label = plan.id === id ? t.pricing.extend : plan.id !== "free" ? f(t.pricing.switchTo, { plan: t.plan.names[id] }) : t.pricing.pay;
    return (
      <Button
        variant={id === POPULAR ? "primary" : "tonal"}
        className="w-full"
        loading={buying === id}
        disabled={buying != null || (plan.expiresAt === null && plan.id === id)}
        onClick={() => buy(id)}
        icon={<QrCode aria-hidden="true" />}
      >
        {label}
      </Button>
    );
  };

  const price = (id: PaidPlanId) => {
    const total = planTotal(id, months);
    const monthly = Math.round(total / months / 100) * 100;
    return {
      node: (
        <>
          {period.discount > 0 && <span className="text-[15px] tabular-nums text-fg-3 line-through">{rupiah(PLAN_PRICE[id])}</span>}
          <span className="font-display text-[38px] font-bold leading-none tabular-nums tracking-[-0.035em]">{rupiah(monthly)}</span>
          <span className="text-[14px] text-fg-3">{t.pricing.perMonth}</span>
        </>
      ),
      billed: months > 1 ? f(t.pricing.billed, { total: rupiah(total), months: t.pricing.months[months] }) : undefined,
    };
  };


  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow={t.pricing.eyebrow} title={t.pricing.title} sub={t.pricing.sub} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {plan.id !== "free" ? (
          <p className="inline-flex items-center gap-2.5 text-[14px] text-fg-2">
            <Crown width={18} height={18} className="text-fg" aria-hidden="true" />
            {plan.expiresAt
              ? f(t.pricing.activeUntil, { plan: t.plan.names[plan.id], date: formatDate(plan.expiresAt, lang) })
              : f(t.pricing.activeForever, { plan: t.plan.names[plan.id] })}
          </p>
        ) : (
          <span />
        )}
        <Segmented
          label={t.pricing.period}
          value={months}
          onChange={setMonths}
          className="w-full sm:w-[420px]"
          options={BILLING_PERIODS.map((p) => ({
            value: p.months,
            label: p.discount ? `${t.pricing.months[p.months]} · -${Math.round(p.discount * 100)}%` : t.pricing.months[p.months],
          }))}
        />
      </div>

      <section aria-label={t.pricing.title} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-start 2xl:grid-cols-5">
        <PlanCard
          id="free"
          current={plan.id === "free"}
          price={<span className="font-display text-[38px] font-bold leading-none tracking-[-0.035em]">Rp0</span>}
          billed={t.pricing.freeForever}
          action={
            <ButtonLink href="/converter" variant="subtle" className="w-full">
              {t.pricing.startFree}
            </ButtonLink>
          }
        />
        {PAID_PLANS.map((id) => {
          const p = price(id);
          return <PlanCard key={id} id={id} highlight={id === POPULAR} current={plan.id === id} price={p.node} billed={p.billed} action={paidAction(id)} />;
        })}
      </section>

      <p className={cn("max-w-2xl text-[13px] leading-relaxed text-fg-3", billing && !billing.info.enabled && "text-warn")}>
        {billing && !billing.info.enabled ? t.pricing.billingOff : t.pricing.note}
      </p>

      {loggedIn && (
        <CardBox>
          <CardHeader title={t.pricing.orders} />
          {!billing ? (
            <div className="flex flex-col gap-2 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : billing.orders.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-fg-3">{t.pricing.ordersEmpty}</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {billing.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">
                      {t.plan.names[o.plan]} · {t.pricing.months[o.months]}
                    </p>
                    <p className="mt-0.5 font-mono text-[12px] text-fg-3">
                      {o.id} · {formatDate(o.createdAt, lang)}
                    </p>
                  </div>
                  <p className="font-mono text-[14px] tabular-nums text-fg-2">{rupiah(o.amount)}</p>
                  <Badge tone={STATUS_TONE[o.status]}>{t.pricing.status[o.status]}</Badge>
                  {(o.status === "awaiting" || o.status === "confirming") && (
                    <Button size="sm" variant="ghost" loading={buying === o.id} onClick={() => resume(o)}>
                      {t.pricing.resume}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBox>
      )}

      <CheckoutDialog order={checkout} onClose={() => setCheckout(null)} onChange={onOrderChange} />
    </div>
  );
}

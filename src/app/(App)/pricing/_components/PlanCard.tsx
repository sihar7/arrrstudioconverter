"use client";

import type { ReactNode } from "react";
import { Check, Minus } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { planFeatures } from "@/lib/planFeatures";
import { usePlans } from "@/hooks/usePlans";
import type { PublicPlanId } from "@/lib/schemas/plans";

interface Props {
  id: PublicPlanId;
  price: ReactNode;
  billed?: string;
  highlight?: boolean;
  current?: boolean;
  action: ReactNode;
}

/** Kartu plan: nama · tagline · harga · CTA · daftar fitur (tercentang / tercoret) */
export default function PlanCard({ id, price, billed, highlight, current, action }: Props) {
  const { t } = useT();
  const { plans, tokens } = usePlans();
  const features = planFeatures(id, t, plans, tokens);

  return (
    <article
      aria-labelledby={`plan-${id}`}
      className={cn(
        "mat relative flex flex-col rounded-l border bg-surface p-6 transition-[border-color,transform] duration-300 ease-[var(--ease)] sm:p-7",
        highlight ? "border-line-2 lg:-translate-y-2" : "border-line/60 hover:border-line",
      )}
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 id={`plan-${id}`} className="caps text-[12px] text-fg">
          {t.plan.names[id]}
        </h2>
        {current ? (
          <span className="caps rounded-xs bg-tonal px-2 py-1 text-[10px] text-on-tonal">{t.pricing.current}</span>
        ) : (
          highlight && <span className="caps rounded-xs bg-accent px-2 py-1 text-[10px] text-on-accent">{t.pricing.popular}</span>
        )}
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-2">{t.plan.taglines[id]}</p>

      {/* flex-wrap: harga coret turun ke baris sendiri & "/bulan" ikut membungkus di kartu sempit (5 kolom) */}
      <div className="mt-7 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">{price}</div>
      <p className="mt-2 min-h-5 text-[13px] text-fg-3">{billed}</p>

      <div className="mt-6">{action}</div>

      <hr className="engrave my-7" />

      <ul className="flex flex-col gap-3">
        {features.map((f) => (
          <li key={f.text} className={cn("flex gap-3 text-[14px] leading-snug", f.included ? "text-fg-2" : "text-fg-3")}>
            {f.included ? (
              <Check width={18} height={18} strokeWidth={2} className="shrink-0 text-fg" aria-hidden="true" />
            ) : (
              <Minus width={18} height={18} className="shrink-0" aria-hidden="true" />
            )}
            <span className={cn(!f.included && "line-through decoration-fg-3/50")}>
              {!f.included && <span className="sr-only">{t.pricing.notIncluded} </span>}
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

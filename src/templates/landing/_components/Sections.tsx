"use client";

import { ArrowRight, Check } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";
import Console from "./Console";

const wrap = "mx-auto max-w-[var(--wrap)] px-4 sm:px-8";
const h2 = "font-display text-[clamp(32px,4.4vw,60px)] font-bold leading-[1] tracking-[-0.035em] [text-wrap:balance]";

/** Strip spesifikasi — angka lebar + label kapital, dipisah garis tipis (gaya lembar spesifikasi mobil) */
export function Numbers() {
  const { t } = useT();
  return (
    <section className="border-y border-line/60 bg-[var(--glass)] backdrop-blur-md">
      <dl className={cn(wrap, "grid grid-cols-2 md:grid-cols-4")}>
        {t.landing.numbers.map((n, i) => (
          <div
            key={n.label}
            className={cn(
              "reveal flex flex-col-reverse gap-3 py-10 sm:py-12",
              i % 2 === 1 && "border-l border-line/60 pl-5 sm:pl-8",
              i >= 2 && "border-t border-line/60 md:border-t-0",
              i === 2 && "md:border-l md:pl-8",
              i > 0 && "md:pl-8",
            )}
            style={{ ["--d" as string]: `${i * 80}ms` }}
          >
            <dt className="caps text-[10.5px] text-fg-3">{n.label}</dt>
            <dd className="font-display text-[clamp(34px,4.4vw,60px)] font-bold leading-none tracking-[-0.04em]">{n.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Showcase konsol */
export function Showcase() {
  const { t } = useT();
  const l = t.landing;
  return (
    <section className={cn(wrap, "py-24 sm:py-32")}>
      <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-4xl">
          <p className="eyebrow">{l.showcaseEyebrow}</p>
          <h2 className={cn(h2, "mt-5")}>{l.showcaseTitle}</h2>
        </div>
        <ButtonLink href="/converter" variant="ghost" iconRight={<ArrowRight width={15} height={15} />} className="self-start md:self-auto">
          {l.ctaStart}
        </ButtonLink>
      </div>
      <div className="reveal mt-14 [--d:120ms]">
        <Console />
      </div>
    </section>
  );
}

/** Kapabilitas — grid kartu bernomor; hover: garis atas memanjang + permukaan terangkat */
export function Features() {
  const { t } = useT();
  const l = t.landing;
  return (
    <section className={cn(wrap, "pb-24 sm:pb-32")}>
      <div className="reveal max-w-4xl">
        <p className="eyebrow">{l.featuresEyebrow}</p>
        <h2 className={cn(h2, "mt-5")}>{l.featuresTitle}</h2>
      </div>
      <ul className="mt-14 grid gap-px overflow-hidden rounded-l border border-line/60 bg-line/60 sm:grid-cols-2 lg:grid-cols-3">
        {l.features.map((f, i) => (
          <li
            key={f.title}
            className="reveal group relative bg-surface p-7 transition-colors duration-500 hover:bg-raised sm:p-8"
            style={{ ["--d" as string]: `${(i % 3) * 80}ms` }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-[var(--ease)] group-hover:scale-x-100"
            />
            <span className="font-mono text-[12px] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-8 font-display text-[19px] font-semibold tracking-[-0.015em]">{f.title}</h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-fg-2">{f.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Swatch tiap prinsip: grafit · perak · serpihan tempa · cahaya terarah */
const SWATCH = [
  "bg-[var(--p-n-12)] shadow-[inset_0_0_0_1px_var(--line)]",
  "btn-plate bg-[var(--p-silver-80)]",
  "forged-tile",
  "bg-[radial-gradient(circle_at_30%_25%,var(--accent-strong),transparent_70%)] bg-[var(--p-n-12)] shadow-[inset_0_0_0_1px_var(--line)]",
];

/** Filosofi desain — pelat forged besar disorot kursor + empat prinsip yang menjelaskan tiap keputusan visual */
export function Philosophy() {
  const { t } = useT();
  const p = t.landing.philosophy;
  return (
    <section className="border-t border-line/60">
      <div className={cn(wrap, "grid items-center gap-14 py-24 sm:py-32 lg:grid-cols-2 lg:gap-24")}>
        <div aria-hidden="true" className="reveal relative aspect-[5/4] w-full overflow-hidden rounded-l border border-line/60 lg:aspect-[4/5]">
          <div className="forged absolute inset-0 [background-size:560px_560px]" />
          <div className="forged-spot absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_30%_25%,transparent,color-mix(in_srgb,var(--bg)_75%,transparent))]" />
          <div className="absolute inset-0 shadow-[inset_0_1px_0_var(--mat-edge),inset_0_-1px_0_var(--mat-edge-low)]" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
            <span className="caps text-[10.5px] text-fg-2">Forged composite</span>
            <span className="font-mono text-[11px] text-fg-3">Graphite / Silver</span>
          </div>
        </div>
        <div>
          <p className="reveal eyebrow">{p.eyebrow}</p>
          <h2 className={cn(h2, "reveal mt-5 [--d:60ms]")}>{p.title}</h2>
          <p className="reveal mt-7 max-w-xl text-[16px] leading-relaxed text-fg-2 [--d:120ms]">{p.body}</p>
          <ol className="mt-12 border-t border-line/60">
            {p.points.map((pt, i) => (
              <li
                key={pt.title}
                className="reveal grid grid-cols-[40px_1fr] items-start gap-x-5 gap-y-1 border-b border-line/60 py-5"
                style={{ ["--d" as string]: `${180 + i * 80}ms` }}
              >
                <span aria-hidden="true" className={cn("mt-0.5 size-10 rounded-s", SWATCH[i])} />
                <div>
                  <p className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[15.5px] font-semibold">{pt.title}</span>
                  </p>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg-2">{pt.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Cara kerja — tiga langkah dengan garis progres bertahap */
export function Steps() {
  const { t } = useT();
  const l = t.landing;
  return (
    <section className="border-t border-line/60 bg-surface/70">
      <div className={cn(wrap, "py-24 sm:py-28")}>
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{l.stepsEyebrow}</p>
            <h2 className={cn(h2, "mt-5 max-w-3xl")}>{l.stepsTitle}</h2>
          </div>
        </div>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
          {l.steps.map((s, i) => (
            <li key={s.title} className="reveal relative md:pr-10" style={{ ["--d" as string]: `${i * 120}ms` }}>
              <div className="relative h-px bg-line-2">
                <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${((i + 1) / 3) * 100}%` }} />
              </div>
              <p className="mt-8 font-display text-[56px] font-bold leading-none tracking-[-0.05em] text-fg-3">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-6 text-[19px] font-semibold">{s.title}</h3>
              <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-fg-2">{s.desc}</p>
            </li>
          ))}
        </ol>
        <div className="reveal mt-14 [--d:360ms]">
          <ButtonLink href="/converter" variant="primary" size="lg" iconRight={<ArrowRight width={16} height={16} />}>
            {l.ctaStart}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Paket akses — tabel spesifikasi; kolom member ditandai aksen */
export function Compare() {
  const { t } = useT();
  const l = t.landing;
  const yes = (v: string) => v !== "—";
  return (
    <section className={cn(wrap, "py-24 sm:py-32")}>
      <div className="reveal max-w-4xl">
        <p className="eyebrow">{l.compareEyebrow}</p>
        <h2 className={cn(h2, "mt-5")}>{l.compareTitle}</h2>
      </div>
      <div className="reveal mat mt-14 overflow-x-auto rounded-l border border-line/60 bg-surface [--d:100ms]">
        <table className="w-full min-w-[520px] text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-line/60">
              <th scope="col" className="w-1/2 px-5 py-5 sm:px-7" />
              <th scope="col" className="caps px-5 py-5 text-[10.5px] text-fg-3 sm:px-7">
                {l.guestPlan}
              </th>
              <th scope="col" className="caps relative px-5 py-5 text-[10.5px] text-fg sm:px-7">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
                {l.memberPlan}
              </th>
            </tr>
          </thead>
          <tbody>
            {l.compareRows.map((r) => (
              <tr key={r.label} className="border-b border-line/60 transition-colors last:border-b-0 hover:bg-raised/60">
                <th scope="row" className="px-5 py-4 font-medium sm:px-7">
                  {r.label}
                </th>
                <td className="px-5 py-4 text-fg-3 sm:px-7">{r.guest}</td>
                <td className="bg-raised/40 px-5 py-4 font-medium text-fg sm:px-7">
                  <span className="inline-flex items-center gap-2">
                    {yes(r.member) && <Check width={15} height={15} strokeWidth={2.2} className="text-ok" aria-hidden="true" />}
                    {r.member}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[13px] text-fg-3">{l.compareNote}</p>
    </section>
  );
}

/** CTA penutup di atas forged yang disorot */
export function CtaBand() {
  const { t } = useT();
  return (
    <section className="relative isolate overflow-hidden border-t border-line/60">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="forged absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_75%_at_50%_45%,transparent,color-mix(in_srgb,var(--bg)_88%,transparent)_80%)]" />
        <div className="forged-spot absolute inset-0" />
      </div>
      <div className={cn(wrap, "flex flex-col items-center py-28 text-center sm:py-36")}>
        <div className="reveal forged-tile grid size-20 place-items-center rounded-l">
          <LogoMark size={40} />
        </div>
        <h2 className="reveal mt-10 max-w-4xl font-display text-[clamp(36px,5.6vw,80px)] font-bold leading-[0.98] tracking-[-0.045em] [--d:80ms] [text-wrap:balance]">
          {t.landing.ctaTitle}
        </h2>
        <div className="reveal mt-12 flex flex-col gap-3 sm:flex-row [--d:160ms]">
          <ButtonLink href="/converter" variant="primary" size="lg" iconRight={<ArrowRight width={16} height={16} />}>
            {t.landing.ctaStart}
          </ButtonLink>
          <ButtonLink href="/login" variant="ghost" size="lg">
            {t.landing.ctaLogin}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

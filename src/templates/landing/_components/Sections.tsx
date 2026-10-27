"use client";

import { useState } from "react";
import { ArrowRight, Check, Lock, NavArrowDown } from "iconoir-react";
import { SfClock, SfCrown, SfGear, SfLock, SfStack, SfWaveform, type SfIcon } from "@/components/icons/SfIcons";
import AppIcon, { type IosTone } from "@/components/ui/AppIcon";
import { useT } from "@/hooks/useT";
import { useMeQuery } from "@/store/api/baseApi";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";
import { rupiah } from "@/lib/planFeatures";
import { PLANS, PLAN_PRICE } from "@/lib/schemas/plans";
import { usePlans } from "@/hooks/usePlans";
import Console from "./Console";

const wrap = "mx-auto max-w-[var(--wrap)] px-4 sm:px-8";
const h2 = "font-display text-[clamp(32px,4.4vw,60px)] font-bold leading-[1] tracking-[-0.035em] [text-wrap:balance]";

/** Strip spesifikasi — angka lebar + label kapital, dipisah garis tipis (gaya lembar spesifikasi mobil) */
export function Numbers() {
  const { t } = useT();
  return (
    <section className="border-y border-line/60 bg-[var(--glass)] backdrop-blur-md">
      {/* Divider seragam: garis kiri di tiap sel kecuali kolom pertama (2 kolom di HP, 4 kolom di desktop),
          garis atas antar baris di HP. Padding konsisten → angka sejajar rapi. */}
      <dl className={cn(wrap, "grid grid-cols-2 md:grid-cols-4")}>
        {t.landing.numbers.map((n, i) => (
          <div
            key={n.label}
            className={cn(
              "reveal flex flex-col-reverse gap-3 border-line/60 py-10 pr-4 sm:py-12",
              // kolom pertama rata tepi; sisanya diberi garis kiri + jarak dari garis
              i === 0 ? "pl-0" : "pl-5 sm:pl-7",
              (i === 1 || i === 3) && "border-l",
              (i === 2 || i === 3) && "border-t md:border-t-0",
              i !== 0 && "md:border-l md:pl-7",
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
            <span className="grid size-7 place-items-center rounded-full bg-fg/[0.08] text-[13px] font-semibold tabular-nums text-fg-2">{i + 1}</span>
            <h3 className="mt-8 font-display text-[19px] font-semibold tracking-[-0.015em]">{f.title}</h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-fg-2">{f.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ubin tiap prinsip: kejelasan · konten di depan · kedalaman · gerak pegas */
const PRINCIPLES: { tone: IosTone; icon: SfIcon }[] = [
  { tone: "blue", icon: SfClock },
  { tone: "pink", icon: SfWaveform },
  { tone: "purple", icon: SfStack },
  { tone: "orange", icon: SfCrown },
];
function PrincipleIcon({ i }: { i: number }) {
  const { tone, icon: Icon } = PRINCIPLES[i % PRINCIPLES.length];
  return (
    <AppIcon tone={tone} size={40} className="mt-0.5">
      <Icon filled />
    </AppIcon>
  );
}
/** Potongan "layar utama" untuk panel visual Filosofi */
const HOME: { tone: IosTone; icon: SfIcon; label: string }[] = [
  { tone: "pink", icon: SfWaveform, label: "Converter" },
  { tone: "purple", icon: SfStack, label: "Library" },
  { tone: "blue", icon: SfClock, label: "History" },
  { tone: "orange", icon: SfCrown, label: "Pro" },
  { tone: "green", icon: SfLock, label: "Obfuscator" },
  { tone: "gray", icon: SfGear, label: "Settings" },
];

/** Filosofi desain — potongan layar utama iOS (ikon mengambang bergiliran) + empat prinsip */
export function Philosophy() {
  const { t } = useT();
  const p = t.landing.philosophy;
  return (
    <section className="border-t border-line/60">
      <div className={cn(wrap, "grid items-center gap-14 py-24 sm:py-32 lg:grid-cols-2 lg:gap-24")}>
        <div aria-hidden="true" className="reveal relative aspect-[5/4] w-full overflow-hidden rounded-l border border-line/60 lg:aspect-[4/5]">
          <div className="forged absolute inset-0" />
          <div className="absolute inset-0 grid place-items-center p-8">
            <div className="grid grid-cols-3 gap-x-8 gap-y-7 sm:gap-x-12">
              {HOME.map(({ tone, icon: Icon, label }, i) => (
                <span key={label} className="home-icon flex flex-col items-center gap-2" style={{ ["--d" as string]: `${i * 70}ms` }}>
                  <AppIcon tone={tone} size={64}>
                    <Icon filled />
                  </AppIcon>
                  <span className="text-[12px] font-medium text-fg-2">{label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
            <span className="text-[13px] font-semibold text-fg-2">SF · Spring · Glass</span>
            <span className="font-mono text-[11px] text-fg-3">0 KB font</span>
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
                <PrincipleIcon i={i} />
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

const NO = "—";
const COLS = ["guest", "free", "pro", "studio"] as const;
type Col = (typeof COLS)[number];
/** Ubin ikon kepala kolom paket (warna sistem iOS) */
const COL_ICON: Record<Col, { tone: IosTone; icon: SfIcon }> = {
  guest: { tone: "gray", icon: SfClock },
  free: { tone: "blue", icon: SfWaveform },
  pro: { tone: "orange", icon: SfCrown },
  studio: { tone: "purple", icon: SfStack },
};

/**
 * Paket & harga — Tamu · Free · Pro · Studio. Semua angka diturunkan dari PLANS (sama dengan batas server &
 * halaman Harga); kolom Pro ditandai aksen sebagai pilihan utama. Tamu = batas free tanpa login.
 */
export function Compare() {
  const { t, f } = useT();
  const { data: me } = useMeQuery();
  const l = t.landing;
  const c = l.compare;
  // Batas efektif (bawaan + pengaturan admin); kuota tamu dari sesi bila pengunjung belum login
  const { plans, guest } = usePlans();
  const guestDaily = (!me?.user && me?.quota.limit) || guest;
  const plan = (col: Col) => plans[col === "guest" ? "free" : col];

  const rows: { label: string; get: (col: Col) => string }[] = [
    {
      label: c.price,
      get: (col) => (col === "guest" || col === "free" ? c.free : `${rupiah(PLAN_PRICE[col])}${c.perMonth}`),
    },
    {
      label: c.daily,
      get: (col) => (col === "guest" ? f(c.perDay, { n: guestDaily }) : (plan(col).daily ?? c.unlimited).toString()),
    },
    { label: c.duration, get: (col) => f(c.minutes, { n: Math.floor(plan(col).maxDurationSec / 60) }) },
    { label: c.quality, get: (col) => `${plan(col).maxBitrate} kbps` },
    {
      label: c.formats,
      get: (col) => (plan(col).formats.length === PLANS.studio.formats.length ? c.allFormats : plan(col).formats.map((x) => x.toUpperCase()).join(", ")),
    },
    {
      label: c.effects,
      get: (col) => (plan(col).effects.includes("spatial8d") ? c.fxStudio : plan(col).effects.length ? c.fxPro : c.fxBasic),
    },
    {
      label: c.compress,
      get: (col) => ({ off: NO, standard: c.compressStandard, max: c.compressMax })[plan(col).smartCompress],
    },
    { label: c.publish, get: (col) => (col === "guest" ? NO : c.yes) },
    {
      label: c.bulk,
      get: (col) => {
        const n = plan(col).bulkRoblox;
        return n == null ? c.unlimited : n > 0 ? f(c.bulkMax, { n }) : NO;
      },
    },
    { label: c.library, get: (col) => ({ off: NO, basic: c.libraryBasic, full: c.libraryFull })[plan(col).library] },
    { label: c.history, get: (col) => (col === "guest" ? NO : String(plan(col).historyMax)) },
  ];

  const head = (col: Col) => (col === "guest" ? l.guestPlan : t.plan.names[col]);

  return (
    <section className={cn(wrap, "py-24 sm:py-32")}>
      <div className="reveal max-w-4xl">
        <p className="eyebrow">{l.compareEyebrow}</p>
        <h2 className={cn(h2, "mt-5")}>{l.compareTitle}</h2>
      </div>
      {/* Gaya "Bandingkan model" Apple: kepala ber-ubin ikon, kolom Pro tersorot, centang lingkaran hijau */}
      <div className="reveal mat thin-scroll mt-14 overflow-x-auto rounded-[24px] border border-[var(--hairline)] bg-surface [--d:100ms]">
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left text-[15px]">
          <colgroup>
            <col className="w-[26%]" />
            {COLS.map((col) => (
              <col key={col} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="border-b border-[var(--hairline)] px-5 py-6 sm:px-6" />
              {COLS.map((col) => {
                const { tone, icon: Icon } = COL_ICON[col];
                return (
                  <th
                    key={col}
                    scope="col"
                    className={cn(
                      "border-b border-[var(--hairline)] px-4 pb-5 pt-6 align-top font-normal sm:px-5",
                      col === "pro" && "rounded-t-[18px] bg-fg/[0.05]",
                    )}
                  >
                    <AppIcon tone={tone} size={34}>
                      <Icon filled />
                    </AppIcon>
                    <span className={cn("mt-3 block text-[17px] font-semibold tracking-[-0.01em]", col === "guest" ? "text-fg-2" : "text-fg")}>{head(col)}</span>
                    {col === "guest" && <span className="mt-0.5 block text-[12.5px] text-fg-3">{l.guestSub}</span>}
                    {col === "pro" && (
                      <span className="mt-1 inline-block rounded-full bg-[var(--ios-orange)]/15 px-2 py-0.5 text-[11.5px] font-semibold text-[var(--ios-orange)]">
                        {t.pricing.popular}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.label} className="group/tr">
                <th
                  scope="row"
                  className="border-b border-[var(--hairline)] px-5 py-3.5 font-medium text-fg-2 transition-colors group-last/tr:border-b-0 group-hover/tr:text-fg sm:px-6"
                >
                  {r.label}
                </th>
                {COLS.map((col) => {
                  const v = r.get(col);
                  const last = ri === rows.length - 1;
                  return (
                    <td
                      key={col}
                      className={cn(
                        "border-b border-[var(--hairline)] px-4 py-3.5 transition-colors group-last/tr:border-b-0 group-hover/tr:bg-fg/[0.025] sm:px-5",
                        col === "pro" && "bg-fg/[0.05] group-hover/tr:bg-fg/[0.07]",
                        col === "pro" && last && "rounded-b-[18px]",
                        ri === 0 ? "text-[17px] font-semibold tracking-[-0.01em] text-fg" : v === NO ? "text-fg-3" : col === "guest" ? "text-fg-2" : "font-medium text-fg",
                      )}
                    >
                      {v === c.yes ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="grid size-5 place-items-center rounded-full bg-[var(--ios-green)] text-white" aria-hidden="true">
                            <Check width={13} height={13} strokeWidth={2.8} />
                          </span>
                          {v}
                        </span>
                      ) : v === NO ? (
                        <span aria-label={t.pricing.notIncluded.replace(/:$/, "")} className="text-fg-3/70">
                          {NO}
                        </span>
                      ) : (
                        v
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="reveal mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between [--d:140ms]">
        <p className="max-w-2xl text-[13px] leading-relaxed text-fg-3">{l.compareNote}</p>
        <ButtonLink href="/pricing" variant="ghost" iconRight={<ArrowRight width={16} height={16} />} className="shrink-0 self-start sm:self-auto">
          {l.compareCta}
        </ButtonLink>
      </div>
    </section>
  );
}

/** CTA penutup di atas forged yang disorot */
export function CtaBand() {
  const { t } = useT();
  const { data: me } = useMeQuery();
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
          <ButtonLink href={me?.user ? "/youtube" : "/login"} variant="ghost" size="lg">
            {me?.user ? t.landing.ctaYoutube : t.landing.ctaLogin}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Showcase Obfuscator — 10 lapis proteksi script Luau. Showcase publik; tombol buka hanya untuk admin. */
export function Obfuscator() {
  const { t } = useT();
  const o = t.landing;
  const { data: me } = useMeQuery();
  const isAdmin = Boolean(me?.user?.isAdmin);
  return (
    <section className="border-t border-line/60 bg-surface/70">
      <div className={cn(wrap, "py-24 sm:py-32")}>
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow inline-flex items-center gap-2">
              <Lock width={13} height={13} strokeWidth={2} aria-hidden="true" />
              {o.obfEyebrow}
            </p>
            <h2 className={cn(h2, "mt-5")}>{o.obfTitle}</h2>
            <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-fg-2">{o.obfSub}</p>
          </div>
          {isAdmin && (
            <ButtonLink
              href="/obfuscator"
              variant="primary"
              iconRight={<ArrowRight width={15} height={15} />}
              className="self-start md:self-auto"
            >
              {o.obfCta}
            </ButtonLink>
          )}
        </div>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-l border border-line/60 bg-line/60 sm:grid-cols-2 lg:grid-cols-5">
          {o.obfLayers.map((layer, i) => (
            <li
              key={layer.title}
              className="reveal group relative bg-surface p-6 transition-colors duration-500 hover:bg-raised"
              style={{ ["--d" as string]: `${(i % 5) * 60}ms` }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-[var(--ease)] group-hover:scale-x-100"
              />
              <span className="font-mono text-[12px] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-6 text-[15.5px] font-semibold tracking-[-0.01em]">{layer.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-2">{layer.desc}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-fg-3">{o.obfNote}</p>
      </div>
    </section>
  );
}

/** FAQ — daftar pertanyaan yang bisa dibuka satu per satu (akordeon aksesibel). */
export function Faq() {
  const { t } = useT();
  const l = t.landing;
  const [open, setOpen] = useState(0);
  return (
    <section className={cn(wrap, "py-24 sm:py-32")}>
      <div className="reveal max-w-4xl">
        <p className="eyebrow">{l.faqEyebrow}</p>
        <h2 className={cn(h2, "mt-5")}>{l.faqTitle}</h2>
      </div>
      <ul className="reveal mt-14 border-t border-line/60 [--d:100ms]">
        {l.faq.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q} className="border-b border-line/60">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="state-layer flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-fg"
                >
                  <span className="text-[16.5px] font-semibold tracking-[-0.01em]">{item.q}</span>
                  <NavArrowDown
                    width={20}
                    height={20}
                    aria-hidden="true"
                    className={cn("shrink-0 text-fg-3 transition-transform duration-300", isOpen && "rotate-180 text-fg")}
                  />
                </button>
              </h3>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease)]",
                  isOpen ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <p className="overflow-hidden pr-8 text-[14.5px] leading-relaxed text-fg-2">{item.a}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

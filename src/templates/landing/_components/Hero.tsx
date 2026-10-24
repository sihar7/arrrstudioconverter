"use client";

import Link from "next/link";
import { ArrowRight, Discord } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Hero sinematik: permukaan forged penuh disorot lampu studio (kanan atas + mengikuti kursor),
 * tirai gelap kiri-bawah menjaga keterbacaan. Teks rata kiri-bawah seperti halaman model ferrari.com.
 */
export default function Hero() {
  const { t } = useT();
  const l = t.landing;
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Material + cahaya (dekoratif) */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="forged absolute inset-0 [background-size:520px_520px]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_78%_22%,transparent_0%,color-mix(in_srgb,var(--bg)_70%,transparent)_55%,var(--bg)_100%)]" />
        <div className="forged-spot absolute inset-0" />
        <div className="hero-veil absolute inset-0" />
      </div>

      <div className="mx-auto flex w-full max-w-[var(--wrap)] flex-1 flex-col justify-end px-4 pb-[calc(68px+env(safe-area-inset-bottom)+32px)] pt-[calc(var(--nav-h)+48px)] sm:px-8 xl:pb-12">
        <p className="rise eyebrow">{l.eyebrow}</p>
        <h1 className="rise mt-6 font-display text-[clamp(40px,6.2vw,100px)] font-bold leading-[0.96] tracking-[-0.045em] [animation-delay:80ms]">
          <span className="block">{l.title1}</span>
          <span className="metal-text block">{l.title2}</span>
        </h1>
        <p className="rise mt-8 max-w-[580px] text-[16px] leading-relaxed text-fg-2 sm:text-[17px] [animation-delay:160ms]">{l.sub}</p>
        <div className="rise mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row [animation-delay:240ms]">
          <ButtonLink href="/converter" variant="primary" size="lg" iconRight={<ArrowRight width={16} height={16} />}>
            {l.ctaStart}
          </ButtonLink>
          <ButtonLink href="/login" variant="ghost" size="lg" icon={<Discord width={18} height={18} />}>
            {l.ctaLogin}
          </ButtonLink>
        </div>

        {/* Alur singkat — user langsung tahu 3 langkahnya sebelum mulai */}
        <ol className="rise mt-12 grid gap-px overflow-hidden rounded-l border border-line/60 bg-line/60 sm:grid-cols-3 [animation-delay:320ms]">
          {l.steps.map((s, i) => (
            <li key={s.title} className="flex items-baseline gap-4 bg-[var(--glass)] px-5 py-4 backdrop-blur-md">
              <span className="font-mono text-[12px] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block text-[14px] font-semibold">{s.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-fg-3">{s.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="rise mt-8 flex items-end justify-between gap-6 [animation-delay:400ms]">
          <Link href="/converter" className="group inline-flex min-h-11 items-center gap-3 text-[13px] text-fg-2 hover:text-fg">
            <span className="caps rounded-xs bg-accent px-2 py-1 text-[10px] text-on-accent">{l.badgeNew}</span>
            <span className="link-line">{l.badge}</span>
            <ArrowRight width={14} height={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <div aria-hidden="true" className="hidden flex-col items-center gap-3 sm:flex">
            <span className="caps text-[10px] text-fg-3">{l.scroll}</span>
            <span className="scroll-cue" />
          </div>
        </div>
      </div>
    </section>
  );
}

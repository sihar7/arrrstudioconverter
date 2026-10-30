"use client";

import Link from "next/link";
import { ArrowRight, Discord, Download, Lock } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { ButtonLink } from "@/components/ui/Button";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";
import { useMeQuery } from "@/store/api/baseApi";
import { SfPlayRect } from "@/components/icons/SfIcons";
import Console from "./Console";

/**
 * Hero (rombak 2026-10-31, acuan ai-agency-op-tailwind dengan biru → silver):
 * judul display dua nada rata kiri · CTA pill · berkas cahaya silver vertikal yang "jatuh" ke mockup app
 * dalam bingkai browser (pendar di tepi atas bingkai). Semua cahaya dekoratif, aria-hidden, transform/opacity saja.
 */
export default function Hero() {
  const { t } = useT();
  const l = t.landing;
  const hydrated = useHydrated();
  const inDesktop = hydrated && Boolean(getDesktop());
  // Sudah login → tombol kedua bukan "Masuk", tapi jalan pintas ke YouTube
  const { data: me } = useMeQuery();
  return (
    <section className="relative isolate overflow-hidden pt-[calc(var(--nav-h)+56px)] sm:pt-[calc(var(--nav-h)+88px)]">
      {/* Cahaya (dekoratif): pendar atas + berkas vertikal + genangan cahaya di tepi bingkai */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_86%_0%,rgb(243_244_246/0.09),transparent_70%)]" />
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="relative">
          {/* Berkas cahaya: 12px di bawah nav (tak menembus kontrol header) → tepat menyentuh tepi atas bingkai mockup.
              Dijangkarkan ke blok teks ini: -top = jarak padding (88px) − 12px, -bottom = jarak ke bingkai (mt-24). */}
          <div aria-hidden="true" className="hero-beam pointer-events-none absolute -bottom-24 -top-[76px] left-[86%] -z-10 hidden w-[3px] -translate-x-1/2 sm:block" />
          {/* Pengumuman app desktop (disembunyikan di dalam app desktop) */}
          {!inDesktop && (
            <Link
              href="/download"
              className="rise group mb-10 inline-flex min-h-11 w-fit max-w-full items-center gap-3 rounded-full border border-[var(--hairline)] bg-surface/70 py-1.5 pl-1.5 pr-4 text-[13.5px] text-fg backdrop-blur-md transition-colors hover:border-line"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent bg-[image:var(--sheen)] px-2.5 py-1 font-mono text-[11.5px] font-medium text-on-accent">
                <Download width={13} height={13} /> {l.badgeNew}
              </span>
              <span className="truncate">{l.desktopBadge}</span>
              <ArrowRight
                width={14}
                height={14}
                className="shrink-0 text-fg-3 transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          )}

          <h1 className="rise max-w-[15ch] font-display text-[clamp(44px,6.4vw,92px)] font-semibold leading-[1.02] tracking-[-0.045em] [text-wrap:balance]">
            {l.title1} <span className="tone-2">{l.title2}</span>
          </h1>
          <p className="rise mt-7 max-w-[560px] text-[16px] leading-relaxed text-fg-2 sm:text-[17px] [animation-delay:120ms]">
            {l.sub}
          </p>
          <div className="rise mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row [animation-delay:200ms]">
            <ButtonLink
              href="/converter"
              variant="primary"
              size="lg"
              iconRight={<ArrowRight width={16} height={16} />}
            >
              {l.ctaStart}
            </ButtonLink>
            {me?.user ? (
              <ButtonLink
                href="/youtube"
                variant="ghost"
                size="lg"
                icon={<SfPlayRect size={18} />}
              >
                {l.ctaYoutube}
              </ButtonLink>
            ) : (
              <ButtonLink
                href="/login"
                variant="ghost"
                size="lg"
                icon={<Discord width={18} height={18} />}
              >
                {l.ctaLogin}
              </ButtonLink>
            )}
          </div>
        </div>

        {/* Mockup app dalam bingkai browser — tepi atas disinari berkas cahaya */}
        <div className="rise relative mt-16 sm:mt-24 [animation-delay:280ms]">
          <div
            aria-hidden="true"
            className="hero-pool pointer-events-none absolute -top-12 left-[86%] h-32 w-[30%] -translate-x-1/2"
          />
          <div className="hero-frame relative overflow-hidden rounded-t-[20px] border border-b-0 border-[var(--hairline)] bg-[var(--p-n-4)] light:bg-surface">
            <div
              aria-hidden="true"
              className="flex items-center gap-4 border-b border-[var(--hairline)] px-4 py-3"
            >
              <span className="flex gap-1.5">
                <span className="size-3 rounded-full bg-fg-3/40" />
                <span className="size-3 rounded-full bg-fg-3/40" />
                <span className="size-3 rounded-full bg-fg-3/40" />
              </span>
              <span className="mx-auto inline-flex min-w-0 items-center gap-1.5 rounded-full bg-raised px-4 py-1 font-mono text-[12px] text-fg-3">
                <Lock width={11} height={11} /> bypass.arrrstudio.com
              </span>
              <span className="w-[54px]" />
            </div>
            <div className="p-3 sm:p-6">
              <Console />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

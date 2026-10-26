"use client";

import Link from "next/link";
import { ArrowUpRight, Discord } from "iconoir-react";
import Url from "@/Url/Url";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/shared/Logo";
import { LangToggle, ThemeToggle } from "@/components/shared/PrefToggles";
import { NAV } from "../header/Header";

/**
 * Footer editorial (acuan ferrari.com): wordmark besar · kolom tautan · preferensi · baris legal.
 * Latar = forged disorot dari bawah, dipisah dari konten oleh alur terukir.
 * withTabBar: beri ruang untuk tab bar bawah di layar < xl.
 */
export default function Footer({ withTabBar = false }: { withTabBar?: boolean }) {
  const { t } = useT();
  const f = t.footer;
  const col = "caps text-fg-3";
  const link = "link-line text-[14px] text-fg-2 transition-colors hover:text-fg";

  return (
    <footer className={cn("relative isolate overflow-hidden", withTabBar && "pb-[calc(68px+env(safe-area-inset-bottom))] xl:pb-0")}>
      <hr className="engrave" />
      {/* Forged hanya muncul di kolam cahaya bawah — sama seperti latar halaman, dibalik arahnya */}
      <div
        aria-hidden="true"
        className="forged absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(90%_80%_at_50%_120%,#000_0%,transparent_75%)]"
      />
      <div className="mx-auto max-w-[var(--wrap)] px-4 sm:px-8">
        <div className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-8 lg:py-20">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="ARRR Studio Converter">
              <LogoMark size={40} />
              <span className="font-display text-[15px] font-bold tracking-[0.18em]">ARRR STUDIO</span>
            </Link>
            <p className="mt-6 text-[14px] leading-relaxed text-fg-2">{f.tagline}</p>
            <a
              href={Url.arrDiscord}
              target="_blank"
              rel="noreferrer"
              className="ios-press mt-8 inline-flex h-11 items-center gap-2.5 rounded-full bg-[#5865F2] px-5 text-[15px] font-semibold text-white hover:bg-[#4752c4]"
            >
              <Discord width={16} height={16} /> Discord
            </a>
          </div>

          <nav aria-label={f.product}>
            <p className={col}>{f.product}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {NAV.map(({ href, key }) => (
                <li key={href}>
                  <Link href={href} className={link}>
                    {t.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={f.studio}>
            <p className={col}>{f.studio}</p>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <a href={Url.arrWebsite} target="_blank" rel="noreferrer" className={cn(link, "inline-flex items-center gap-1")}>
                  Website <ArrowUpRight width={13} height={13} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href={Url.arrDiscord} target="_blank" rel="noreferrer" className={cn(link, "inline-flex items-center gap-1")}>
                  Discord <ArrowUpRight width={13} height={13} aria-hidden="true" />
                </a>
              </li>
            </ul>
          </nav>

          <div>
            <p className={col}>{f.prefs}</p>
            <dl className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4 border-b border-line/60 pb-2">
                <dt className="text-[14px] text-fg-2">{f.language}</dt>
                <dd>
                  <LangToggle />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[14px] text-fg-2">{f.theme}</dt>
                <dd>
                  <ThemeToggle />
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <hr className="engrave" />
        <div className="flex flex-col gap-2 py-7 text-[12.5px] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{t.landing.footer}</p>
          <p>{f.note}</p>
        </div>
      </div>
    </footer>
  );
}

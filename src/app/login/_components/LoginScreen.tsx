"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, NavArrowLeft } from "iconoir-react";
import { useT } from "@/hooks/useT";
import Logo from "@/components/shared/Logo";
import { LangToggle, ThemeToggle } from "@/components/shared/PrefToggles";
import LoginActions, { type LoginErrKey } from "./LoginActions";
import DesktopLogin from "./DesktopLogin";

export default function LoginScreen() {
  const { t } = useT();
  const l = t.login;
  const params = useSearchParams();

  const rawNext = params.get("next") ?? "/converter";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/converter";
  const errKey = params.get("error") as LoginErrKey | null;

  return (
    <>
      {/* App desktop punya jendela login sendiri (DesktopLogin); layout web ini disembunyikan lewat varian desk: */}
      <DesktopLogin next={next} errKey={errKey} />
      <div className="grid min-h-dvh lg:grid-cols-2 desk:hidden">
        {/* Kiri — editorial */}
        <section className="relative isolate hidden flex-col justify-between overflow-hidden border-r border-line/60 p-12 lg:flex xl:p-[72px]">
          {/* Forged disorot lampu studio — material yang sama dengan hero landing */}
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div className="forged absolute inset-0 [background-size:520px_520px]" />
            <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_70%_20%,transparent,color-mix(in_srgb,var(--bg)_82%,transparent)_70%)]" />
            <div className="forged-spot absolute inset-0" />
            <div className="hero-veil absolute inset-0" />
          </div>
          <div className="relative">
            <Logo />
          </div>
          <div className="relative">
            <p className="eyebrow">{l.eyebrow}</p>
            <h1 className="mt-6 max-w-[12ch] font-display text-[clamp(44px,4.8vw,76px)] font-bold leading-[0.96] tracking-[-0.045em]">
              {t.landing.title1} <span className="metal-text">{t.landing.title2}</span>
            </h1>
            <ol className="mt-14 max-w-[520px] border-t border-line/60">
              {l.items.map((it, i) => (
                <li key={it.title} className="grid grid-cols-[44px_1fr] border-b border-line/60 py-5">
                  <span className="font-mono text-[12px] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[15px] font-semibold">{it.title}</p>
                    <p className="mt-1 text-[14px] text-fg-2">{it.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p className="relative text-[13px] text-fg-3">© 2026 ARRR Studio</p>
        </section>

        {/* Kanan — form */}
        <section className="mat flex flex-col bg-surface px-5 py-6 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between">
            <Link href="/" className="caps inline-flex min-h-11 items-center gap-1.5 text-fg-2 hover:text-fg">
              <NavArrowLeft width={14} height={14} /> {t.common.back}
            </Link>
            <div className="flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-14">
            <div className="mb-10 lg:hidden">
              <Logo />
            </div>
            <p className="eyebrow">ARRR Studio</p>
            <h2 className="mt-4 font-display text-[40px] font-bold tracking-[-0.035em]">{l.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{l.sub}</p>

            <div className="mt-9">
              <LoginActions next={next} errKey={errKey} />
            </div>

            <div className="caps my-8 flex items-center gap-4 text-[10.5px] text-fg-3">
              <span className="h-px flex-1 bg-line" />
              {t.common.or}
              <span className="h-px flex-1 bg-line" />
            </div>

            <Link href="/converter" className="caps group inline-flex min-h-11 items-center gap-2 self-start text-fg">
              {l.guest}
              <ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-1" />
            </Link>

            <p className="mt-12 text-[12.5px] leading-relaxed text-fg-3">{l.terms}</p>
          </div>
        </section>
      </div>
    </>
  );
}

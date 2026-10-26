"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Discord, NavArrowLeft, WarningTriangle } from "iconoir-react";
import { useDevLoginMutation, useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import Logo from "@/components/shared/Logo";
import { LangToggle, ThemeToggle } from "@/components/shared/PrefToggles";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";
import type { Dictionary } from "@/utils/languages/id";

type ErrKey = keyof Dictionary["login"]["errors"];

export default function LoginScreen() {
  const { t } = useT();
  const l = t.login;
  const params = useSearchParams();
  const router = useRouter();
  const { data: me, isLoading } = useMeQuery();
  const [devLogin, { isLoading: devBusy }] = useDevLoginMutation();
  // App desktop: wajib login (lihat DesktopLoginGuard) → tanpa "kembali ke landing" & "lanjut sebagai tamu"
  const hydrated = useHydrated();
  const inDesktop = hydrated && Boolean(getDesktop());

  const rawNext = params.get("next") ?? "/converter";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/converter";
  const errKey = params.get("error") as ErrKey | null;
  const error = errKey && errKey in l.errors ? l.errors[errKey] : null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
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
          {inDesktop ? (
            <Logo />
          ) : (
            <Link href="/" className="caps inline-flex min-h-11 items-center gap-1.5 text-fg-2 hover:text-fg">
              <NavArrowLeft width={14} height={14} /> {t.common.back}
            </Link>
          )}
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

          {error && (
            <div role="alert" className="rise mt-6 flex gap-3 border-l-2 border-err bg-bg py-3 pl-4 pr-3 text-[14px] text-fg-2">
              <WarningTriangle width={18} height={18} className="mt-0.5 shrink-0 text-err" />
              <div>
                <p>{error}</p>
                {errKey === "not_member" && me?.auth.inviteUrl && (
                  <a href={me.auth.inviteUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-fg underline underline-offset-4">
                    {l.joinServer}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="mt-9 flex flex-col gap-3">
            {isLoading ? (
              <Skeleton className="h-[52px] w-full" />
            ) : me?.user ? (
              <Button variant="inverse" size="lg" className="w-full justify-between normal-case tracking-normal" onClick={() => router.push(next)}>
                {me.user.displayName}
                <ArrowRight width={18} height={18} />
              </Button>
            ) : (
              <a
                href={`/api/auth/discord?next=${encodeURIComponent(next)}`}
                aria-disabled={me ? !me.auth.discordEnabled : undefined}
                className="btn-plate group flex h-14 items-center gap-3 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent transition-[background-color,transform] hover:bg-accent-strong active:scale-[0.98] aria-disabled:pointer-events-none aria-disabled:opacity-40"
              >
                <Discord width={20} height={20} />
                <span className="flex-1">{l.discord}</span>
                <ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
            {me?.auth.guildRequired && !me.user && <p className="text-[13px] text-fg-3">{l.guildNote}</p>}

            {me?.auth.devLogin && !me.user && (
              <div className="mt-2 flex flex-col gap-2 border border-dashed border-line-2 p-4">
                <Button
                  variant="ghost"
                  loading={devBusy}
                  onClick={async () => {
                    await devLogin().unwrap();
                    router.push(next);
                  }}
                >
                  {l.dev}
                </Button>
                <p className="text-[12.5px] text-fg-3">{l.devNote}</p>
              </div>
            )}
          </div>

          {!inDesktop && (
            <>
              <div className="caps my-8 flex items-center gap-4 text-[10.5px] text-fg-3">
                <span className="h-px flex-1 bg-line" />
                {t.common.or}
                <span className="h-px flex-1 bg-line" />
              </div>

              <Link href="/converter" className="caps group inline-flex min-h-11 items-center gap-2 self-start text-fg">
                {l.guest}
                <ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </>
          )}

          <p className="mt-12 text-[12.5px] leading-relaxed text-fg-3">{l.terms}</p>
        </div>
      </section>
    </div>
  );
}

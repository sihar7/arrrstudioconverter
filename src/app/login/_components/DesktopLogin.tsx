"use client";

import dynamic from "next/dynamic";
import { SfCube, SfCutout, SfWaveform } from "@/components/icons/SfIcons";
import AppIcon from "@/components/ui/AppIcon";
import { LogoMark } from "@/components/shared/Logo";
import { LangToggle, ThemeToggle } from "@/components/shared/PrefToggles";
import { useHydrated } from "@/hooks/useHydrated";
import { useT } from "@/hooks/useT";
import { getDesktop } from "@/type/desktop";
import LoginActions, { type LoginErrKey } from "./LoginActions";

// three.js hanya diunduh di app desktop
const WaveField = dynamic(() => import("./WaveField"), { ssr: false });

/**
 * Login khusus app desktop — jendela "selamat datang" ala aplikasi, bukan halaman web:
 * title bar sendiri (bahasa & tema, tombol jendela native di kanan) · latar medan gelombang Three.js ·
 * kartu login di tengah · versi app di kaki. Tanpa panel editorial & tanpa "lanjut sebagai tamu"
 * (converter di app wajib login). Tampil lewat varian `desk:` → tidak ada kedip layout web saat dibuka.
 */
export default function DesktopLogin({ next, errKey }: { next: string; errKey: LoginErrKey | null }) {
  const { t } = useT();
  const l = t.login;
  const desktop = useHydrated() ? getDesktop() : undefined;
  const features = [
    { icon: SfWaveform, tone: "pink", label: t.nav.converter },
    { icon: SfCube, tone: "teal", label: t.nav.skybox },
    { icon: SfCutout, tone: "indigo", label: t.desktop.aiImages },
  ] as const;

  return (
    <div className="desk-own-bar app-drag relative isolate hidden min-h-dvh flex-col overflow-hidden bg-bg desk:flex">
      {desktop && <WaveField className="absolute inset-x-0 bottom-0 top-[30%] -z-10" />}
      {/* Kolam gelap di belakang kartu → teks tetap terbaca di atas gelombang */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(42%_48%_at_50%_46%,var(--bg)_35%,transparent_100%)]" />

      <header className="flex h-[var(--bar-h)] shrink-0 items-center justify-between pl-4 pr-[calc(var(--caption-w)+8px)] mac:pl-[84px]">
        <span className="flex items-center gap-2.5 mac:invisible">
          <LogoMark size={28} priority />
          <span className="whitespace-nowrap text-[11px] font-bold tracking-[0.22em]">ARRR STUDIO</span>
        </span>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-6 py-8">
        <div className="rise w-full max-w-[400px] rounded-[26px] border border-line/60 bg-surface/85 p-8 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55),var(--elev-1)] backdrop-blur-xl [-webkit-app-region:no-drag] light:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.25),var(--elev-1)]">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-[76px] place-items-center rounded-[22px] border border-line/60 bg-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.06),var(--elev-1)]">
              <LogoMark size={40} priority />
            </span>
            <h1 className="mt-6 text-[24px] font-bold tracking-[-0.025em]">{t.desktop.loginTitle}</h1>
            <p className="mt-2 max-w-[30ch] text-[14px] leading-relaxed text-fg-2">{l.sub}</p>
          </div>

          <div className="mt-8">
            <LoginActions next={next} errKey={errKey} />
          </div>

          <ul className="mt-8 grid grid-cols-3 gap-2 border-t border-line/60 pt-6">
            {features.map(({ icon: Icon, tone, label }) => (
              <li key={label} className="flex flex-col items-center gap-2 text-center">
                <AppIcon tone={tone} size={32}>
                  <Icon filled />
                </AppIcon>
                <span className="text-[12px] font-medium text-fg-2">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-1 px-6 pb-5 text-center text-[12px] text-fg-3">
        <p className="max-w-[52ch]">{l.terms}</p>
        {desktop && <p className="font-mono text-[11px] text-fg-3/80">ARRR Studio Converter v{desktop.version}</p>}
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { AppleMac, ArrowRight, Check, Windows } from "iconoir-react";
import Url from "@/Url/Url";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";
import { buttonClass } from "@/components/ui/Button";

const wrap = "mx-auto max-w-[var(--wrap)] px-4 sm:px-8";

/** Ajakan download app desktop (Windows & macOS) — disembunyikan saat dibuka dari app desktop itu sendiri */
export default function DesktopSection() {
  const { t, f } = useT();
  const d = t.desktop;
  const hydrated = useHydrated();
  if (hydrated && getDesktop()) return null;

  const isMac = hydrated && /mac/i.test(navigator.userAgent) && !/iphone|ipad/i.test(navigator.userAgent);
  const platforms = [
    { id: "windows", name: d.windows, req: d.windowsReq, href: Url.desktopWindows, Icon: Windows },
    { id: "mac", name: d.mac, req: d.macReq, href: Url.desktopMac, Icon: AppleMac },
  ];
  const ordered = isMac ? [...platforms].reverse() : platforms;

  return (
    <section className="border-t border-line/60 bg-surface/70">
      <div className={cn(wrap, "grid items-center gap-14 py-24 sm:py-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]")}>
        <div className="reveal">
          <p className="eyebrow">{d.eyebrow}</p>
          <h2 className="mt-5 max-w-2xl font-display text-[clamp(32px,4.4vw,60px)] font-bold leading-[1] tracking-[-0.035em] [text-wrap:balance]">
            {d.title}
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-fg-2">{d.sub}</p>
          <ul className="mt-8 flex flex-col gap-3">
            {d.features.slice(0, 3).map(([title]) => (
              <li key={title} className="flex items-center gap-3 text-[15px] font-medium">
                <span className="grid size-6 place-items-center rounded-full bg-fg/[0.08]">
                  <Check width={14} height={14} />
                </span>
                {title}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {ordered.map(({ id, name, href, Icon }, i) => (
              <a key={id} href={href} className={buttonClass(i === 0 ? "primary" : "ghost", "lg")}>
                <Icon width={20} height={20} /> {f(d.download, { os: name })}
              </a>
            ))}
          </div>
          <Link href="/download" className="link-line mt-6 inline-flex items-center gap-1.5 text-[14px] text-fg-2 hover:text-fg">
            {d.landingMore} <ArrowRight width={14} height={14} />
          </Link>
        </div>

        <div className="reveal relative isolate flex flex-col items-center justify-center overflow-hidden rounded-xl border border-[var(--hairline)] px-6 py-16 [--d:120ms]">
          <div aria-hidden="true" className="forged absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(70%_70%_at_50%_45%,#000,transparent)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/arrr-desktop-icon.webp" alt="" width={176} height={176} loading="lazy" className="size-44 drop-shadow-[0_20px_44px_rgba(0,0,0,0.5)]" />
          <p className="mt-6 font-display text-[19px] font-bold tracking-[-0.02em]">ARRR Studio Converter</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {platforms.map(({ id, name, req, Icon }) => (
              <span key={id} className="inline-flex h-8 items-center gap-2 rounded-full bg-fg/[0.07] px-3 text-[12.5px] font-medium text-fg-2" title={req}>
                <Icon width={14} height={14} /> {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { AppleMac, ArrowUpRight, Download, Folder, InfoCircle, Windows } from "iconoir-react";
import Url from "@/Url/Url";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";
import PageHeader from "@/components/shared/PageHeader";
import CardBox from "@/components/shared/CardBox";
import Badge from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import Button from "@/components/ui/Button";

type Os = "windows" | "mac" | "other";

function detectOs(): Os {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const p = `${nav.userAgentData?.platform ?? ""} ${navigator.userAgent}`.toLowerCase();
  if (/iphone|ipad|android/.test(p)) return "other";
  if (p.includes("win")) return "windows";
  if (p.includes("mac")) return "mac";
  return "other";
}

export default function DownloadScreen() {
  const { t, f } = useT();
  const d = t.desktop;
  const hydrated = useHydrated();
  const os: Os | null = hydrated ? detectOs() : null;
  const desktop = hydrated ? getDesktop() : undefined;

  const platforms = [
    { id: "windows" as const, name: d.windows, req: d.windowsReq, file: d.windowsFile, href: Url.desktopWindows, Icon: Windows },
    { id: "mac" as const, name: d.mac, req: d.macReq, file: d.macFile, href: Url.desktopMac, Icon: AppleMac },
  ];
  // Perangkat terdeteksi tampil duluan
  const ordered = os === "mac" ? [...platforms].reverse() : platforms;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow={d.eyebrow} title={d.title} sub={d.sub} />

      {desktop && (
        <CardBox className="rise flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <p className="flex items-center gap-2.5 text-[15px] font-medium">
            <InfoCircle width={18} height={18} className="text-fg-2" /> {f(d.inApp, { v: desktop.version })}
          </p>
          <Button size="sm" variant="tonal" icon={<Folder width={16} height={16} />} onClick={() => void desktop.openDownloadsFolder()}>
            {d.openFolder}
          </Button>
        </CardBox>
      )}

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <CardBox className="rise relative isolate flex flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
          <div aria-hidden="true" className="forged absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(70%_70%_at_50%_40%,#000,transparent)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/arrr-desktop-icon.webp" alt="" width={160} height={160} className="size-40 drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]" />
          <p className="mt-6 font-display text-[20px] font-bold tracking-[-0.02em]">ARRR Studio Converter</p>
          <p className="mt-1 text-[13.5px] text-fg-3">Windows · macOS</p>
        </CardBox>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {ordered.map(({ id, name, req, file, href, Icon }) => {
            const mine = os === id;
            return (
              <CardBox key={id} className={cn("rise flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center", mine && "border-line-2")}>
                <span className="grid size-14 shrink-0 place-items-center rounded-l bg-fg/[0.07]">
                  <Icon width={28} height={28} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[19px] font-bold tracking-[-0.02em]">{name}</p>
                    {mine && <Badge tone="ok">{d.detected}</Badge>}
                  </div>
                  <p className="mt-1 text-[14px] text-fg-2">{req}</p>
                  <p className="text-[13px] text-fg-3">{file}</p>
                </div>
                <a href={href} className={buttonClass(mine || os === "other" ? "primary" : "tonal", "md", "shrink-0")}>
                  <Download width={18} height={18} /> {f(d.download, { os: name })}
                </a>
              </CardBox>
            );
          })}
          <a href={Url.desktopReleases} target="_blank" rel="noreferrer" className="link-line inline-flex items-center gap-1 justify-self-start text-[14px] text-fg-2 hover:text-fg sm:col-span-2 lg:col-span-1">
            {d.allReleases} <ArrowUpRight width={13} height={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      <section className="grid gap-px overflow-hidden rounded-l border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-2 xl:grid-cols-4">
        {d.features.map(([title, body], i) => (
          <div key={title} className="bg-surface p-5 sm:p-6">
            <p className="font-mono text-[12px] tabular-nums text-fg-3">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-3 text-[15px] font-semibold">{title}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{body}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: d.winNoteTitle, body: d.winNote, Icon: Windows },
          { title: d.macNoteTitle, body: d.macNote, Icon: AppleMac },
        ].map(({ title, body, Icon }) => (
          <CardBox key={title} className="flex gap-4 p-5">
            <Icon width={20} height={20} className="mt-0.5 shrink-0 text-fg-2" />
            <div>
              <p className="text-[15px] font-semibold">{title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{body}</p>
            </div>
          </CardBox>
        ))}
      </div>
    </div>
  );
}

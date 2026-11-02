import { Facebook, Instagram, Tiktok, X, Youtube } from "iconoir-react";
import type { SVGProps } from "react";
import { platformOf, type Platform } from "@/lib/schemas/source";
import { cn } from "@/lib/utils";

export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  soundcloud: "SoundCloud",
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
};

/** SoundCloud tidak ada di Iconoir → garis awan + batang, gaya stroke sama (1.5) */
function Soundcloud(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 17.5h8.25a3.25 3.25 0 0 0 .4-6.48A5 5 0 0 0 10 9.2v8.3Z" />
      <path d="M7.5 11v6.5M5 12.5v5M2.5 14.5v3" />
    </svg>
  );
}

export const PLATFORM_ICONS: Record<Platform, (p: SVGProps<SVGSVGElement>) => React.ReactNode> = {
  youtube: Youtube,
  tiktok: Tiktok,
  soundcloud: Soundcloud,
  instagram: Instagram,
  x: X,
  facebook: Facebook,
};

/** Chip asal lagu (YouTube / TikTok / …) dari ID sumber; file dari perangkat → tidak dirender */
export default function PlatformChip({ videoId, className }: { videoId: string; className?: string }) {
  if (!videoId) return null;
  const p = platformOf(videoId);
  const Icon = PLATFORM_ICONS[p];
  return (
    <span
      className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-fg/[0.07] pl-1.5 pr-2 text-[11px] font-medium text-fg-2", className)}
      title={PLATFORM_NAMES[p]}
    >
      <Icon width={12} height={12} aria-hidden="true" />
      {PLATFORM_NAMES[p]}
    </span>
  );
}

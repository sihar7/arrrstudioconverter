// Kelas tombol — modul netral (bisa dipakai Server & Client Component)
import { cn } from "@/lib/utils";

export type Variant = "primary" | "tonal" | "ghost" | "subtle" | "danger" | "inverse";
export type Size = "sm" | "md" | "lg";

// Gaya referensi (agensi AI gelap, biru → silver): kapsul, label IBM Plex Mono, primer = kilau silver + pendar.
// App desktop (desk:): kontrol app pro — persegi membulat 8px, lebih rapat, teks sans 13px.
// primary = kilau silver · tonal = isi abu · ghost = abu tipis · subtle = teks · danger = merah tonal · inverse
const base =
  "state-layer ios-press relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent font-mono font-medium tracking-[-0.02em] disabled:pointer-events-none disabled:opacity-40 cursor-pointer [&_svg]:transition-transform [&_svg:last-child]:duration-300 hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5 desk:rounded-[8px] desk:font-sans desk:font-semibold desk:tracking-[-0.005em]";

const variants: Record<Variant, string> = {
  primary: "bg-accent bg-[image:var(--sheen)] text-on-accent shadow-[var(--glow)] hover:shadow-[var(--glow-strong)] desk:bg-none desk:shadow-none desk:hover:bg-accent-strong",
  tonal: "bg-fg/[0.12] text-fg hover:bg-fg/[0.17]",
  inverse: "bg-fg text-bg hover:bg-accent-strong",
  ghost: "bg-fg/[0.07] text-fg hover:bg-fg/[0.12]",
  subtle: "bg-transparent text-fg-2 hover:text-fg",
  danger: "bg-err/[0.13] text-err hover:bg-err/[0.2]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13.5px] [&_svg]:size-4 desk:h-8 desk:gap-1.5 desk:px-3 desk:text-[12.5px] desk:[&_svg]:size-[15px]",
  md: "h-11 px-5 text-[15px] [&_svg]:size-[18px] desk:h-9 desk:px-4 desk:text-[13px] desk:[&_svg]:size-4",
  lg: "h-[52px] px-7 text-[16px] [&_svg]:size-5 desk:h-11 desk:px-6 desk:text-[14px] desk:[&_svg]:size-[18px]",
};

export function buttonClass(variant: Variant = "ghost", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

// Kelas tombol — modul netral (bisa dipakai Server & Client Component)
import { cn } from "@/lib/utils";

export type Variant = "primary" | "tonal" | "ghost" | "subtle" | "danger" | "inverse";
export type Size = "sm" | "md" | "lg";

// Gaya iOS: kapsul, teks kalimat biasa (bukan kapital), isi tonal alih-alih garis tepi.
// primary = isi aksen · tonal = isi abu sistem · ghost = abu tipis · subtle = teks · danger = merah tonal · inverse
const base =
  "state-layer ios-press relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent font-semibold tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-40 cursor-pointer [&_svg]:transition-transform [&_svg:last-child]:duration-300 hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong",
  tonal: "bg-fg/[0.12] text-fg hover:bg-fg/[0.17]",
  inverse: "bg-fg text-bg hover:bg-accent-strong",
  ghost: "bg-fg/[0.07] text-fg hover:bg-fg/[0.12]",
  subtle: "bg-transparent text-fg-2 hover:text-fg",
  danger: "bg-err/[0.13] text-err hover:bg-err/[0.2]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13.5px] [&_svg]:size-4",
  md: "h-11 px-5 text-[15px] [&_svg]:size-[18px]",
  lg: "h-[52px] px-7 text-[16px] [&_svg]:size-5",
};

export function buttonClass(variant: Variant = "ghost", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

// Kelas tombol — modul netral (bisa dipakai Server & Client Component)
import { cn } from "@/lib/utils";

export type Variant = "primary" | "tonal" | "ghost" | "subtle" | "danger" | "inverse";
export type Size = "sm" | "md" | "lg";

// Gaya editorial otomotif: persegi bertepi tajam, label kapital ber-tracking lebar.
// primary = pelat logam terpoles (.btn-plate) · tonal · ghost (garis) · subtle (teks) · danger · inverse
const base =
  "state-layer relative inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-s border font-semibold uppercase tracking-[0.14em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 cursor-pointer [&_svg]:transition-transform [&_svg:last-child]:duration-300 hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5";

const variants: Record<Variant, string> = {
  primary: "btn-plate border-transparent bg-accent text-on-accent hover:bg-accent-strong",
  tonal: "border-transparent bg-tonal text-on-tonal hover:bg-hover",
  inverse: "border-transparent bg-fg text-bg hover:bg-accent-strong",
  ghost: "border-line-2 bg-transparent text-fg hover:border-fg",
  subtle: "border-transparent bg-transparent text-fg-2 hover:text-fg",
  danger: "border-line-2 bg-transparent text-err hover:border-err",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-[11.5px] [&_svg]:size-4",
  md: "h-11 px-5 text-[12px] [&_svg]:size-[17px]",
  lg: "h-14 px-8 text-[12.5px] [&_svg]:size-[18px]",
};

export function buttonClass(variant: Variant = "ghost", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type IosTone = "red" | "orange" | "yellow" | "green" | "teal" | "blue" | "indigo" | "purple" | "pink" | "gray";

/**
 * Ubin ikon ala iOS (Settings / menu): squircle warna sistem + glyph putih + kilap kaca tipis.
 * Warna dari token --ios-* (beda nilai gelap/terang seperti iOS asli). Lihat .app-icon di components.css.
 */
export default function AppIcon({
  tone,
  size = 40,
  className,
  children,
}: {
  tone: IosTone;
  size?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("app-icon", className)}
      style={{ "--tone": `var(--ios-${tone})`, "--size": `${size}px` } as CSSProperties}
    >
      {children}
    </span>
  );
}

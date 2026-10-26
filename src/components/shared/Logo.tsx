import Link from "next/link";
import { withBase } from "@/Url/Url";
import { cn } from "@/lib/utils";

/**
 * Logo resmi ARRR Studio (jangan diwarnai ulang / diubah proporsinya).
 * <img> biasa (bukan next/image): file sudah webp kecil & unoptimized, dan next/image di server component
 * memecah satu chunk JS tambahan di setiap halaman.
 */
export function LogoMark({ size = 28, className, priority }: { size?: 28 | 40 | 72 | 96; className?: string; priority?: boolean }) {
  const src = withBase(size <= 40 ? "/brand/arrr-logo-96.webp" : size <= 72 ? "/brand/arrr-logo-192.webp" : "/brand/arrr-logo-384.webp");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={Math.round(size * 1.023)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export default function Logo({ href = "/", compactBelow = "sm" }: { href?: string; compactBelow?: "sm" | "none" }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-3 text-fg" aria-label="ARRR Studio Converter">
      <LogoMark priority />
      <span
        className={cn(
          "whitespace-nowrap text-[12px] font-bold tracking-[0.24em]",
          compactBelow === "sm" && "max-[479px]:hidden",
        )}
      >
        ARRR STUDIO <span className="font-medium text-fg-3">CONVERTER</span>
      </span>
    </Link>
  );
}

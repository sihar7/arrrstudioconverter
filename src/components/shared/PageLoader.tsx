import { cn } from "@/lib/utils";
import { LogoMark } from "./Logo";

/**
 * Lazy loader ber-logo ARRR: logo bernapas + kilau menyapu + bar indeterminate.
 * full = memenuhi area halaman (loading.tsx); inline = blok kecil (fallback dynamic import).
 */
export default function PageLoader({ variant = "full", label = "Loading" }: { variant?: "full" | "inline"; label?: string }) {
  const full = variant === "full";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-6", full ? "min-h-[60dvh] py-20" : "py-10")}
    >
      <div className="arrr-loader relative">
        <LogoMark size={full ? 72 : 40} priority />
        <span aria-hidden="true" className="arrr-loader-shine" />
      </div>
      <div className={cn("h-[2px] overflow-hidden bg-line-2 indeterminate", full ? "w-40" : "w-24")} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

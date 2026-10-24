import Link from "next/link";
import { LogoMark } from "@/components/shared/Logo";
import { buttonClass } from "@/components/ui/buttonStyles";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="forged absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_45%,transparent,color-mix(in_srgb,var(--bg)_90%,transparent)_80%)]" />
        <div className="forged-spot absolute inset-0" />
      </div>
      <div className="forged-tile grid size-20 place-items-center rounded-l">
        <LogoMark size={40} />
      </div>
      <p className="eyebrow mt-12">Error 404</p>
      <h1 className="mt-5 font-display text-[clamp(40px,7vw,80px)] font-bold leading-none tracking-[-0.045em]">Halaman tidak ditemukan.</h1>
      <p className="mt-5 text-[15px] text-fg-2">Page not found.</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-12")}>
        ARRR Studio Converter
      </Link>
    </main>
  );
}

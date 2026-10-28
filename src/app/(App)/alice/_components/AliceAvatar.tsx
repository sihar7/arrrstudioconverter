"use client";

import { cn } from "@/lib/utils";
import { useAlice } from "../_lib/store";

/** Foto profil Alice (dipilih di Pengaturan, disimpan di perangkat); belum ada → inisial "A" */
export default function AliceAvatar({ size = 32, className, live = false }: { size?: number; className?: string; live?: boolean }) {
  const avatar = useAlice((s) => s.avatar);
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-fg/[0.1] font-semibold text-fg ring-1 ring-[var(--hairline)]",
        className,
      )}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        <span style={{ fontSize: size * 0.42 }}>A</span>
      )}
      {/* Sedang membalas: cincin tipis berdenyut */}
      {live && <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-accent/60" />}
    </span>
  );
}

import type { ReactNode } from "react";

/** Tombol keyboard kecil untuk petunjuk pintasan */
export default function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-2 border-b-2 bg-raised px-1 font-mono text-[10.5px] font-medium leading-none text-fg-2">
      {children}
    </kbd>
  );
}

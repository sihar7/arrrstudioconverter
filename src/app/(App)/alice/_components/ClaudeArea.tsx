"use client";

import { useRef } from "react";
import Spinner from "@/components/ui/Spinner";
import { useClaudeView } from "../_lib/claudeView";

/**
 * Area kerja mode Alice saat memakai Claude.ai (langganan): kotak tetap di antara sidebar, toolbar & transport bar.
 * Claude.ai digambar app desktop tepat di atas kotak ini; isi kotak hanya terlihat sebelum view siap / saat dibekukan.
 */
export default function ClaudeArea() {
  const area = useRef<HTMLDivElement>(null);
  const frozen = useClaudeView(area);
  return (
    <div ref={area} className="fixed bottom-[var(--dock-h)] left-[var(--side-w)] right-0 top-[var(--bar-h)] z-20 grid place-items-center bg-bg">
      {frozen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={frozen} alt="" className="absolute inset-0 size-full object-cover object-left-top" />
      ) : (
        <Spinner className="size-6 text-fg-3" />
      )}
    </div>
  );
}

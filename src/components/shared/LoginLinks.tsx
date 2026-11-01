"use client";

import { Discord } from "iconoir-react";
import { withBase } from "@/Url/Url";
import { buttonClass } from "@/components/ui/Button";
import GoogleG from "@/components/icons/GoogleG";
import { useMeQuery } from "@/store/api/baseApi";
import { useHydrated } from "@/hooks/useHydrated";
import { useT } from "@/hooks/useT";
import { getDesktop } from "@/type/desktop";

/**
 * Tombol masuk untuk gate/empty state: Discord (utama) + Google bila aktif di server.
 * Google disembunyikan di app desktop — Google menolak login OAuth di dalam webview Electron.
 */
export default function LoginLinks({ next, label }: { next: string; label?: string }) {
  const { t } = useT();
  const { data: me } = useMeQuery();
  const desktop = useHydrated() && Boolean(getDesktop());
  const q = `next=${encodeURIComponent(next)}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={withBase(`/api/auth/discord?${q}`)} className={buttonClass("primary")}>
        <Discord width={18} height={18} /> {label ?? t.login.discord}
      </a>
      {me?.auth.googleEnabled && !desktop && (
        <a href={withBase(`/api/auth/google?${q}`)} className={buttonClass("subtle")}>
          <GoogleG size={17} /> {t.login.google}
        </a>
      )}
    </div>
  );
}

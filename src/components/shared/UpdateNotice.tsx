"use client";

import { useState } from "react";
import { Download, RefreshDouble, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissUpdateNotice } from "@/store/slices/toastSlice";
import Button from "@/components/ui/Button";
import Progress from "@/components/ui/Progress";
import { useT } from "@/hooks/useT";
import { getDesktop } from "@/type/desktop";

const speedOf = (bps: number) => (bps >= 1024 * 1024 ? `${(bps / 1024 / 1024).toFixed(1)} MB/s` : `${Math.max(1, Math.round(bps / 1024))} KB/s`);

/**
 * Kartu pembaruan di deck toast — tetap tampil sampai dipilih (tidak tutup otomatis).
 * Web: deploy baru → "Muat ulang" (diberi peringatan bila ada konversi berjalan).
 * Desktop: progres unduhan update app → "Restart sekarang" / macOS → "Unduh".
 */
export default function UpdateNotice() {
  const dispatch = useAppDispatch();
  const { t, f } = useT();
  const u = t.update;
  const notice = useAppSelector((s) => s.toast.update);
  const busy = useAppSelector((s) => s.converter.items.some((i) => i.status === "downloading" || i.status === "processing" || i.status === "queued"));
  const [acting, setActing] = useState(false);
  if (!notice) return null;

  const close = () => dispatch(dismissUpdateNotice());
  const phase = notice.kind === "web" ? "web" : notice.phase;
  const v = notice.kind === "desktop" ? notice.version : "";

  const title =
    phase === "web" ? u.webTitle : phase === "downloading" ? f(u.dlTitle, { v }) : phase === "ready" ? f(u.readyTitle, { v }) : f(u.manualTitle, { v });
  const sub =
    phase === "web"
      ? busy
        ? u.webBusy
        : u.webSub
      : phase === "downloading" && notice.kind === "desktop"
        ? notice.bps > 0
          ? f(u.dlSub, { p: Math.round(notice.percent), speed: speedOf(notice.bps) })
          : f(u.dlSubNoSpeed, { p: Math.round(notice.percent) })
        : phase === "ready"
          ? u.readySub
          : u.manualSub;

  const act = async () => {
    setActing(true);
    const desktop = getDesktop();
    if (phase === "web") window.location.reload();
    else if (phase === "ready") await desktop?.installUpdate?.();
    else if (phase === "manual") {
      await desktop?.openUpdatePage?.();
      close();
    }
    setActing(false);
  };

  return (
    <div
      role="status"
      className="relative w-full overflow-hidden rounded-[14px] border border-line/60 bg-raised/95 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.5),inset_0_0.5px_0_rgb(255_255_255/0.06)] backdrop-blur-xl light:bg-white/95 light:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.22),0_0_0_0.5px_rgb(0_0_0/0.06)]"
    >
      <div className="flex items-start gap-3 py-3 pl-3 pr-12">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
          {phase === "downloading" || phase === "manual" ? (
            <Download width={19} height={19} strokeWidth={1.9} className={phase === "downloading" ? "update-bob" : undefined} />
          ) : (
            <RefreshDouble width={19} height={19} strokeWidth={1.9} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug">{title}</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-fg-3 tabular-nums">{sub}</p>
          {phase === "downloading" && notice.kind === "desktop" && <Progress value={notice.percent} label={title} className="mt-2.5" />}
          {phase !== "downloading" && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant={phase === "web" && busy ? "tonal" : "primary"}
                loading={acting}
                icon={phase === "manual" ? <Download /> : <RefreshDouble />}
                onClick={act}
              >
                {phase === "web" ? u.reload : phase === "ready" ? u.restart : u.download}
              </Button>
              <Button size="sm" variant="subtle" onClick={close}>
                {u.later}
              </Button>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label={t.common.close}
        onClick={close}
        className="absolute right-1 top-1 grid size-11 cursor-pointer place-items-center rounded-full text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
      >
        <Xmark width={16} height={16} />
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle, Home, InfoCircle, NavArrowLeft, NavArrowRight, Plus, Refresh, WarningTriangle, Xmark } from "iconoir-react";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop, type DesktopYoutube } from "@/type/desktop";
import { SfPlayRect } from "@/components/icons/SfIcons";
import AppIcon from "@/components/ui/AppIcon";
import Button, { buttonClass } from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { useQuickAdd } from "../_hooks/useQuickAdd";
import { useYoutubeView } from "../_hooks/useYoutubeView";

/**
 * YouTube asli di dalam app desktop: toolbar web (navigasi YouTube · judul · antrean · tambah) di atas
 * area tempat Electron menggambar view YouTube native. Di browser biasa / app lama → ajakan pakai app desktop.
 */
export default function YoutubeScreen() {
  const hydrated = useHydrated();
  const yt = hydrated ? getDesktop()?.youtube : undefined;
  if (!hydrated) return null;
  return yt ? <YoutubeBrowser yt={yt} /> : <OnlyDesktop />;
}

function OnlyDesktop() {
  const { t } = useT();
  return (
    <EmptyState
      icon={
        <AppIcon tone="red" size={40}>
          <SfPlayRect filled />
        </AppIcon>
      }
      title={t.desktop.ytOnlyTitle}
      sub={t.desktop.ytOnlySub}
      action={
        <Link href="/download" className={buttonClass("primary")}>
          {t.nav.downloadApp}
        </Link>
      }
    />
  );
}

function YoutubeBrowser({ yt }: { yt: DesktopYoutube }) {
  const { t, f } = useT();
  const area = useRef<HTMLDivElement>(null);
  const { state, frozen } = useYoutubeView(yt, area);
  const { add, busy } = useQuickAdd();
  const queued = useAppSelector((s) => s.converter.items.filter((i) => i.status !== "done" && i.status !== "error").length);
  // Toast global disembunyikan di halaman ini (tertutup view native) → yang terbaru tampil di toolbar
  const toast = useAppSelector((s) => s.toast.items.at(-1));

  // Klik kanan "Tambah ke antrean Converter" di dalam YouTube
  useEffect(() => yt.onAdd(({ url }) => add(url)), [yt, add]);

  const navBtn =
    "grid size-9 shrink-0 cursor-pointer place-items-center rounded-s text-fg-2 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-35";
  const ToastIcon = toast?.kind === "ok" ? CheckCircle : toast?.kind === "err" ? WarningTriangle : InfoCircle;

  return (
    <div className="fixed inset-x-0 bottom-[var(--dock-h)] top-[var(--bar-h)] z-30 flex flex-col bg-bg">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line/60 px-3">
        <button type="button" className={navBtn} disabled={!state?.canGoBack} onClick={() => yt.nav("back")} aria-label={t.desktop.back} title={t.desktop.back}>
          <NavArrowLeft width={18} height={18} strokeWidth={2} />
        </button>
        <button type="button" className={navBtn} disabled={!state?.canGoForward} onClick={() => yt.nav("forward")} aria-label={t.desktop.forward} title={t.desktop.forward}>
          <NavArrowRight width={18} height={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={navBtn}
          onClick={() => yt.nav(state?.loading ? "stop" : "reload")}
          aria-label={state?.loading ? t.desktop.ytStop : t.desktop.ytReload}
          title={state?.loading ? t.desktop.ytStop : t.desktop.ytReload}
        >
          {state?.loading ? <Xmark width={18} height={18} strokeWidth={2} /> : <Refresh width={17} height={17} strokeWidth={2} />}
        </button>
        <button type="button" className={navBtn} onClick={() => yt.nav("home")} aria-label={t.desktop.ytHome} title={t.desktop.ytHome}>
          <Home width={17} height={17} strokeWidth={2} />
        </button>

        <div className="mx-2 min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">{state?.title || "YouTube"}</p>
          <p className="truncate text-[11.5px] text-fg-3">{state?.video ? state.url : t.desktop.ytPickVideo}</p>
        </div>

        {/* Notifikasi terbaru (pengganti toast pojok yang tertutup view YouTube) */}
        {toast && (
          <span
            key={toast.id}
            role="status"
            className="rise hidden max-w-[320px] items-center gap-2 rounded-full bg-raised px-3 py-1.5 text-[12.5px] text-fg-2 lg:flex"
          >
            <ToastIcon
              width={15}
              height={15}
              className={cn("shrink-0", toast.kind === "ok" ? "text-ok" : toast.kind === "err" ? "text-err" : "text-fg-3")}
              aria-hidden="true"
            />
            <span className="truncate">{toast.message}</span>
          </span>
        )}

        {queued > 0 && (
          <Link href="/converter" className="shrink-0 rounded-full bg-fg/[0.07] px-3 py-1.5 text-[12.5px] font-semibold text-fg transition-colors hover:bg-fg/[0.12]">
            {f(t.desktop.ytQueue, { n: queued })}
          </Link>
        )}
        <Button
          variant="primary"
          size="sm"
          loading={busy}
          disabled={!state?.video}
          title={state?.video ? undefined : t.desktop.ytPickVideo}
          onClick={() => state?.video && add(state.video)}
        >
          <Plus width={16} height={16} strokeWidth={2.2} /> {t.desktop.ytAdd}
        </Button>
      </div>

      {/* Area view native — cuplikan gambar tampil saat view disembunyikan sementara (popover web terbuka) */}
      <div ref={area} className="relative flex-1 overflow-hidden bg-bg">
        <div className="absolute inset-0 grid place-items-center text-fg-3">
          <Spinner />
        </div>
        {frozen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frozen} alt="" className="absolute inset-0 size-full object-cover" />
        )}
      </div>
    </div>
  );
}

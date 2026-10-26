"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Cart, Check, MediaImage, Xmark } from "iconoir-react";
import Switch from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import type { AdminEvent } from "@/type/billing";
import type { LinkState } from "../_hooks/useAdminEvents";
import { ago } from "./parts";

const STATE: Record<LinkState, { label: string; dot: string }> = {
  live: { label: "Realtime aktif", dot: "bg-ok" },
  connecting: { label: "Menyambung…", dot: "bg-warn animate-pulse" },
  offline: { label: "Terputus — mencoba lagi", dot: "bg-err" },
};

const ICON: Partial<Record<AdminEvent["type"], typeof Cart>> = {
  "order.created": Cart,
  "order.confirming": Check,
  "order.proof": MediaImage,
  "order.cancelled": Xmark,
  "order.rejected": Xmark,
  "order.paid": Check,
};

interface Props {
  state: LinkState;
  events: AdminEvent[];
  unread: number;
  sound: boolean;
  onSound: (v: boolean) => void;
  permission: NotificationPermission | "unsupported";
  onRequestDesktop: () => void;
  onOpen: () => void;
  onOpenOrder: () => void;
  onClear: () => void;
}

/** Pusat notifikasi admin: status realtime · suara · notifikasi desktop · event terbaru */
export default function NotificationBell({ state, events, unread, sound, onSound, permission, onRequestDesktop, onOpen, onOpenOrder, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const st = STATE[state];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifikasi, ${unread} baru` : "Notifikasi"}
        onClick={() => {
          setOpen((v) => !v);
          onOpen();
        }}
        className={cn("state-layer relative flex size-11 cursor-pointer items-center justify-center rounded-s text-fg-2 transition-colors hover:bg-hover/60 hover:text-fg", open && "bg-raised text-fg")}
      >
        <Bell width={20} height={20} aria-hidden="true" />
        <span aria-hidden="true" className={cn("absolute bottom-2 right-2 size-1.5 rounded-full", st.dot)} />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-1 top-1 min-w-4 rounded-full bg-warn px-1 text-center font-mono text-[10px] font-semibold leading-4 text-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <div
        role="dialog"
        aria-label="Notifikasi"
        className={cn(
          "mat absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-32px))] rounded-l border border-line/70 bg-raised shadow-[var(--elev-3)] transition-[opacity,transform] duration-200 ease-[var(--ease)]",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
          <p className="font-display text-[15px] font-semibold">Notifikasi</p>
          <span className="flex items-center gap-2 text-[12px] text-fg-3">
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", st.dot)} />
            {st.label}
          </span>
        </div>

        <div className="flex flex-col gap-3 border-b border-line/60 px-4 py-3">
          <Switch label="Suara notifikasi" checked={sound} onChange={onSound} />
          {permission === "default" && (
            <button
              type="button"
              onClick={onRequestDesktop}
              className="state-layer min-h-10 cursor-pointer rounded-s border border-dashed border-line-2 px-3 text-left text-[13px] font-semibold text-fg transition-colors hover:border-fg-3"
            >
              Aktifkan notifikasi desktop
              <span className="block text-[12px] font-normal text-fg-3">Tetap muncul walau tab admin tidak sedang dibuka</span>
            </button>
          )}
          {permission === "denied" && <p className="text-[12px] text-fg-3">Notifikasi desktop diblokir browser — izinkan lewat ikon gembok di address bar.</p>}
        </div>

        <ul className="thin-scroll max-h-80 overflow-y-auto">
          {events.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-fg-3">Belum ada notifikasi sejak panel dibuka.</li>}
          {events.map((e) => {
            const Ico = ICON[e.type] ?? Cart;
            return (
              <li key={`${e.at}-${e.orderId}-${e.type}`}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenOrder();
                    setOpen(false);
                  }}
                  className="state-layer flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors hover:bg-hover/60"
                >
                  <span aria-hidden="true" className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-s bg-surface text-fg-2">
                    <Ico width={15} height={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-fg">{e.title}</span>
                    <span className="block truncate text-[12.5px] text-fg-2">{e.body}</span>
                    <span className="block text-[11.5px] text-fg-3">
                      {e.orderId} · {ago(e.at)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {events.length > 0 && (
          <div className="border-t border-line/60 px-4 py-2 text-right">
            <button type="button" onClick={onClear} className="caps min-h-9 cursor-pointer text-[10.5px] text-fg-3 hover:text-fg">
              Bersihkan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

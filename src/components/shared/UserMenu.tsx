"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, NavArrowDown, ShieldCheck } from "iconoir-react";
import { SfClock, SfCrown, SfGear, SfLock } from "@/components/icons/SfIcons";
import AppIcon from "@/components/ui/AppIcon";
import { useLogoutMutation, useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import { ButtonLink } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { cn, formatDate } from "@/lib/utils";

export function Avatar({ src, name, size = 30 }: { src: string | null; name: string; size?: number }) {
  return src ? (
    <Image src={src} alt="" width={size} height={size} unoptimized className="rounded-full object-cover" />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full border border-line-2 bg-raised font-display text-[12px] font-bold text-fg"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Teks token: label pendek, tooltip lengkap, dan kapan terisi lagi (null = belum dipakai periode ini) */
export function useQuotaText() {
  const { data } = useMeQuery();
  const { t, f } = useT();
  if (!data || data.quota.limit == null) return null;
  const { remaining, limit, resetIn, windowHours, minutesPerToken } = data.quota;
  const left = remaining ?? 0;
  const [short, long] = data.user ? [t.quota.tokens, t.quota.tokensLong] : [t.quota.guest, t.quota.guestLong];
  const vars = { left, max: limit, min: minutesPerToken, hours: windowHours };
  const mins = resetIn ? Math.max(1, Math.ceil(resetIn / 60)) : 0;
  const time = mins >= 60 ? f(t.quota.hm, { h: Math.floor(mins / 60), m: mins % 60 }) : f(t.quota.m, { m: mins });
  const reset = resetIn ? f(t.quota.resetIn, { time }) : null;
  return { left, limit, low: left <= 1, short: f(short, vars), long: [f(long, vars), reset].filter(Boolean).join(" · "), reset };
}

/** Sisa token: guest (x/3 gratis) atau user login (x/5 token); admin tanpa batas → disembunyikan */
export function QuotaPill() {
  const q = useQuotaText();
  if (!q) return null;
  return (
    <span
      title={q.long}
      className={cn(
        "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold",
        q.low ? "bg-warn/12 text-warn" : "bg-tonal text-on-tonal",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {q.short}
    </span>
  );
}

/** placement "up" + full = baris akun di dasar sidebar app desktop (menu membuka ke atas) */
export default function UserMenu({ placement = "down", full = false }: { placement?: "down" | "up"; full?: boolean } = {}) {
  const { data, isLoading } = useMeQuery();
  const [logout] = useLogoutMutation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t, f, lang } = useT();

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

  if (isLoading) return <Skeleton className={cn("h-10 rounded-full", full ? "w-full" : "w-20")} />;
  if (!data?.user) {
    return (
      <ButtonLink href="/login" variant="ghost" size="sm" className={cn(full && "w-full")}>
        {t.nav.login}
      </ButtonLink>
    );
  }

  const u = data.user;
  const plan = data.plan ?? { id: "free" as const, expiresAt: null };
  const item = "state-layer flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-s px-2.5 py-2 text-[14px] text-fg-2 transition-colors hover:bg-hover hover:text-fg";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "state-layer flex h-10 cursor-pointer items-center gap-2 rounded-s pl-1 pr-2.5 transition-colors",
          full && "h-11 w-full gap-2.5 rounded-[10px] pl-1.5 text-left",
          !full && placement === "up" && "mx-auto pr-1",
          open && "bg-raised",
        )}
      >
        <Avatar src={u.avatarUrl} name={u.displayName} size={32} />
        {full ? (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold">{u.displayName}</span>
            <span className="block truncate text-[11.5px] text-fg-3">{t.plan.names[(data.plan ?? { id: "free" as const }).id]}</span>
          </span>
        ) : placement === "down" ? (
          <span className="hidden max-w-[120px] truncate text-[13px] font-semibold xl:block">{u.displayName}</span>
        ) : null}
        {(full || placement === "down") && (
          <NavArrowDown width={14} height={14} className={cn("shrink-0 text-fg-3 transition-transform", (placement === "up") !== open && "rotate-180")} />
        )}
      </button>
      <div
        role="menu"
        data-open={open}
        style={{ "--origin": placement === "up" ? "bottom left" : "top right" } as CSSProperties}
        className={cn(
          "ios-pop mat absolute z-[60] w-64 rounded-l border border-line/70 bg-raised p-1.5 shadow-[var(--elev-3)]",
          placement === "up" ? "bottom-[calc(100%+8px)] left-0" : "right-0 top-[calc(100%+10px)]",
        )}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar src={u.avatarUrl} name={u.displayName} size={36} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{u.displayName}</p>
            <p className="truncate text-[12px] text-fg-3">@{u.username}</p>
          </div>
        </div>
        <Link
          role="menuitem"
          href="/pricing"
          onClick={() => setOpen(false)}
          className="state-layer mx-1.5 mb-1 flex min-h-11 items-center justify-between gap-3 rounded-s bg-surface px-3 py-2 transition-colors hover:bg-hover"
        >
          <span className="min-w-0">
            <span className="caps block text-[10px] text-fg">{f(t.plan.badge, { plan: t.plan.names[plan.id] })}</span>
            <span className="block truncate text-[12px] text-fg-3">
              {plan.id === "free" ? t.plan.taglines.free : plan.expiresAt ? f(t.plan.until, { date: formatDate(plan.expiresAt, lang) }) : t.plan.permanent}
            </span>
          </span>
          {plan.id === "free" ? (
            <span className="caps shrink-0 rounded-xs bg-accent px-2 py-1 text-[10px] text-on-accent">{t.plan.upgrade}</span>
          ) : (
            <AppIcon tone="orange" size={28}>
              <SfCrown filled />
            </AppIcon>
          )}
        </Link>
        <div className="my-1.5 h-px bg-line" />
        <Link role="menuitem" href="/history" className={item} onClick={() => setOpen(false)}>
          <AppIcon tone="blue" size={28}>
            <SfClock filled />
          </AppIcon>
          {t.nav.history}
        </Link>
        <Link role="menuitem" href="/settings" className={item} onClick={() => setOpen(false)}>
          <AppIcon tone="gray" size={28}>
            <SfGear filled />
          </AppIcon>
          {t.nav.settings}
        </Link>
        {u.isAdmin && (
          <>
            <div className="my-1.5 h-px bg-line" />
            <Link role="menuitem" href="/obfuscator" className={item} onClick={() => setOpen(false)}>
              <AppIcon tone="green" size={28}>
                <SfLock filled />
              </AppIcon>
              {t.nav.obfuscator}
            </Link>
            <Link role="menuitem" href="/admin" className={item} onClick={() => setOpen(false)}>
              <AppIcon tone="indigo" size={28}>
                <ShieldCheck width={16} height={16} strokeWidth={2} />
              </AppIcon>
              {t.nav.admin}
            </Link>
          </>
        )}
        <div className="my-1.5 h-px bg-line" />
        <button
          role="menuitem"
          type="button"
          className={cn(item, "text-err hover:text-err")}
          onClick={async () => {
            setOpen(false);
            await logout();
            router.push("/");
          }}
        >
          <AppIcon tone="red" size={28}>
            <LogOut strokeWidth={2} />
          </AppIcon>
          {t.nav.logout}
        </button>
      </div>
    </div>
  );
}

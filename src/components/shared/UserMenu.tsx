"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, NavArrowDown } from "iconoir-react";
import { SfClock, SfCrown, SfGear } from "@/components/icons/SfIcons";
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

/** Sisa kuota: guest (x/3 gratis) atau user login (x/5 hari ini); admin tanpa batas → disembunyikan */
export function QuotaPill() {
  const { data } = useMeQuery();
  const { t, f } = useT();
  if (!data || data.quota.limit == null) return null;
  const { remaining, limit } = data.quota;
  const low = (remaining ?? 0) <= 1;
  const [short, long] = data.user ? [t.quota.daily, t.quota.dailyLong] : [t.quota.guest, t.quota.guestLong];
  return (
    <span
      title={f(long, { left: remaining ?? 0, max: limit })}
      className={cn(
        "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold",
        low ? "bg-warn/12 text-warn" : "bg-tonal text-on-tonal",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {f(short, { left: remaining ?? 0, max: limit })}
    </span>
  );
}

export default function UserMenu() {
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

  if (isLoading) return <Skeleton className="h-10 w-20 rounded-full" />;
  if (!data?.user) {
    return (
      <ButtonLink href="/login" variant="ghost" size="sm">
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
          open && "bg-raised",
        )}
      >
        <Avatar src={u.avatarUrl} name={u.displayName} size={32} />
        <span className="hidden max-w-[120px] truncate text-[13px] font-semibold xl:block">{u.displayName}</span>
        <NavArrowDown width={14} height={14} className={cn("text-fg-3 transition-transform", open && "rotate-180")} />
      </button>
      <div
        role="menu"
        data-open={open}
        style={{ "--origin": "top right" } as CSSProperties}
        className="ios-pop mat absolute right-0 top-[calc(100%+10px)] z-[60] w-64 rounded-l border border-line/70 bg-raised p-1.5 shadow-[var(--elev-3)]"
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

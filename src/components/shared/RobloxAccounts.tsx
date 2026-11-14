"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, NavArrowDown, Plus, Settings } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addAccount, switchAccount, MAX_ACCOUNTS, type RobloxAccount } from "@/store/slices/robloxSlice";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

/** Label akun: nama profil Roblox → ID creator → "Akun baru" */
export function useAccountLabel() {
  const { t } = useT();
  return useCallback(
    (a: Pick<RobloxAccount, "name" | "creatorId">) => a.name || (a.creatorId ? `ID ${a.creatorId}` : t.settings.newAccount),
    [t],
  );
}

export function AccountAvatar({ acc, label, size = 28 }: { acc: RobloxAccount; label: string; size?: number }) {
  return acc.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={acc.avatarUrl} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full bg-raised object-cover" />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-raised font-display text-[12px] font-bold text-fg-2"
      aria-hidden="true"
    >
      {label.replace(/^ID /, "#").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Ganti akun aktif + toast konfirmasi */
export function useSwitchAccount() {
  const dispatch = useAppDispatch();
  const accounts = useAppSelector((s) => s.roblox.accounts);
  const toast = useToast();
  const { f, t } = useT();
  const label = useAccountLabel();
  return useCallback(
    (id: string) => {
      const acc = accounts.find((a) => a.id === id);
      if (!acc) return;
      dispatch(switchAccount(id));
      toast(f(t.settings.switchedTo, { name: label(acc) }), "ok");
    },
    [accounts, dispatch, toast, f, t, label],
  );
}

/**
 * Chip "akun yang dipakai" di halaman yang memakai API key (Spoof, Upload, Skybox, Converter, Riwayat, Audio saya).
 * Klik → daftar akun untuk ganti + Tambah akun / Kelola akun.
 */
export function AccountPicker({ className, align = "right" }: { className?: string; align?: "left" | "right" }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { accounts, activeAccountId, apiKey } = useAppSelector((s) => s.roblox);
  const { t } = useT();
  const s = t.settings;
  const label = useAccountLabel();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  const active = accounts.find((a) => a.id === activeAccountId);
  if (!active) return null;
  const name = label(active);
  const item =
    "state-layer flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-s px-2.5 py-2 text-[13.5px] text-fg-2 transition-colors hover:bg-hover hover:text-fg";

  return (
    <div ref={ref} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={`${s.usingAccount}: ${name}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "state-layer flex h-9 max-w-[220px] cursor-pointer items-center gap-2 rounded-full bg-raised py-1 pl-1 pr-2.5 text-[13px] transition-colors hover:bg-hover active:scale-[0.97]",
          open && "bg-hover",
        )}
      >
        <AccountAvatar acc={active} label={name} size={26} />
        <span className="min-w-0 truncate text-left leading-tight">
          <span className="sr-only">{s.usingAccount}: </span>
          <span className="font-semibold text-fg">{name}</span>
        </span>
        {!apiKey && <span className="size-1.5 shrink-0 rounded-full bg-warn" title={s.apiKeyPlaceholder} aria-label={s.apiKeyPlaceholder} />}
        <NavArrowDown width={14} height={14} className={cn("shrink-0 text-fg-3 transition-transform", open && "rotate-180")} />
      </button>
      <div
        id={menuId}
        role="menu"
        data-open={open}
        style={{ "--origin": align === "right" ? "top right" : "top left" } as CSSProperties}
        className={cn(
          "ios-pop mat absolute top-[calc(100%+8px)] z-[60] max-h-[min(420px,70dvh)] w-64 overflow-y-auto rounded-l border border-line/70 bg-raised p-1.5 shadow-[var(--elev-3)]",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        <p className="caps px-3 pb-1 pt-1.5 text-[10px] text-fg-3">{s.accounts}</p>
        <AccountMenuList itemClass={item} onPicked={() => setOpen(false)} />
        <div className="my-1.5 h-px bg-line" />
        {accounts.length < MAX_ACCOUNTS && (
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              dispatch(addAccount());
              router.push("/settings");
            }}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-dashed border-line-2">
              <Plus width={14} height={14} />
            </span>
            {s.addAccount}
          </button>
        )}
        <Link role="menuitem" href="/settings" className={item} onClick={() => setOpen(false)}>
          <span className="grid size-7 shrink-0 place-items-center">
            <Settings width={16} height={16} />
          </span>
          {s.manageAccounts}
        </Link>
      </div>
    </div>
  );
}

/** Daftar akun ringkas untuk menu profil (ganti akun dari halaman mana pun) */
export function AccountMenuList({ onPicked, itemClass }: { onPicked: () => void; itemClass: string }) {
  const { accounts, activeAccountId } = useAppSelector((s) => s.roblox);
  const label = useAccountLabel();
  const pick = useSwitchAccount();
  return (
    <>
      {accounts.map((a) => {
        const active = a.id === activeAccountId;
        const name = label(a);
        return (
          <button
            key={a.id}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            className={cn(itemClass, active && "text-fg")}
            onClick={() => {
              if (!active) pick(a.id);
              onPicked();
            }}
          >
            <AccountAvatar acc={a} label={name} />
            <span className="min-w-0 flex-1 truncate text-left">{name}</span>
            {active && <Check width={16} height={16} strokeWidth={2} className="shrink-0 text-accent" />}
          </button>
        );
      })}
    </>
  );
}

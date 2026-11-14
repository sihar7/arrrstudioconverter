"use client";

import { useCallback } from "react";
import { Check } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { switchAccount, type RobloxAccount } from "@/store/slices/robloxSlice";
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

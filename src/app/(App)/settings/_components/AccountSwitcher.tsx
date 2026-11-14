"use client";

import { Plus, Trash } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addAccount, removeAccount, MAX_ACCOUNTS } from "@/store/slices/robloxSlice";
import { useT } from "@/hooks/useT";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import { AccountAvatar, useAccountLabel, useSwitchAccount } from "@/components/shared/RobloxAccounts";

/** Baris akun Roblox tersimpan: klik = ganti akun (API key, Owner, Place ID ikut berganti) */
export default function AccountSwitcher() {
  const dispatch = useAppDispatch();
  const { accounts, activeAccountId } = useAppSelector((s) => s.roblox);
  const { t, f } = useT();
  const s = t.settings;
  const label = useAccountLabel();
  const pick = useSwitchAccount();
  const [confirm, confirmDialog] = useConfirm();
  const active = accounts.find((a) => a.id === activeAccountId);
  const canRemove = !!active && (accounts.length > 1 || !!active.apiKey || !!active.creatorId);

  const onRemove = async () => {
    if (!active) return;
    const ok = await confirm(f(s.removeAccountConfirm, { name: label(active) }), { title: s.removeAccountTitle, confirmLabel: t.common.delete });
    if (ok) dispatch(removeAccount(active.id));
  };

  return (
    <section aria-labelledby="rbx-accounts" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 id="rbx-accounts" className="text-[14px] font-semibold">
            {s.accounts} <span className="font-mono text-[12px] font-normal text-fg-3">{accounts.length}/{MAX_ACCOUNTS}</span>
          </h3>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-3">{s.accountsHint}</p>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-fg-3 transition-colors hover:bg-hover hover:text-err focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Trash width={14} height={14} /> <span className="hidden sm:inline">{s.removeAccount}</span>
          </button>
        )}
      </div>

      <div role="radiogroup" aria-labelledby="rbx-accounts" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {accounts.map((a) => {
          const on = a.id === activeAccountId;
          const name = label(a);
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && pick(a.id)}
              className={cn(
                "state-layer flex h-11 max-w-[220px] shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1.5 pr-4 text-[13.5px] transition-[background-color,color,box-shadow] duration-150 active:scale-[0.97]",
                on ? "bg-raised font-semibold text-fg shadow-[inset_0_0_0_1.5px_var(--accent)]" : "text-fg-2 hover:bg-hover hover:text-fg",
              )}
            >
              <AccountAvatar acc={a} label={name} size={32} />
              <span className="min-w-0 truncate">{name}</span>
              {!a.apiKey && <span className="size-1.5 shrink-0 rounded-full bg-warn" title={s.apiKeyPlaceholder} aria-label={s.apiKeyPlaceholder} />}
            </button>
          );
        })}
        {accounts.length < MAX_ACCOUNTS && (
          <button
            type="button"
            onClick={() => dispatch(addAccount())}
            className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-dashed border-line-2 px-4 text-[13.5px] font-medium text-fg-2 transition-colors hover:border-fg-3 hover:text-fg active:scale-[0.97]"
          >
            <Plus width={16} height={16} /> {s.addAccount}
          </button>
        )}
      </div>
      {confirmDialog}
    </section>
  );
}

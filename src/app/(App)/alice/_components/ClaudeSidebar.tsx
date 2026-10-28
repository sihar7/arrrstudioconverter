"use client";

import { useState } from "react";
import { Check, EditPencil, LogOut, Mail, Refresh } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { alice, useAlice } from "../_lib/store";
import { claudeBridge, useClaudeState } from "../_lib/claudeView";

/**
 * Sidebar mode Alice (Claude.ai): "Chat baru" · 3 profil akun Claude (ganti sekali klik, bisa diberi nama) ·
 * muat ulang / keluar akun · pindah ke chat API. rail = sidebar diciutkan → nomor profil saja.
 */
export default function ClaudeSidebar({ rail = false }: { rail?: boolean }) {
  const { t, f } = useT();
  const c = t.alice.claude;
  const st = useClaudeState();
  const names = useAlice((s) => s.profileNames);
  const [editing, setEditing] = useState<number | null>(null);
  const bridge = claudeBridge();
  const active = st?.profile ?? 1;
  if (!bridge) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => bridge.nav("new")}
        title={rail ? t.alice.newChat : undefined}
        className="mb-3 flex h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium text-fg transition-[background-color,scale] hover:bg-fg/[0.06] active:scale-[0.97] rail:justify-center rail:px-0"
      >
        <span className="grid size-6 place-items-center rounded-full bg-accent text-on-accent">
          <EditPencil width={13} height={13} strokeWidth={2.2} />
        </span>
        <span className={cn("truncate", rail && "sr-only")}>{t.alice.newChat}</span>
      </button>

      {!rail && <p className="mb-1 px-2.5 text-[11px] font-semibold text-fg-3">{c.accounts}</p>}
      <ul className="flex flex-col gap-px" role="radiogroup" aria-label={c.accounts}>
        {names.map((name, i) => {
          const n = i + 1;
          const on = n === active;
          return (
            <li key={n} className="group/acc relative">
              {editing === i && !rail ? (
                <input
                  autoFocus
                  defaultValue={name}
                  aria-label={c.rename}
                  onBlur={(e) => {
                    alice.renameProfile(i, e.target.value);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="h-9 w-full rounded-[9px] bg-fg/[0.08] px-2.5 text-[13.5px] text-fg outline-none ring-1 ring-accent/50"
                />
              ) : (
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={rail ? name : undefined}
                  onClick={() => bridge.setProfile(n)}
                  onDoubleClick={() => setEditing(i)}
                  className={cn(
                    "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[9px] pl-2.5 pr-9 text-left text-[13.5px] font-medium transition-colors rail:justify-center rail:px-0",
                    on ? "bg-fg/[0.09] text-fg light:bg-black/[0.07]" : "text-fg-2 hover:bg-fg/[0.05] hover:text-fg",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold tabular-nums",
                      on ? "bg-fg text-bg" : "bg-fg/[0.1] text-fg-2",
                    )}
                  >
                    {n}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate", rail && "sr-only")}>{name}</span>
                  {on && !rail && <Check width={15} height={15} strokeWidth={2.2} className="shrink-0 text-fg-2" />}
                </button>
              )}
              {!rail && editing !== i && (
                <button
                  type="button"
                  aria-label={c.rename}
                  title={c.rename}
                  onClick={() => setEditing(i)}
                  className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-[7px] text-fg-3 opacity-0 transition-[opacity,background-color,color] hover:bg-fg/[0.08] hover:text-fg focus-visible:opacity-100 group-hover/acc:opacity-100"
                >
                  <EditPencil width={13} height={13} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!rail && (
        <>
          <p className="mt-3 px-2.5 text-[12px] leading-snug text-fg-3">{c.hint}</p>
          <div className="mt-3 flex flex-col gap-px">
            {bridge.open && <LoginLink open={bridge.open} />}
            <SideAction icon={<Refresh width={15} height={15} />} label={c.reload} onClick={() => bridge.nav("reload")} />
            <SideAction
              icon={<LogOut width={15} height={15} />}
              label={f(c.signOut, { name: names[active - 1] })}
              onClick={() => window.confirm(f(c.signOutConfirm, { name: names[active - 1] })) && void bridge.signOut(active)}
            />
          </div>
          <button
            type="button"
            onClick={() => alice.setEngine("api")}
            className="mt-auto cursor-pointer rounded-[8px] px-2.5 py-2 text-left text-[12px] text-fg-3 transition-colors hover:bg-fg/[0.05] hover:text-fg-2"
          >
            {c.useApi}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Login lewat email: Claude mengirim link ke email; diklik di Gmail = yang login browser biasa, bukan app.
 * Salin link dari email → tempel di sini → dibuka di profil akun yang aktif.
 */
function LoginLink({ open }: { open: (url: string) => Promise<boolean> }) {
  const { t } = useT();
  const c = t.alice.claude;
  const [editing, setEditing] = useState(false);
  const [bad, setBad] = useState(false);

  if (!editing) {
    return <SideAction icon={<Mail width={15} height={15} />} label={c.loginLink} onClick={() => setEditing(true)} />;
  }
  return (
    <form
      className="flex flex-col gap-1.5 rounded-[9px] bg-fg/[0.05] p-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const url = String(new FormData(e.currentTarget).get("url") ?? "");
        const ok = await open(url);
        setBad(!ok);
        if (ok) setEditing(false);
      }}
    >
      <input
        name="url"
        autoFocus
        placeholder="https://claude.ai/magic-link#…"
        aria-label={c.loginLink}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className="h-8 w-full rounded-[7px] bg-bg/60 px-2 font-mono text-[11.5px] text-fg outline-none ring-1 ring-[var(--hairline)] focus:ring-accent/50"
      />
      {bad && <p className="text-[11.5px] text-err">{c.loginLinkBad}</p>}
      <p className="text-[11.5px] leading-snug text-fg-3">{c.loginLinkHint}</p>
      <div className="flex gap-1.5">
        <button type="submit" className="h-7 flex-1 cursor-pointer rounded-[7px] bg-accent text-[12px] font-semibold text-on-accent hover:bg-accent-strong">
          {c.loginLinkOpen}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="h-7 cursor-pointer rounded-[7px] px-2.5 text-[12px] text-fg-3 hover:bg-fg/[0.07] hover:text-fg">
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

function SideAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13px] text-fg-2 transition-colors hover:bg-fg/[0.05] hover:text-fg"
    >
      <span className="grid size-6 shrink-0 place-items-center text-fg-3">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

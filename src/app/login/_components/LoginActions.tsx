"use client";

import { useRouter } from "next/navigation";
import { withBase } from "@/Url/Url";
import { ArrowRight, Discord, WarningTriangle } from "iconoir-react";
import { useDevLoginMutation, useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import type { Dictionary } from "@/utils/languages/id";

export type LoginErrKey = keyof Dictionary["login"]["errors"];

/** Inti login (dipakai layout web & app desktop): pesan error · tombol Discord / lanjut sebagai akun · login dev */
export default function LoginActions({ next, errKey }: { next: string; errKey: LoginErrKey | null }) {
  const { t } = useT();
  const l = t.login;
  const router = useRouter();
  const { data: me, isLoading } = useMeQuery();
  const [devLogin, { isLoading: devBusy }] = useDevLoginMutation();
  const error = errKey && errKey in l.errors ? l.errors[errKey] : null;

  return (
    <>
      {error && (
        <div role="alert" className="rise mb-6 flex gap-3 border-l-2 border-err bg-bg py-3 pl-4 pr-3 text-left text-[14px] text-fg-2">
          <WarningTriangle width={18} height={18} className="mt-0.5 shrink-0 text-err" />
          <div>
            <p>{error}</p>
            {errKey === "not_member" && me?.auth.inviteUrl && (
              <a href={me.auth.inviteUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-fg underline underline-offset-4">
                {l.joinServer}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-[52px] w-full" />
        ) : me?.user ? (
          <Button variant="inverse" size="lg" className="w-full justify-between normal-case tracking-normal" onClick={() => router.push(next)}>
            {me.user.displayName}
            <ArrowRight width={18} height={18} />
          </Button>
        ) : (
          <a
            href={withBase(`/api/auth/discord?next=${encodeURIComponent(next)}`)}
            aria-disabled={me ? !me.auth.discordEnabled : undefined}
            className="btn-plate group flex h-14 items-center gap-3 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent transition-[background-color,transform] hover:bg-accent-strong active:scale-[0.98] aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            <Discord width={20} height={20} />
            <span className="flex-1 text-left">{l.discord}</span>
            <ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        )}
        {me?.auth.guildRequired && !me.user && <p className="text-[13px] text-fg-3">{l.guildNote}</p>}

        {me?.auth.devLogin && !me.user && (
          <div className="mt-2 flex flex-col gap-2 border border-dashed border-line-2 p-4">
            <Button
              variant="ghost"
              loading={devBusy}
              onClick={async () => {
                await devLogin().unwrap();
                router.push(next);
              }}
            >
              {l.dev}
            </Button>
            <p className="text-[12.5px] text-fg-3">{l.devNote}</p>
          </div>
        )}
      </div>
    </>
  );
}

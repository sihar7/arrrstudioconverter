"use client";

import type { ReactNode } from "react";
import { BadgeCheck, Calendar, Group, Key, OpenNewWindow, User } from "iconoir-react";
import { useAppSelector } from "@/store/hooks";
import { useMeQuery, useRobloxProfileQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";

/** Kartu identitas Roblox pemilik API key: banner dari render avatar (blur + grain + pola titik), headshot menumpuk, avatar 3D di kanan */
export default function RobloxProfileCard() {
  const r = useAppSelector((s) => s.roblox);
  const { data: me } = useMeQuery();
  const { t, f, lang } = useT();
  const s = t.settings;
  // Pakai Creator ID; kalau kosong, pemilik key hasil cek
  const id = r.creatorId || (r.creatorType === "user" ? (r.keyCheck?.ownerId ?? "") : "");
  const skip = !me?.user || r.apiKey.length < 20 || !/^\d{1,20}$/.test(id);
  const { data, isFetching, isError } = useRobloxProfileQuery({ type: r.creatorType, id }, { skip });

  if (skip) return null;
  const p = data?.profile;
  const loading = isFetching && !p;
  const profileUrl = p ? (p.type === "user" ? `https://www.roblox.com/users/${p.id}/profile` : `https://www.roblox.com/communities/${p.id}`) : "#";

  return (
    <div className="rise relative overflow-hidden rounded-xl border border-line/60 bg-bg">
      {/* Banner */}
      <div className="relative h-28 overflow-hidden sm:h-32">
        {p?.bodyUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.bodyUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-[1.8] object-cover opacity-50 blur-2xl saturate-150" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--fg)_10%,transparent),transparent_55%)]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent" />
        {/* Avatar 3D full-body — keluar dari banner di sisi kanan */}
        {p?.type === "user" && p.bodyUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.bodyUrl}
            alt=""
            aria-hidden="true"
            className="absolute -bottom-6 right-2 h-[150%] w-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] sm:right-6"
          />
        )}
        <span className="absolute left-4 top-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--glass)] px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-fg-2 backdrop-blur">
          {r.creatorType === "user" ? <User width={12} height={12} /> : <Group width={12} height={12} />}
          {r.creatorType === "user" ? s.profileUser : s.profileGroup}
        </span>
      </div>

      {/* Identitas */}
      <div className="relative -mt-10 flex items-end gap-4 px-4 pb-4 sm:px-5">
        <div className="relative size-[76px] shrink-0 overflow-hidden rounded-2xl border-4 border-bg bg-raised shadow-[var(--elev-2)]">
          {loading ? (
            <Skeleton className="size-full" />
          ) : p?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatarUrl} alt={p.displayName} width={76} height={76} className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center font-display text-[24px] font-bold text-fg-2">{p?.displayName.slice(0, 1) ?? "?"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pb-1 pr-24 sm:pr-32">
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ) : p ? (
            <>
              <p className="flex items-center gap-1.5 truncate font-display text-[19px] font-bold tracking-[-0.01em]">
                <span className="truncate">{p.displayName}</span>
                {p.verified && <BadgeCheck width={18} height={18} className="shrink-0 text-accent" aria-label="Verified" />}
              </p>
              <p className="truncate font-mono text-[12.5px] text-fg-3">
                {p.type === "user" ? `@${p.name}` : p.owner ? f(s.profileOwner, { name: p.owner }) : `#${p.id}`}
              </p>
            </>
          ) : (
            isError && <p className="text-[13px] text-warn">{s.profileNotFound}</p>
          )}
        </div>
      </div>

      {/* Meta chips */}
      {p && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line/60 px-4 py-3 sm:px-5">
          <Chip>
            <span className="font-mono">ID {p.id}</span>
          </Chip>
          {p.memberCount != null && <Chip>{f(s.profileMembers, { n: p.memberCount.toLocaleString(lang) })}</Chip>}
          {p.created && (
            <Chip>
              <Calendar width={13} height={13} /> {f(s.profileSince, { year: new Date(p.created).getFullYear() })}
            </Chip>
          )}
          <Chip tone={r.keyCheck?.ok ? "ok" : "neutral"}>
            <Key width={13} height={13} /> {r.keyCheck?.ok ? s.profileKeyOk : s.profileKeyCheck}
          </Chip>
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-fg-2 transition-colors hover:bg-hover hover:text-fg"
          >
            {s.profileView} <OpenNewWindow width={14} height={14} />
          </a>
        </div>
      )}
    </div>
  );
}

function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium",
        tone === "ok" ? "bg-ok/12 text-ok" : "bg-raised text-fg-2",
      )}
    >
      {children}
    </span>
  );
}

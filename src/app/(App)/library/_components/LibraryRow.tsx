"use client";

import type { MouseEvent } from "react";
import { Check, Copy, OpenNewWindow, Undo } from "iconoir-react";
import { cn, copyText } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useLongPress } from "@/hooks/useLongPress";
import { robloxAssetConfigureUrl } from "@/Url/Url";
import { SfWaveform } from "@/components/icons/SfIcons";
import AppIcon, { type IosTone } from "@/components/ui/AppIcon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import { stateTone } from "../../history/_utils/helpers";
import type { GrantStatus, LibraryAsset } from "@/type/roblox";

const TONE: Record<string, IosTone> = { Approved: "green", Reviewing: "orange", Rejected: "red" };

interface Props {
  asset: LibraryAsset;
  selecting: boolean;
  selected: boolean;
  notOwner: boolean;
  grant?: GrantStatus;
  restoring: boolean;
  /** klik/ketuk baris: di mode pilih = pilih/lepas (shift = rentang); di luar mode = mulai memilih item ini */
  onPick: (shift: boolean) => void;
  onLongPress: () => void;
  onRestore: () => void;
}

/**
 * Satu audio di "Audio saya" — TANPA checkbox. Ubin status (warna sistem iOS) berbalik 3D
 * menjadi centang saat dipilih; baris tersorot + garis aksen di tepi kiri.
 */
export default function LibraryRow({ asset: a, selecting, selected, notOwner, grant: g, restoring, onPick, onLongPress, onRestore }: Props) {
  const { t } = useT();
  const L = t.library;
  const toast = useToast();
  const lp = useLongPress(onLongPress, selecting);

  const onClick = (e: MouseEvent) => {
    if (lp.consume()) return;
    onPick(e.shiftKey);
  };

  return (
    <li
      className={cn(
        "group relative border-b border-[var(--hairline)] transition-colors duration-200 last:border-b-0",
        selected ? "bg-accent/[0.08]" : "hover:bg-fg/[0.03]",
        a.archived && !selected && "opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent transition-transform duration-[var(--spring-dur)] ease-[var(--spring-bounce)]",
          selected ? "scale-y-100" : "scale-y-0",
        )}
      />
      <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onClick}
          {...lp.handlers}
          aria-pressed={selecting ? selected : undefined}
          aria-label={selecting ? undefined : `${L.select}: ${a.name ?? a.assetId}`}
          className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-3.5 text-left"
        >
          <span className="flip-card size-11 shrink-0" data-on={selected}>
            <span className="flip-inner">
              <AppIcon tone={a.archived ? "gray" : (TONE[a.state ?? ""] ?? "gray")} size={44} className="flip-face">
                <SfWaveform filled />
              </AppIcon>
              <span className="flip-face flip-back grid place-items-center rounded-[27%] bg-accent text-on-accent">
                <Check width={22} height={22} strokeWidth={2.4} />
              </span>
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">{a.name ?? a.error ?? a.assetId}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="font-mono text-[12px] text-fg-3">{a.assetId}</span>
              {a.state && <Badge tone={stateTone(a.state)}>{t.history.states[a.state]}</Badge>}
              {a.archived && <Badge tone="err">{L.archived}</Badge>}
              {notOwner && <Badge tone="warn">{L.notOwner}</Badge>}
              {g && (
                <span title={g.status === "failed" ? g.message : undefined}>
                  <Badge tone={g.status === "granted" ? "ok" : "err"}>{g.status === "granted" ? L.granted : L.failed}</Badge>
                </span>
              )}
            </span>
            {g?.status === "failed" && <span className="mt-1 block text-[12px] leading-snug text-err">{g.message}</span>}
          </span>
        </button>

        {/* Aksi baris — disembunyikan di mode pilih supaya ketukan selalu berarti "pilih" */}
        {!selecting && (
          <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-200 [@media(hover:hover)]:opacity-60 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
            <IconButton
              label={L.copyId}
              icon={<Copy width={16} height={16} />}
              onClick={async () => (await copyText(a.assetId)) && toast(t.toast.copied, "ok")}
            />
            {a.archived ? (
              <Button size="sm" variant="ghost" loading={restoring} icon={<Undo />} onClick={onRestore}>
                {L.restore}
              </Button>
            ) : (
              <a
                href={robloxAssetConfigureUrl(a.assetId)}
                target="_blank"
                rel="noreferrer"
                aria-label={L.openDashboard}
                title={L.openDashboard}
                className="ios-press grid size-11 place-items-center rounded-full text-fg-2 hover:bg-fg/[0.06] hover:text-fg"
              >
                <OpenNewWindow width={16} height={16} />
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

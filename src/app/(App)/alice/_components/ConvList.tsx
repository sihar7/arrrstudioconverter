"use client";

import { EditPencil, Trash } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { alice, useAlice } from "../_lib/store";
import { stop } from "../_lib/chat";

/**
 * Daftar percakapan mode Alice: "Chat baru" + terbaru (judul = pesan pertama). Dipakai di sidebar app desktop
 * dan panel kiri halaman versi web. rail = sidebar diciutkan → hanya tombol chat baru.
 */
export default function ConvList({ rail = false, onPick }: { rail?: boolean; onPick?: () => void }) {
  const { t } = useT();
  const a = t.alice;
  const convs = useAlice((s) => s.convs);
  const activeId = useAlice((s) => s.activeId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => {
          alice.open(null);
          onPick?.();
        }}
        title={rail ? a.newChat : undefined}
        className="mb-3 flex h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium text-fg transition-[background-color,scale] hover:bg-fg/[0.06] active:scale-[0.97] rail:justify-center rail:px-0"
      >
        <span className="grid size-6 place-items-center rounded-full bg-accent text-on-accent">
          <EditPencil width={13} height={13} strokeWidth={2.2} />
        </span>
        <span className={cn("truncate", rail && "sr-only")}>{a.newChat}</span>
      </button>

      {!rail && (
        <>
          <p className="mb-1 px-2.5 text-[11px] font-semibold text-fg-3">{a.recents}</p>
          {convs.length === 0 ? (
            <p className="px-2.5 py-2 text-[12.5px] text-fg-3">{a.empty}</p>
          ) : (
            <ul className="thin-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto pr-1">
              {convs.map((c) => {
                const live = c.msgs.at(-1)?.live;
                return (
                  <li key={c.id} className="group/conv relative">
                    <button
                      type="button"
                      aria-current={c.id === activeId ? "page" : undefined}
                      onClick={() => {
                        alice.open(c.id);
                        onPick?.();
                      }}
                      className={cn(
                        "flex h-8 w-full cursor-pointer items-center gap-2 rounded-[8px] pl-2.5 pr-8 text-left text-[13px] transition-colors",
                        c.id === activeId ? "bg-fg/[0.09] text-fg light:bg-black/[0.07]" : "text-fg-2 hover:bg-fg/[0.05] hover:text-fg",
                      )}
                    >
                      {live && <span aria-hidden="true" className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" />}
                      <span className="min-w-0 flex-1 truncate">{c.title || a.untitled}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={a.delete}
                      title={a.delete}
                      onClick={() => {
                        if (!window.confirm(a.deleteConfirm)) return;
                        stop(c.id);
                        alice.remove(c.id);
                      }}
                      className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-[6px] text-fg-3 opacity-0 transition-[opacity,background-color,color] hover:bg-fg/[0.08] hover:text-err focus-visible:opacity-100 group-hover/conv:opacity-100"
                    >
                      <Trash width={14} height={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

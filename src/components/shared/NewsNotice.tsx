"use client";

import { Megaphone, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissNewsNotice, setNewsDialog } from "@/store/slices/toastSlice";
import { CHANGELOG } from "@/lib/changelog";
import { markNewsSeen } from "@/components/shared/WhatsNew";
import Button from "@/components/ui/Button";
import { useT } from "@/hooks/useT";

/** Kartu "Apa yang baru" di deck toast — tetap tampil sampai dipilih; ditutup/dibuka = tandai sudah dilihat */
export default function NewsNotice() {
  const dispatch = useAppDispatch();
  const { t, lang } = useT();
  const u = t.update;
  const news = useAppSelector((s) => s.toast.news);
  const entry = news ? CHANGELOG.find((e) => e.id === news.id) : undefined;
  if (!news || !entry) return null;

  const close = () => {
    markNewsSeen(entry.id);
    dispatch(dismissNewsNotice());
  };
  const view = () => {
    close();
    dispatch(setNewsDialog(true));
  };

  return (
    <div
      role="status"
      className="relative w-full overflow-hidden rounded-[14px] border border-line/60 bg-raised/95 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.5),inset_0_0.5px_0_rgb(255_255_255/0.06)] backdrop-blur-xl light:bg-white/95 light:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.22),0_0_0_0.5px_rgb(0_0_0/0.06)]"
    >
      <div className="flex items-start gap-3 py-3 pl-3 pr-12">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
          <Megaphone width={19} height={19} strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="caps text-[10.5px] text-fg-3">{u.newsTitle}</p>
          <p className="mt-0.5 text-[14px] font-semibold leading-snug">{entry.text[lang].title}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={view}>
              {u.newsView}
            </Button>
            <Button size="sm" variant="subtle" onClick={close}>
              {u.later}
            </Button>
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-label={t.common.close}
        onClick={close}
        className="absolute right-1 top-1 grid size-11 cursor-pointer place-items-center rounded-full text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
      >
        <Xmark width={16} height={16} />
      </button>
    </div>
  );
}

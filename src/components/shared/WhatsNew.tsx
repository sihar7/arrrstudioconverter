"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setNewsDialog, setNewsNotice } from "@/store/slices/toastSlice";
import { CHANGELOG, LATEST_CHANGE } from "@/lib/changelog";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useT } from "@/hooks/useT";

const SEEN_KEY = "arrc.news.seen";
/** Ada preferensi tersimpan = perangkat ini sudah pernah memakai app (bukan pengunjung pertama) */
const STATE_KEY = "arrc_state_v1";
const SHOW_DELAY_MS = 1500;

export function markNewsSeen(id: string) {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {
    /* storage diblokir */
  }
}

/**
 * "Apa yang baru": entri changelog teratas yang belum dilihat → kartu di deck toast (NewsNotice) sekali per perangkat.
 * Pengunjung pertama tidak diberi kartu (semua hal baru baginya; tur onboarding yang bicara) — langsung ditandai dilihat.
 * Dialog daftar pembaruan dibuka dari kartu (state di toastSlice supaya tetap hidup setelah kartu ditutup).
 */
export default function WhatsNew() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.toast.newsDialog);
  const { t, lang } = useT();
  const u = t.update;

  useEffect(() => {
    if (!LATEST_CHANGE) return;
    let seen: string | null = null;
    let returning = false;
    try {
      seen = localStorage.getItem(SEEN_KEY);
      returning = localStorage.getItem(STATE_KEY) !== null;
    } catch {
      return; // storage diblokir → tidak bisa mengingat "sudah dilihat", jangan muncul terus
    }
    if (seen === LATEST_CHANGE.id) return;
    if (!seen && !returning) return markNewsSeen(LATEST_CHANGE.id);
    const id = window.setTimeout(() => dispatch(setNewsNotice({ id: LATEST_CHANGE.id, at: Date.now() })), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [dispatch]);

  const close = () => dispatch(setNewsDialog(false));
  const dateFmt = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <Dialog open={open} onClose={close} title={u.newsTitle} sub={u.newsSub} footer={<Button onClick={close}>{u.newsOk}</Button>}>
      <ol className="flex flex-col gap-6">
        {CHANGELOG.map((e) => {
          const x = e.text[lang];
          return (
            <li key={e.id}>
              <time dateTime={e.date} className="caps text-[10.5px] text-fg-3">
                {dateFmt.format(new Date(`${e.date}T00:00:00Z`))}
              </time>
              <h3 className="mt-1 text-[16px] font-semibold leading-snug text-fg">{x.title}</h3>
              <div className="mt-2 flex flex-col gap-2 text-[13.5px] leading-relaxed text-fg-2">
                {x.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </Dialog>
  );
}

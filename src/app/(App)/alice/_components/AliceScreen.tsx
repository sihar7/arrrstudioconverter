"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Lock } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import { useMeQuery } from "@/store/api/baseApi";
import PageLoader from "@/components/shared/PageLoader";
import AliceAvatar from "./AliceAvatar";
import { useAlice } from "../_lib/store";
import Composer from "./Composer";
import { getDesktop } from "@/type/desktop";
import { autoSyncClaudeMemory } from "../_lib/memorySync";
import Thread from "./Thread";
import UsageBanner from "./UsageBanner";
import ClaudeArea from "./ClaudeArea";
import { claudeBridge } from "../_lib/claudeView";

/**
 * Mode Alice (khusus admin) — acuan Claude Desktop: kosong = sapaan + kotak tulis di tengah layar;
 * ada percakapan = kolom pesan ±720px, kotak tulis menempel di bawah. App desktop: daftar chat ada di sidebar
 * (mode Alice). Khusus app desktop: di web halaman ini hanya menampilkan pemberitahuan.
 */
export default function AliceScreen() {
  const { t } = useT();
  const a = t.alice;
  const hydrated = useHydrated();
  const { data: me, isLoading } = useMeQuery();
  const conv = useAlice((s) => s.convs.find((c) => c.id === s.activeId) ?? null);
  const busy = Boolean(conv?.msgs.at(-1)?.live);
  const engine = useAlice((s) => s.engine);

  // Memori Claude Code di PC ini → memori Alice (sekali per sesi app)
  const isAdmin = Boolean(me?.user?.isAdmin);
  useEffect(() => {
    if (isAdmin) autoSyncClaudeMemory();
  }, [isAdmin]);

  // Ikuti jawaban yang sedang mengalir selama user masih di dasar halaman; berhenti bila ia menggulir ke atas
  const stick = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      stick.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useLayoutEffect(() => {
    if (stick.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [conv]);
  // Pindah percakapan → mulai dari dasar
  useLayoutEffect(() => {
    stick.current = true;
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [conv?.id]);

  if (!hydrated || isLoading) return <PageLoader />;
  // Khusus admin DI APP DESKTOP — web tidak punya mode Alice
  const desktop = Boolean(getDesktop());
  if (!me?.user?.isAdmin || !desktop) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-l border border-line/60 bg-surface text-fg-3">
          <Lock width={24} height={24} />
        </span>
        <h1 className="mt-5 text-[22px] font-bold">{a.adminOnly}</h1>
        <p className="mt-2 text-[14.5px] text-fg-2">{a.adminOnlyBody}</p>
      </div>
    );
  }

  // Claude.ai asli (langganan Pro, app desktop 1.3+) — chat API tetap tersedia sebagai pilihan
  if (engine === "claude" && claudeBridge()) return <ClaudeArea />;

  return (
    <div className="flex">
      <div className="mx-auto flex min-h-[calc(100dvh-var(--bar-h)-var(--dock-h)-60px)] w-full max-w-[760px] flex-col">
        {conv ? (
          <>
            <div className="flex-1">
              <Thread conv={conv} />
            </div>
            <div className="sticky bottom-[calc(var(--dock-h)+12px)] z-10 bg-gradient-to-t from-bg from-60% to-transparent pt-6">
              <UsageBanner usage={conv.usage} convId={conv.id} />
              <Composer busy={busy} convId={conv.id} autoFocus />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-7 pb-[8vh]">
            <div className="flex flex-col items-center gap-3 text-center">
              <AliceAvatar size={72} className="mb-1 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.6)]" />
              <h1 className="text-balance font-display text-[28px] font-semibold tracking-[-0.02em] desk:text-[26px]">{a.greeting}</h1>
              <p className="max-w-md text-pretty text-[14px] text-fg-3">{a.greetingSub}</p>
            </div>
            <div className="w-full">
              <Composer busy={false} convId={null} autoFocus />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  Bookmark,
  BookmarkSolid,
  ClockRotateRight,
  Compass,
  Eye,
  GraphUp,
  Link,
  OpenNewWindow,
  Play,
  Plus,
  Refresh,
  Search,
  Sparks,
  Trash,
  Xmark,
} from "iconoir-react";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { cn, copyText, formatDuration } from "@/lib/utils";
import { useYtLibrary, ytLibrary, type WatchedVideo } from "@/lib/ytLibrary";
import PageHeader from "@/components/shared/PageHeader";
import CardBox from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Skeleton from "@/components/ui/Skeleton";
import { useQuickAdd } from "../_hooks/useQuickAdd";
import { useRelated } from "../_hooks/useRelated";
import { useSuggest } from "../_hooks/useSuggest";
import { useYoutubeSearch } from "../_hooks/useYoutubeSearch";
import type { SearchFilters, SearchVersion, SearchVideo } from "../_types/youtube.type";
import { ActiveFilters, ExploreRail, FilterSelect, Segmented } from "./SearchControls";
import { searchLink } from "../../converter/_utils/helpers";
import { YT_SEARCH_EVENT } from "../../layout/desktop/nav";

/**
 * YouTube versi web: YouTube melarang situsnya ditanam (iframe youtube.com diblokir), jadi web memakai
 * pencarian sendiri (BE /api/youtube/search) + pemutar embed resmi. Fitur sama dengan app desktop:
 * cari → putar → "Tambah ke antrean". Tempel link langsung juga bisa.
 * Tab: Jelajah (cari) · Untukmu (video terkait dari selera) · Riwayat tonton · Tonton nanti — pustaka per perangkat.
 */

type View = "explore" | "forYou" | "history" | "later";

export default function WebYoutube() {
  const { t, f } = useT();
  const y = t.youtube;
  const toast = useToast();
  const lib = useYtLibrary();
  const { query, items, pages, hasMore, loading, loadingMore, error, search, loadMore, filters, setFilters } = useYoutubeSearch();
  const { add, addVideo, busy } = useQuickAdd();
  // Judul hasil memakai label chip ("Lagu barat viral"), bukan kata kunci mentahnya
  const labelOf = (q: string) => [...y.chips, ...y.genres].find(([, k]) => k === q)?.[0] ?? q;
  const [view, setView] = useState<View>("explore");
  const [input, setInput] = useState("");
  const [playing, setPlaying] = useState<SearchVideo | null>(null);
  // Saran ketikan: tampil saat kolom fokus. Kolom kosong → pencarian terakhir; mengetik → saran YouTube
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typing = input.trim().length > 0;
  const suggestions = useSuggest(input, suggestOpen && !searchLink(input));
  const recentMode = !typing;
  const list = recentMode ? lib.searches : suggestions;
  const showSuggest = suggestOpen && list.length > 0;

  // Pilihan jelajah terakhir (chip/genre). Kolom dikosongkan setelah mencari → otomatis kembali ke sini tanpa klik Cari
  const browse = useRef<string>(y.chips[0][1]);
  useEffect(() => {
    if (view !== "explore" || input.trim() || !query || query === browse.current) return;
    // jeda singkat: menghapus cepat huruf demi huruf tidak memicu pencarian berkali-kali
    const id = setTimeout(() => void search(browse.current), 250);
    return () => clearTimeout(id);
  }, [view, input, query, search]);

  // Sentinel di dasar daftar (pola sama dengan Audio saya)
  const more = useRef(loadMore);
  useEffect(() => {
    more.current = loadMore;
  });
  const observer = useRef<IntersectionObserver | null>(null);
  const sentinel = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new IntersectionObserver(([e]) => e.isIntersecting && void more.current(true), { rootMargin: "600px 0px" });
    observer.current.observe(el);
  }, []);

  // Pertama dibuka: ?q= (command palette) → Jelajah; sudah punya selera → Untukmu; lainnya → Jelajah "Lagu viral"
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    // URL & localStorage baru bisa dibaca setelah hydrate (halaman statis) → sekali saat mount, bukan state turunan
    if (q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(q);
      void search(q);
    } else if (ytLibrary.get().seeds.length) setView("forYou");
    else void search(browse.current);
    // hanya sekali saat halaman dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Masuk tab Jelajah tanpa hasil (mis. pertama kali dari Untukmu) → muat pilihan jelajah
  const goView = (v: View) => {
    setView(v);
    if (v === "explore" && !query) void search(browse.current);
  };

  const runSearch = useCallback(
    (q: string) => {
      setView("explore");
      ytLibrary.searched(q);
      void search(q);
    },
    [search],
  );

  // Palette dipakai saat halaman ini sudah terbuka → cari tanpa navigasi ulang
  useEffect(() => {
    const onSearch = (e: Event) => {
      const q = String((e as CustomEvent<string>).detail ?? "").trim();
      if (!q) return;
      setInput(q);
      runSearch(q);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener(YT_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(YT_SEARCH_EVENT, onSearch);
  }, [runSearch]);

  const closeSuggest = () => {
    setSuggestOpen(false);
    setActive(-1);
  };

  const choose = (q: string) => {
    closeSuggest();
    setInput(q);
    runSearch(q);
  };

  // Navigasi keyboard ala kotak cari YouTube: ↑/↓ menyorot, Enter cari, Esc tutup
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showSuggest) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = list.length;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(list[active]);
    } else if (e.key === "Escape") {
      closeSuggest();
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    closeSuggest();
    const link = searchLink(input);
    // Link YouTube → langsung ke antrean; selain itu (termasuk kata panjang) → cari
    if (link) {
      void add(link).then(() => setInput(""));
      return;
    }
    if (input.trim()) runSearch(input);
  };

  // Chip pencarian cepat / genre → cari kata kuncinya, kolom input dikosongkan (tidak masuk pencarian terakhir)
  const pick = (q: string) => {
    browse.current = q;
    setInput("");
    void search(q);
  };

  const play = (v: SearchVideo) => {
    setPlaying(v);
    ytLibrary.watched(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const laterIds = useMemo(() => new Set(lib.later.map((v) => v.videoId)), [lib.later]);
  const toggleLater = (v: SearchVideo) => toast(ytLibrary.toggleLater(v) ? y.saved : y.unsaved, "ok");

  const cardProps = (v: SearchVideo, i: number) => ({
    video: v,
    index: i,
    active: playing?.videoId === v.videoId,
    saved: laterIds.has(v.videoId),
    onPlay: () => play(v),
    onAdd: () => addVideo(v),
    onSave: () => toggleLater(v),
  });

  return (
    <div className="flex min-w-0 flex-col gap-8 desk:gap-5">
      <PageHeader eyebrow={y.eyebrow} title={y.title} sub={y.sub} />

      <div className="flex min-w-0 flex-col gap-4 desk:gap-3">
        <form onSubmit={submit} className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{y.search}</span>
            <Search width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden="true" />
            <input
              type="search"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSuggestOpen(true);
                setActive(-1);
              }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={closeSuggest}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={showSuggest}
              aria-controls="yt-suggest"
              aria-autocomplete="list"
              aria-activedescendant={showSuggest && active >= 0 ? `yt-suggest-${active}` : undefined}
              autoComplete="off"
              placeholder={y.placeholder}
              className="h-12 w-full rounded-full border border-line/70 bg-surface pl-11 pr-4 text-[15px] outline-none transition-colors placeholder:text-fg-3 focus:border-line-2 desk:h-10 desk:rounded-[10px] desk:border-[var(--hairline)] desk:bg-fg/[0.05] desk:pl-10 desk:text-[13.5px] desk:focus:border-accent/60 desk:focus:bg-transparent"
            />
            {showSuggest && (
              <ul
                id="yt-suggest"
                role="listbox"
                aria-label={recentMode ? y.recent : y.search}
                className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[18px] border border-line/70 bg-surface py-1.5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)] desk:rounded-[10px]"
              >
                {recentMode && <li className="caps px-4 pb-1 pt-1.5 text-[10.5px] text-fg-3 desk:px-3" role="presentation">{y.recent}</li>}
                {list.map((s, i) => (
                  <li
                    key={s}
                    id={`yt-suggest-${i}`}
                    role="option"
                    aria-selected={i === active}
                    // mousedown (bukan click) → terpilih sebelum input kehilangan fokus & daftar tertutup
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(s);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 px-4 py-2 text-[14.5px] text-fg desk:px-3 desk:py-1.5 desk:text-[13.5px]",
                      i === active && "bg-fg/[0.06]",
                    )}
                  >
                    {recentMode ? (
                      <ClockRotateRight width={15} height={15} className="shrink-0 text-fg-3" aria-hidden="true" />
                    ) : (
                      <Search width={15} height={15} className="shrink-0 text-fg-3" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{s}</span>
                    {recentMode && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`${y.removeRecent}: ${s}`}
                        title={y.removeRecent}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          ytLibrary.removeSearch(s);
                          setActive(-1);
                        }}
                        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-fg-3 opacity-60 transition-[opacity,background-color] hover:bg-fg/[0.1] hover:text-fg group-hover:opacity-100"
                      >
                        <Xmark width={14} height={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </label>
          <Button type="submit" variant="primary" loading={busy} className="h-12 px-6 desk:h-10 desk:px-5">
            {y.search}
          </Button>
        </form>

        <Segmented
          label={y.title}
          value={view}
          onChange={goView}
          options={[
            { value: "explore", label: y.tabs.explore, icon: <Compass width={15} height={15} aria-hidden="true" /> },
            { value: "forYou", label: y.tabs.forYou, icon: <Sparks width={15} height={15} aria-hidden="true" /> },
            { value: "history", label: tabLabel(y.tabs.history, lib.history.length), icon: <ClockRotateRight width={15} height={15} aria-hidden="true" /> },
            { value: "later", label: tabLabel(y.tabs.later, lib.later.length), icon: <Bookmark width={15} height={15} aria-hidden="true" /> },
          ]}
        />

        {view === "explore" && (
          <>
            <ExploreRail query={query} onPick={pick} />
            <FilterBar filters={filters} onChange={setFilters} />
          </>
        )}
      </div>

      {playing && (
        <Player
          video={playing}
          saved={laterIds.has(playing.videoId)}
          onClose={() => setPlaying(null)}
          onAdd={() => addVideo(playing)}
          onSave={() => toggleLater(playing)}
          onPlay={play}
        />
      )}

      {view === "explore" && (
        <section aria-busy={loading} className="flex flex-col gap-5">
          {query && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-[15px] font-semibold text-fg-2 desk:text-[13px]">
                {f(!loading && !loadingMore && !items.length ? y.empty : y.results, { q: labelOf(query) })}
              </h2>
              <ActiveFilters filters={filters} onChange={setFilters} />
            </div>
          )}
          {error && <p className="text-[14px] text-err">{error}</p>}
          <CardGrid>
            {loading ? <CardSkeletons count={8} /> : items.map((v, i) => <ResultCard key={v.videoId} {...cardProps(v, i)} rank={filters.sort === "views" ? i + 1 : null} />)}
            {loadingMore && <CardSkeletons count={4} />}
          </CardGrid>
          {/* Infinite scroll ala YouTube: halaman berikut dimuat ~600px sebelum dasar daftar terlihat */}
          {hasMore && !loading && (
            // key → observer dipasang ulang tiap halaman bertambah (kalau dasar masih terlihat, langsung muat lagi)
            <div key={pages} ref={sentinel} className="flex justify-center">
              {error && !loadingMore && (
                <Button variant="ghost" onClick={() => void loadMore()}>
                  {y.loadMore}
                </Button>
              )}
              <span className="sr-only" aria-live="polite">
                {loadingMore ? y.loadMore : ""}
              </span>
            </div>
          )}
        </section>
      )}

      {view === "forYou" && <ForYou seeds={lib.seeds} cardProps={cardProps} onExplore={() => goView("explore")} />}

      {view === "history" && (
        <section className="flex flex-col gap-5">
          <SectionHead sub={y.historySub}>
            {lib.history.length > 0 && (
              <Button
                size="sm"
                variant="subtle"
                icon={<Trash />}
                onClick={() => {
                  ytLibrary.clearHistory();
                  toast(y.historyCleared, "ok");
                }}
              >
                {y.historyClear}
              </Button>
            )}
          </SectionHead>
          {lib.history.length ? (
            groupByDay(lib.history).map(([day, list]) => (
              <div key={day} className="flex flex-col gap-3">
                <h3 className="caps text-[10.5px] text-fg-3">{day === "today" ? y.today : day === "yesterday" ? y.yesterday : y.earlier}</h3>
                <CardGrid>
                  {list.map((v, i) => (
                    <ResultCard key={v.videoId} {...cardProps(v, i)} rank={null} onRemove={() => ytLibrary.removeWatched(v.videoId)} />
                  ))}
                </CardGrid>
              </div>
            ))
          ) : (
            <Empty icon={<ClockRotateRight />} title={y.historyEmpty} sub={y.historyEmptySub} action={y.goExplore} onAction={() => goView("explore")} />
          )}
        </section>
      )}

      {view === "later" && (
        <section className="flex flex-col gap-5">
          <SectionHead sub={y.laterSub} />
          {lib.later.length ? (
            <CardGrid>
              {lib.later.map((v, i) => (
                <ResultCard key={v.videoId} {...cardProps(v, i)} rank={null} />
              ))}
            </CardGrid>
          ) : (
            <Empty icon={<Bookmark />} title={y.laterEmpty} sub={y.laterEmptySub} action={y.goExplore} onAction={() => goView("explore")} />
          )}
        </section>
      )}
    </div>
  );
}

const tabLabel = (label: string, n: number) => (n ? `${label} · ${n > 99 ? "99+" : n}` : label);

/** Kelompokkan riwayat: hari ini · kemarin · sebelumnya (urutan terbaru tetap) */
function groupByDay(list: WatchedVideo[]): [string, WatchedVideo[]][] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const yesterday = today - 86_400_000;
  const groups: Record<string, WatchedVideo[]> = { today: [], yesterday: [], earlier: [] };
  for (const v of list) groups[v.at >= today ? "today" : v.at >= yesterday ? "yesterday" : "earlier"].push(v);
  return Object.entries(groups).filter(([, l]) => l.length);
}

type CardProps = Omit<Parameters<typeof ResultCard>[0], "rank">;

/** Untukmu: video terkait dari maks 5 lagu acuan; "Acak ulang" memilih acuan lain dari selera */
function ForYou({ seeds, cardProps, onExplore }: { seeds: string[]; cardProps: (v: SearchVideo, i: number) => CardProps; onExplore: () => void }) {
  const { t } = useT();
  const y = t.youtube;
  const [mix, setMix] = useState(0);
  // mix 0 = 5 terbaru; selanjutnya acak (tetap stabil selama mix sama)
  const picked = useMemo(() => {
    if (!mix) return seeds.slice(0, 5);
    const pool = [...seeds];
    let s = mix * 9301 + 49297;
    for (let i = pool.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  }, [seeds, mix]);
  const { items, loading, error } = useRelated(picked);

  if (!seeds.length) {
    return <Empty icon={<Sparks />} title={y.forYouEmpty} sub={y.forYouEmptySub} action={y.goExplore} onAction={onExplore} />;
  }
  return (
    <section aria-busy={loading} className="flex flex-col gap-5">
      <SectionHead sub={y.forYouSub}>
        {seeds.length > 5 && (
          <Button size="sm" variant="subtle" icon={<Refresh />} onClick={() => setMix((m) => m + 1)} disabled={loading}>
            {y.forYouRefresh}
          </Button>
        )}
      </SectionHead>
      {error && <p className="text-[14px] text-err">{error}</p>}
      <CardGrid>{loading ? <CardSkeletons count={8} /> : items.map((v, i) => <ResultCard key={v.videoId} {...cardProps(v, i)} rank={null} />)}</CardGrid>
      {!loading && !error && !items.length && <Empty icon={<Sparks />} title={y.forYouEmpty} sub={y.forYouEmptySub} action={y.goExplore} onAction={onExplore} />}
    </section>
  );
}

/** Pemutar embed + simpan / salin link + daftar "Berikutnya" (video terkait lagu yang diputar) */
function Player({
  video,
  saved,
  onClose,
  onAdd,
  onSave,
  onPlay,
}: {
  video: SearchVideo;
  saved: boolean;
  onClose: () => void;
  onAdd: () => void;
  onSave: () => void;
  onPlay: (v: SearchVideo) => void;
}) {
  const { t } = useT();
  const y = t.youtube;
  const toast = useToast();
  const seeds = useMemo(() => [video.videoId], [video.videoId]);
  const related = useRelated(seeds);
  const next = related.items.slice(0, 10);
  const url = `https://www.youtube.com/watch?v=${video.videoId}`;
  return (
    <CardBox className="rise overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="relative aspect-video bg-black">
          <iframe
            key={video.videoId}
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        </div>
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="caps text-[10.5px] text-fg-3">{y.nowPlaying}</p>
            <IconButton size="sm" label={y.closePlayer} icon={<Xmark width={18} height={18} />} onClick={onClose} className="-mr-2 -mt-2" />
          </div>
          <div className="min-w-0">
            <p className="text-[18px] font-bold leading-snug tracking-[-0.02em] [overflow-wrap:anywhere]">{video.title}</p>
            <p className="mt-1.5 text-[13.5px] text-fg-2">{video.author}</p>
            <p className="mt-0.5 text-[12.5px] text-fg-3">{[formatDuration(video.duration), video.views, video.published].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={onAdd}>
              <Plus width={18} height={18} strokeWidth={2.2} /> {y.add}
            </Button>
            <IconButton
              label={saved ? y.unsave : y.save}
              active={saved}
              aria-pressed={saved}
              icon={saved ? <BookmarkSolid width={18} height={18} /> : <Bookmark width={18} height={18} />}
              onClick={onSave}
              className="bg-fg/[0.07] hover:bg-fg/[0.12]"
            />
            <IconButton
              label={y.copyLink}
              icon={<Link width={18} height={18} />}
              onClick={() => void copyText(url).then((ok) => ok && toast(y.linkCopied, "ok"))}
              className="bg-fg/[0.07] hover:bg-fg/[0.12]"
            />
            <IconButton
              label={y.watchOn}
              icon={<OpenNewWindow width={17} height={17} />}
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              className="bg-fg/[0.07] hover:bg-fg/[0.12]"
            />
          </div>
        </div>
      </div>
      {(related.loading || next.length > 0) && (
        <div className="border-t border-line/60 px-5 pb-5 pt-4 sm:px-6">
          <p className="caps mb-3 text-[10.5px] text-fg-3">{y.upNext}</p>
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {related.loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <li key={i} aria-hidden="true" className="flex w-[184px] shrink-0 flex-col gap-2">
                    <Skeleton className="aspect-video w-full rounded" />
                    <Skeleton className="h-3 w-4/5" />
                  </li>
                ))
              : next.map((v) => (
                  <li key={v.videoId} className="w-[184px] shrink-0">
                    <button type="button" onClick={() => onPlay(v)} className="group flex w-full cursor-pointer flex-col gap-2 text-left" aria-label={`${y.play}: ${v.title}`}>
                      <span className="relative block aspect-video w-full overflow-hidden rounded bg-raised desk:rounded-[8px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.thumbnail} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.05]" />
                        {v.duration != null && (
                          <span className="absolute bottom-1.5 right-1.5 rounded-xs bg-black/75 px-1 py-px text-[10.5px] font-semibold tabular-nums text-white">{formatDuration(v.duration)}</span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-fg-2 transition-colors group-hover:text-fg">{v.title}</span>
                    </button>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </CardBox>
  );
}

function SectionHead({ sub, children }: { sub: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[14px] text-fg-2 desk:text-[12.5px]">{sub}</p>
      {children}
    </div>
  );
}

function Empty({ icon, title, sub, action, onAction }: { icon: ReactNode; title: string; sub: string; action: string; onAction: () => void }) {
  return (
    <div className="rise flex flex-col items-center gap-3 rounded-[18px] bg-fg/[0.03] px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-[14px] bg-fg/[0.07] text-fg-2 [&>svg]:size-[22px]" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-[16px] font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-fg-3">{sub}</p>
      </div>
      <Button size="sm" variant="subtle" icon={<Compass />} onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 desk:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] desk:gap-x-4 desk:gap-y-5">
      {children}
    </ul>
  );
}

type FilterKey = keyof SearchFilters;

/**
 * Bilah filter: Versi (segmented, paling sering dipakai) di kiri; Urutan + Durasi + Upload di kanan.
 * Layar sempit → menumpuk, segmented bisa digeser horizontal.
 */
function FilterBar({ filters, onChange }: { filters: SearchFilters; onChange: (patch: Partial<SearchFilters>) => void }) {
  const { t } = useT();
  const y = t.youtube;
  const fl = y.filters;
  const versions = Object.entries(fl.version.options).map(([value, label]) => ({ value: value as SearchVersion, label }));
  const pick = (k: FilterKey) => (v: string) => onChange({ [k]: v } as Partial<SearchFilters>);
  return (
    <div role="group" aria-label={y.filter} className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
      <div className="flex min-w-0 max-w-full items-center gap-2.5">
        <span className="caps shrink-0 text-[10.5px] text-fg-3">{fl.version.label}</span>
        <Segmented label={fl.version.label} value={filters.version} options={versions} onChange={pick("version")} />
      </div>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:ml-auto">
        <Segmented
          label={fl.sort.label}
          value={filters.sort}
          onChange={pick("sort")}
          options={[
            { value: "relevance", label: fl.sort.options.relevance, icon: <Sparks width={14} height={14} aria-hidden="true" /> },
            { value: "views", label: fl.sort.options.views, icon: <GraphUp width={14} height={14} aria-hidden="true" /> },
          ]}
        />
        {(["duration", "upload"] as const).map((k) => (
          <FilterSelect
            key={k}
            label={fl[k].label}
            value={filters[k]}
            options={fl[k].options as Record<string, string>}
            changed={filters[k] !== "any"}
            onPick={pick(k)}
          />
        ))}
      </div>
    </div>
  );
}

function CardSkeletons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <li key={`sk-${i}`} aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="aspect-video w-full rounded" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </li>
  ));
}

function ResultCard({
  video,
  index,
  rank,
  active,
  saved,
  onPlay,
  onAdd,
  onSave,
  onRemove,
}: {
  video: SearchVideo;
  index: number;
  /** urutan "Terbanyak ditonton" → nomor peringkat di thumbnail */
  rank: number | null;
  active: boolean;
  saved: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onSave: () => void;
  /** tampil di Riwayat: hapus satu lagu dari riwayat */
  onRemove?: () => void;
}) {
  const { t, f } = useT();
  const y = t.youtube;
  return (
    <li className="rise group/card relative flex flex-col gap-3" style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}>
      <button
        type="button"
        onClick={onPlay}
        aria-label={`${y.play}: ${video.title}`}
        className={cn(
          "group relative aspect-video w-full cursor-pointer overflow-hidden rounded bg-raised transition-transform duration-150 active:scale-[0.98] desk:rounded-[10px]",
          active && "ring-2 ring-fg ring-offset-2 ring-offset-bg",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnail} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.04]" />
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors duration-200 group-hover:bg-black/35">
          <span className="grid size-12 scale-90 place-items-center rounded-full bg-white/90 text-black opacity-0 shadow-lg transition-[opacity,scale] duration-200 group-hover:scale-100 group-hover:opacity-100">
            <Play width={20} height={20} className="translate-x-px" />
          </span>
        </span>
        {rank != null && (
          <span
            aria-label={f(y.rank, { n: rank })}
            className={cn(
              "absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[12px] font-bold tabular-nums shadow-[0_2px_8px_rgb(0_0_0/0.35)]",
              rank <= 3 ? "bg-white text-black" : "bg-black/70 text-white",
            )}
          >
            {rank}
          </span>
        )}
        {video.duration != null && (
          <span className="absolute bottom-2 right-2 rounded-xs bg-black/75 px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-white">
            {formatDuration(video.duration)}
          </span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${y.historyRemove}: ${video.title}`}
          title={y.historyRemove}
          className="ios-press absolute right-2 top-2 grid size-8 cursor-pointer place-items-center rounded-full bg-black/65 text-white opacity-100 shadow-lg transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-visible:opacity-100"
        >
          <Xmark width={16} height={16} strokeWidth={2} />
        </button>
      )}
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug [overflow-wrap:anywhere] desk:text-[13px]" title={video.title}>
            {video.title}
          </p>
          {rank != null && video.views ? (
            <p className="mt-1 flex min-w-0 items-center gap-1 text-[12.5px] text-fg-3 desk:text-[11.5px]">
              <Eye width={13} height={13} className="shrink-0 text-fg-2" aria-hidden="true" />
              <span className="shrink-0 font-semibold text-fg-2">{video.views}</span>
              <span className="truncate">· {[video.author, video.published].filter(Boolean).join(" · ")}</span>
            </p>
          ) : (
            <p className="mt-1 truncate text-[12.5px] text-fg-3 desk:text-[11.5px]">{[video.author, video.views, video.published].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <IconButton
          size="sm"
          label={saved ? y.unsave : y.save}
          aria-pressed={saved}
          icon={saved ? <BookmarkSolid width={16} height={16} /> : <Bookmark width={16} height={16} />}
          onClick={onSave}
          className={cn("-mt-1", saved ? "text-fg" : "")}
        />
        <IconButton size="sm" label={y.add} icon={<Plus width={18} height={18} strokeWidth={2.2} />} onClick={onAdd} className="-mt-1 bg-fg/[0.07] hover:bg-fg/[0.12]" />
      </div>
    </li>
  );
}

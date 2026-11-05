"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Eye, GraphUp, OpenNewWindow, Play, Plus, Search, Sparks, Xmark } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn, formatDuration } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import CardBox from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Skeleton from "@/components/ui/Skeleton";
import { useQuickAdd } from "../_hooks/useQuickAdd";
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
 */
export default function WebYoutube() {
  const { t, f } = useT();
  const y = t.youtube;
  const { query, items, pages, hasMore, loading, loadingMore, error, search, loadMore, filters, setFilters } = useYoutubeSearch();
  const { add, addVideo, busy } = useQuickAdd();
  // Judul hasil memakai label chip ("Lagu barat viral"), bukan kata kunci mentahnya
  const labelOf = (q: string) => [...y.chips, ...y.genres].find(([, k]) => k === q)?.[0] ?? q;
  const [input, setInput] = useState("");
  const [playing, setPlaying] = useState<SearchVideo | null>(null);
  // Saran ketikan: tampil saat kolom fokus & sedang mengetik (bukan link); -1 = belum ada yang disorot
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = useSuggest(input, suggestOpen && !searchLink(input));
  const showSuggest = suggestOpen && suggestions.length > 0;

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

  // Hasil awal: ?q= (dari command palette app desktop) atau pilihan cepat pertama
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    // URL baru bisa dibaca setelah hydrate (halaman statis) → sekali saat mount, bukan state turunan
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q) setInput(q);
    void search(q || t.youtube.chips[0][1]);
    // hanya sekali saat halaman dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Palette dipakai saat halaman ini sudah terbuka → cari tanpa navigasi ulang
  useEffect(() => {
    const onSearch = (e: Event) => {
      const q = String((e as CustomEvent<string>).detail ?? "").trim();
      if (!q) return;
      setInput(q);
      void search(q);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener(YT_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(YT_SEARCH_EVENT, onSearch);
  }, [search]);

  const closeSuggest = () => {
    setSuggestOpen(false);
    setActive(-1);
  };

  const choose = (q: string) => {
    closeSuggest();
    setInput(q);
    void search(q);
  };

  // Navigasi keyboard ala kotak cari YouTube: ↑/↓ menyorot (teks ikut berubah), Enter cari, Esc tutup
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showSuggest) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = suggestions.length;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
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
    void search(input);
  };

  // Chip pencarian cepat / genre → cari kata kuncinya, kolom input dikosongkan
  const pick = (q: string) => {
    setInput("");
    void search(q);
  };

  return (
    <div className="flex flex-col gap-8 desk:gap-5">
      <PageHeader eyebrow={y.eyebrow} title={y.title} sub={y.sub} />

      <div className="flex flex-col gap-4 desk:gap-3">
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
                aria-label={y.search}
                className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[18px] border border-line/70 bg-surface py-1.5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)] desk:rounded-[10px]"
              >
                {suggestions.map((s, i) => (
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
                      "flex cursor-pointer items-center gap-3 px-4 py-2 text-[14.5px] text-fg desk:px-3 desk:py-1.5 desk:text-[13.5px]",
                      i === active && "bg-fg/[0.06]",
                    )}
                  >
                    <Search width={15} height={15} className="shrink-0 text-fg-3" aria-hidden="true" />
                    <span className="min-w-0 truncate">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </label>
          <Button type="submit" variant="primary" loading={busy} className="h-12 px-6 desk:h-10 desk:px-5">
            {y.search}
          </Button>
        </form>
        <ExploreRail query={query} onPick={pick} />
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {playing && (
        <CardBox className="rise overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="relative aspect-video bg-black">
              <iframe
                key={playing.videoId}
                src={`https://www.youtube-nocookie.com/embed/${playing.videoId}?autoplay=1&rel=0`}
                title={playing.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="caps text-[10.5px] text-fg-3">{y.nowPlaying}</p>
                <IconButton size="sm" label={y.closePlayer} icon={<Xmark width={18} height={18} />} onClick={() => setPlaying(null)} className="-mr-2 -mt-2" />
              </div>
              <div className="min-w-0">
                <p className="text-[18px] font-bold leading-snug tracking-[-0.02em] [overflow-wrap:anywhere]">{playing.title}</p>
                <p className="mt-1.5 text-[13.5px] text-fg-2">{playing.author}</p>
                <p className="mt-0.5 text-[12.5px] text-fg-3">
                  {[formatDuration(playing.duration), playing.views, playing.published].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => addVideo(playing)}>
                  <Plus width={18} height={18} strokeWidth={2.2} /> {y.add}
                </Button>
                <a
                  href={`https://www.youtube.com/watch?v=${playing.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="state-layer ios-press inline-flex h-11 items-center gap-2 rounded-full bg-fg/[0.07] px-5 text-[15px] font-semibold text-fg hover:bg-fg/[0.12]"
                >
                  <OpenNewWindow width={17} height={17} /> {y.watchOn}
                </a>
              </div>
            </div>
          </div>
        </CardBox>
      )}

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
        <ul className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 desk:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] desk:gap-x-4 desk:gap-y-5">
          {loading
            ? <CardSkeletons count={8} />
            : items.map((v, i) => (
                <ResultCard
                  key={v.videoId}
                  video={v}
                  index={i}
                  rank={filters.sort === "views" ? i + 1 : null}
                  active={playing?.videoId === v.videoId}
                  onPlay={() => {
                    setPlaying(v);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onAdd={() => addVideo(v)}
                />
              ))}
          {loadingMore && <CardSkeletons count={4} />}
        </ul>
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
    </div>
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
  onPlay,
  onAdd,
}: {
  video: SearchVideo;
  index: number;
  /** urutan "Terbanyak ditonton" → nomor peringkat di thumbnail */
  rank: number | null;
  active: boolean;
  onPlay: () => void;
  onAdd: () => void;
}) {
  const { t, f } = useT();
  const y = t.youtube;
  return (
    <li className="rise flex flex-col gap-3" style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}>
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
      <div className="flex items-start gap-2">
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
        <IconButton size="sm" label={y.add} icon={<Plus width={18} height={18} strokeWidth={2.2} />} onClick={onAdd} className="-mt-1 bg-fg/[0.07] hover:bg-fg/[0.12]" />
      </div>
    </li>
  );
}

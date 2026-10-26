"use client";

import { useEffect, useState, type FormEvent } from "react";
import { OpenNewWindow, Play, Plus, Search, Xmark } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn, formatDuration } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import CardBox from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Skeleton from "@/components/ui/Skeleton";
import { useQuickAdd } from "../_hooks/useQuickAdd";
import { useYoutubeSearch } from "../_hooks/useYoutubeSearch";
import type { SearchVideo } from "../_types/youtube.type";
import { extractLinks } from "../../converter/_utils/helpers";

/**
 * YouTube versi web: YouTube melarang situsnya ditanam (iframe youtube.com diblokir), jadi web memakai
 * pencarian sendiri (BE /api/youtube/search) + pemutar embed resmi. Fitur sama dengan app desktop:
 * cari → putar → "Tambah ke antrean". Tempel link langsung juga bisa.
 */
export default function WebYoutube() {
  const { t, f } = useT();
  const y = t.youtube;
  const { query, items, hasMore, loading, loadingMore, error, search, loadMore } = useYoutubeSearch();
  const { add, addVideo, busy } = useQuickAdd();
  const [input, setInput] = useState("");
  const [playing, setPlaying] = useState<SearchVideo | null>(null);

  // Hasil awal: pilihan cepat pertama
  useEffect(() => {
    void search(t.youtube.chips[0]);
    // hanya sekali saat halaman dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const links = extractLinks(input);
    // Link YouTube → langsung ke antrean; selain itu → cari
    if (links.length) {
      void add(links[0]).then(() => setInput(""));
      return;
    }
    void search(input);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={y.eyebrow} title={y.title} sub={y.sub} />

      <div className="flex flex-col gap-4">
        <form onSubmit={submit} className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{y.search}</span>
            <Search width={18} height={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden="true" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={y.placeholder}
              className="h-12 w-full rounded-full border border-line/70 bg-surface pl-11 pr-4 text-[15px] outline-none transition-colors placeholder:text-fg-3 focus:border-line-2"
            />
          </label>
          <Button type="submit" variant="primary" loading={busy} className="h-12 px-6">
            {y.search}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {y.chips.map((c) => {
            const on = c === query;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setInput("");
                  void search(c);
                }}
                aria-pressed={on}
                className={cn(
                  "ios-press h-9 cursor-pointer rounded-full px-4 text-[13.5px] font-medium transition-colors",
                  on ? "bg-fg text-bg" : "bg-fg/[0.07] text-fg-2 hover:bg-fg/[0.12] hover:text-fg",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
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
        {query && !loading && <h2 className="text-[15px] font-semibold text-fg-2">{f(items.length ? y.results : y.empty, { q: query })}</h2>}
        {error && <p className="text-[14px] text-err">{error}</p>}
        <ul className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-video w-full rounded" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </li>
              ))
            : items.map((v, i) => (
                <ResultCard
                  key={v.videoId}
                  video={v}
                  index={i}
                  active={playing?.videoId === v.videoId}
                  onPlay={() => {
                    setPlaying(v);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onAdd={() => addVideo(v)}
                />
              ))}
        </ul>
        {hasMore && !loading && (
          <Button variant="ghost" loading={loadingMore} onClick={loadMore} className="self-center">
            {y.loadMore}
          </Button>
        )}
      </section>
    </div>
  );
}

function ResultCard({ video, index, active, onPlay, onAdd }: { video: SearchVideo; index: number; active: boolean; onPlay: () => void; onAdd: () => void }) {
  const { t } = useT();
  const y = t.youtube;
  return (
    <li className="rise flex flex-col gap-3" style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}>
      <button
        type="button"
        onClick={onPlay}
        aria-label={`${y.play}: ${video.title}`}
        className={cn(
          "group relative aspect-video w-full cursor-pointer overflow-hidden rounded bg-raised transition-transform duration-150 active:scale-[0.98]",
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
        {video.duration != null && (
          <span className="absolute bottom-2 right-2 rounded-xs bg-black/75 px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-white">
            {formatDuration(video.duration)}
          </span>
        )}
      </button>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]" title={video.title}>
            {video.title}
          </p>
          <p className="mt-1 truncate text-[12.5px] text-fg-3">{[video.author, video.views, video.published].filter(Boolean).join(" · ")}</p>
        </div>
        <IconButton size="sm" label={y.add} icon={<Plus width={18} height={18} strokeWidth={2.2} />} onClick={onAdd} className="-mt-1 bg-fg/[0.07] hover:bg-fg/[0.12]" />
      </div>
    </li>
  );
}

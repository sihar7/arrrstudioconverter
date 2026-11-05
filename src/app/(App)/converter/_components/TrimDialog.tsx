"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Pause, Play, RefreshDouble, WarningTriangle } from "iconoir-react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { itemTrimmed, setTrimAsk, type QueueItem } from "@/store/slices/converterSlice";
import { previewPlayer } from "@/lib/previewPlayer";
import { robloxPlayback } from "@/lib/robloxPlayback";
import { loadWaveform, type Waveform } from "@/lib/waveform";
import { ApiError, cn, formatDuration, parseTime } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { Input } from "@/components/ui/Field";
import { fileUrl, trimFile } from "../_service/converter.service";

/**
 * Pangkas setelah convert. mode "ask" = muncul otomatis begitu lagu selesai (semua lagu yang selesai bersamaan
 * tampil sekaligus + "Jangan tanya lagi"); mode "edit" = satu lagu dari tombol gunting di antrean.
 * Waktu = waktu FILE (detik). Server memotong file hasil (tanpa token); baris yang tidak diubah tidak dikirim.
 */

const BARS = 96;
const STEP = 0.1;
const MIN_LEN = 1;
const EDGE = 0.05; // di bawah ini dianggap "tidak dipotong"
const FADE = { in: 0.3, out: 1.5 };
const END_PREVIEW = 4;

type Range = { start: number; end: number };
type RowState = { status: "idle" | "working" | "done" | "error"; error: string | null };

const fmt = (s: number) => {
  const whole = Math.floor(s);
  const tenth = Math.round((s - whole) * 10);
  return `${formatDuration(tenth === 10 ? whole + 1 : whole)}${tenth && tenth !== 10 ? `.${tenth}` : ""}`;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const snap = (v: number) => Math.round(v / STEP) * STEP;

export default function TrimDialog({ keys, mode, onClose }: { keys: string[]; mode: "ask" | "edit"; onClose: () => void }) {
  const { t, f } = useT();
  const tr = t.trimmer;
  const toast = useToast();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const restore = useAppSelector((s) => s.converter.robloxMode === "restore");
  // Item yang masih ada & sudah punya file (bisa terhapus saat dialog terbuka)
  const all = useAppSelector((s) => s.converter.items);
  const items = useMemo(() => keys.flatMap((k) => all.filter((i) => i.key === k && i.result)), [all, keys]);

  const [waves, setWaves] = useState<Record<string, Waveform | "error">>({});
  const [ranges, setRanges] = useState<Record<string, Range>>({});
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [fade, setFade] = useState(true);
  const [dontAsk, setDontAsk] = useState(false);
  const [working, setWorking] = useState(false);

  // Durasi presisi dari decode bila sudah ada; sebelum itu metadata (dibulatkan ke detik)
  const durOf = useCallback((i: QueueItem) => {
    const w = waves[i.key];
    return w && w !== "error" ? w.duration : (i.result?.duration ?? 0);
  }, [waves]);
  const rangeOf = (i: QueueItem): Range => ranges[i.key] ?? { start: 0, end: durOf(i) };
  const dirty = (i: QueueItem) => {
    const r = rangeOf(i);
    return r.start > EDGE || r.end < durOf(i) - EDGE;
  };

  // Decode gelombang satu per satu (hemat memori HP); dialog tertutup → hasil diabaikan
  const fileKey = items.map((i) => `${i.key}:${i.result!.fileId}`).join(",");
  useEffect(() => {
    let alive = true;
    void (async () => {
      for (const i of store.getState().converter.items.filter((x) => keys.includes(x.key) && x.result)) {
        if (!alive) return;
        const id = i.result!.fileId;
        try {
          const w = await loadWaveform(id, fileUrl(id), BARS);
          if (alive) setWaves((s) => ({ ...s, [i.key]: w }));
        } catch {
          if (alive) setWaves((s) => ({ ...s, [i.key]: "error" }));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [fileKey, keys, store]);

  // ---- Pemutar khusus dialog (satu Audio, dibuat sekali, dibersihkan saat tutup) ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopAt = useRef(0);
  const raf = useRef(0);
  const [play, setPlay] = useState<{ key: string; time: number } | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    audioRef.current?.pause();
    setPlay(null);
  }, []);
  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.preservesPitch = false;
    audioRef.current = a;
    const onEnd = () => stop();
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onEnd);
    return () => {
      cancelAnimationFrame(raf.current);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onEnd);
      a.pause();
      a.removeAttribute("src");
      a.load();
      audioRef.current = null;
    };
  }, [stop]);

  const playFrom = (i: QueueItem, from: number, to: number) => {
    const a = audioRef.current;
    if (!a || !i.result) return;
    if (play?.key === i.key && !a.paused) return stop();
    previewPlayer.pause();
    const src = fileUrl(i.result.fileId);
    if (!a.src.endsWith(src)) a.src = src;
    // Sama dengan preview antrean: mode "Balik ke asli" diputar dengan PlaybackSpeed game
    const pb = i.options && i.options.speed !== 1 ? robloxPlayback(i.options) : null;
    a.defaultPlaybackRate = a.playbackRate = restore && pb?.exact ? pb.restoreSpeed : 1;
    // Safari mengabaikan seek sebelum metadata terbaca → seek ulang begitu siap
    if (a.readyState < 1) a.addEventListener("loadedmetadata", () => (a.currentTime = from), { once: true });
    a.currentTime = from;
    stopAt.current = to;
    setPlay({ key: i.key, time: from });
    void a.play().catch(stop);
    let last = 0;
    const tick = (now: number) => {
      if (a.paused && a.readyState >= 3) return;
      if (a.currentTime >= stopAt.current) return stop();
      // Playhead ±20 fps — cukup halus, dialog dengan banyak gelombang tidak dirender tiap frame
      if (now - last > 50) {
        last = now;
        setPlay({ key: i.key, time: Math.max(from, a.currentTime) });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const setRange = (i: QueueItem, next: Partial<Range>) => {
    const dur = durOf(i);
    const cur = rangeOf(i);
    let { start, end } = { ...cur, ...next };
    start = clamp(snap(start), 0, Math.max(0, dur - MIN_LEN));
    end = clamp(snap(end), Math.min(dur, start + MIN_LEN), dur);
    if ("start" in next && end - start < MIN_LEN) end = Math.min(dur, start + MIN_LEN);
    if ("end" in next && end - start < MIN_LEN) start = Math.max(0, end - MIN_LEN);
    setRanges((s) => ({ ...s, [i.key]: { start, end } }));
    if (rows[i.key]?.status === "error") setRows((s) => ({ ...s, [i.key]: { status: "idle", error: null } }));
  };

  // Samakan: buang detik awal yang sama & detik akhir yang sama (lagu beda panjang tetap masuk akal)
  const applyAll = (src: QueueItem) => {
    const r = rangeOf(src);
    const head = r.start;
    const tail = durOf(src) - r.end;
    const next: Record<string, Range> = {};
    for (const i of items) {
      const dur = durOf(i);
      const start = clamp(snap(head), 0, Math.max(0, dur - MIN_LEN));
      next[i.key] = { start, end: clamp(snap(dur - tail), start + MIN_LEN, dur) };
    }
    setRanges((s) => ({ ...s, ...next }));
    toast(f(tr.appliedAll, { n: items.length }), "ok");
  };

  const changed = items.filter(dirty);

  const finish = () => {
    stop();
    if (mode === "ask" && dontAsk) dispatch(setTrimAsk(false));
    onClose();
  };

  const submit = async () => {
    if (!changed.length) return toast(tr.nothing, "info");
    setWorking(true);
    stop();
    let ok = 0;
    for (const i of changed) {
      const r = rangeOf(i);
      const dur = durOf(i);
      setRows((s) => ({ ...s, [i.key]: { status: "working", error: null } }));
      try {
        const { file } = await trimFile(i.result!.fileId, {
          start: Number(r.start.toFixed(2)),
          end: Number(r.end.toFixed(2)),
          fadeIn: fade && r.start > EDGE ? FADE.in : 0,
          fadeOut: fade && r.end < dur - EDGE ? FADE.out : 0,
          historyId: i.result!.historyId ?? undefined,
        });
        dispatch(itemTrimmed({ key: i.key, file }));
        setRows((s) => ({ ...s, [i.key]: { status: "done", error: null } }));
        // File baru → rentang & gelombang lama tidak berlaku lagi (gelombang dibaca ulang dari file terpangkas)
        setRanges((s) => {
          const { [i.key]: _drop, ...rest } = s;
          return rest;
        });
        setWaves((s) => {
          const { [i.key]: _drop, ...rest } = s;
          return rest;
        });
        ok++;
      } catch (e) {
        const error = e instanceof ApiError ? e.message : String(e);
        setRows((s) => ({ ...s, [i.key]: { status: "error", error } }));
        toast(f(tr.failed, { title: i.title, error }), "err");
      }
    }
    setWorking(false);
    if (ok) toast(f(tr.done, { n: ok }), "ok");
    if (ok === changed.length) finish();
  };

  const many = items.length > 1;
  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      {mode === "ask" ? (
        <label className="flex min-w-0 cursor-pointer items-center gap-2.5 text-[13px] text-fg-2">
          <input type="checkbox" className="trim-check" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
          <span>
            {tr.dontAsk}
            <span className="block text-[11.5px] text-fg-3">{tr.dontAskHint}</span>
          </span>
        </label>
      ) : (
        <span />
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="subtle" onClick={finish} disabled={working}>
          {mode === "ask" ? tr.skip : tr.cancel}
        </Button>
        <Button variant="primary" loading={working} disabled={!changed.length} onClick={() => void submit()}>
          {working ? tr.working : many ? f(tr.apply, { n: changed.length }) : tr.applyOne}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      open
      onClose={() => !working && finish()}
      title={mode === "ask" ? tr.askTitle : tr.editTitle}
      sub={mode === "ask" ? tr.askSub : tr.editSub}
      footer={footer}
      width="max-w-[760px]"
    >
      <div className="flex flex-col gap-5">
        <Switch label={tr.fade} hint={tr.fadeHint} checked={fade} onChange={setFade} />
        <ol className="flex flex-col gap-3">
          {items.map((i) => {
            const dur = durOf(i);
            const r = rangeOf(i);
            const w = waves[i.key];
            const row = rows[i.key];
            const isPlaying = play?.key === i.key;
            return (
              <li key={i.key} className="rounded-[14px] bg-fg/[0.04] p-3.5 sm:p-4" aria-busy={row?.status === "working" || undefined}>
                <div className="flex items-center gap-3">
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-[8px] bg-raised">
                    {(i.cover || i.thumbnail) && <Image src={i.cover || i.thumbnail} alt="" fill sizes="40px" unoptimized className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold" title={i.title}>
                      {i.title}
                    </p>
                    <p className="font-mono text-[12px] tabular-nums text-fg-3">
                      {dirty(i) ? f(tr.result, { len: fmt(r.end - r.start), total: fmt(dur) }) : f(tr.untouched, { total: fmt(dur) })}
                    </p>
                  </div>
                  {row?.status === "done" && <span className="text-[12px] font-semibold text-ok">{tr.trimmed}</span>}
                </div>

                <TrimTrack
                  label={f(tr.region, { title: i.title })}
                  startLabel={tr.start}
                  endLabel={tr.end}
                  wave={w}
                  loadingText={tr.waveLoading}
                  duration={dur}
                  range={r}
                  playhead={isPlaying ? play!.time : null}
                  disabled={working}
                  onChange={(next) => setRange(i, next)}
                />

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <TimeBox label={tr.start} value={r.start} invalidText={tr.invalid} disabled={working} onCommit={(start) => setRange(i, { start })} />
                  <TimeBox label={tr.end} value={r.end} invalidText={tr.invalid} disabled={working} onCommit={(end) => setRange(i, { end })} />
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={isPlaying ? <Pause /> : <Play />}
                      onClick={() => playFrom(i, r.start, r.end)}
                      aria-pressed={isPlaying}
                    >
                      {isPlaying ? tr.stop : tr.playCut}
                    </Button>
                    <Button size="sm" variant="subtle" onClick={() => playFrom(i, Math.max(r.start, r.end - END_PREVIEW), r.end)} disabled={isPlaying}>
                      {tr.playEnd}
                    </Button>
                    {many && (
                      <Button size="sm" variant="subtle" icon={<RefreshDouble />} onClick={() => applyAll(i)} disabled={working}>
                        {tr.applyAll}
                      </Button>
                    )}
                  </div>
                </div>
                {row?.status === "error" && (
                  <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12.5px] text-err">
                    <WarningTriangle width={14} height={14} className="mt-px shrink-0" /> {row.error}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Dialog>
  );
}

/** Kolom waktu m:ss(.d); di-commit saat blur / Enter; nilai luar dari slider menyinkronkan teks */
function TimeBox({ label, value, invalidText, disabled, onCommit }: { label: string; value: number; invalidText: string; disabled?: boolean; onCommit: (v: number) => void }) {
  const [text, setText] = useState(fmt(value));
  const [err, setErr] = useState(false);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(fmt(value));
    setErr(false);
  }
  const commit = () => {
    const v = parseTime(text);
    if (v == null || Number.isNaN(v)) return setErr(true);
    setErr(false);
    onCommit(v);
  };
  return (
    <label className="flex w-[104px] flex-col gap-1">
      <span className="text-[12px] font-semibold text-fg-2">{label}</span>
      <Input
        inputMode="decimal"
        value={text}
        disabled={disabled}
        aria-invalid={err}
        title={err ? invalidText : undefined}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-10 px-3 text-center font-mono text-[14px] tabular-nums desk:h-8"
      />
    </label>
  );
}

/**
 * Lintasan pangkas: gelombang asli + area di luar rentang diredupkan + dua pegangan.
 * Pegangan = dua <input type=range> bertumpuk (keyboard & pembaca layar native, area sentuh 32px), visual digambar terpisah.
 */
function TrimTrack({
  label,
  startLabel,
  endLabel,
  wave,
  loadingText,
  duration,
  range,
  playhead,
  disabled,
  onChange,
}: {
  label: string;
  startLabel: string;
  endLabel: string;
  wave: Waveform | "error" | undefined;
  loadingText: string;
  duration: number;
  range: Range;
  playhead: number | null;
  disabled?: boolean;
  onChange: (r: Partial<Range>) => void;
}) {
  const max = Math.max(duration, MIN_LEN);
  const a = (range.start / max) * 100;
  const b = (range.end / max) * 100;
  const peaks = wave && wave !== "error" ? wave.peaks : null;
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("trim-track relative mt-3 h-[68px] select-none overflow-hidden rounded-[10px] bg-fg/[0.05]", disabled && "opacity-60")}
      style={{ "--a": `${a}%`, "--b": `${b}%` } as CSSProperties}
    >
      {peaks ? (
        <div className="absolute inset-x-1 inset-y-2 flex items-center gap-px" aria-hidden="true">
          {peaks.map((p, n) => {
            const at = ((n + 0.5) / peaks.length) * 100;
            const inside = at >= a && at <= b;
            return (
              <i
                key={n}
                className={cn("block min-w-0 flex-1 rounded-full transition-colors duration-150", inside ? "bg-fg/70" : "bg-fg/15")}
                style={{ height: `${Math.max(6, p * 100)}%` }}
              />
            );
          })}
        </div>
      ) : (
        <p className="absolute inset-0 grid place-items-center text-[12px] text-fg-3" aria-hidden="true">
          {wave === "error" ? "" : loadingText}
        </p>
      )}
      {/* Area yang dibuang */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[var(--a)] bg-bg/55" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[calc(100%-var(--b))] bg-bg/55" />
      {/* Bingkai rentang + pegangan */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[var(--a)] right-[calc(100%-var(--b))] border-y-2 border-accent" />
      <span aria-hidden="true" className="trim-handle trim-handle--start pointer-events-none absolute inset-y-0 left-[var(--a)]" />
      <span aria-hidden="true" className="trim-handle trim-handle--end pointer-events-none absolute inset-y-0 left-[var(--b)]" />
      {playhead != null && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-1 w-0.5 rounded-full bg-[var(--ios-green)]" style={{ left: `${(playhead / max) * 100}%` }} />
      )}
      <input
        type="range"
        className="trim-range trim-range--start"
        min={0}
        max={max}
        step={STEP}
        value={range.start}
        disabled={disabled}
        aria-label={`${label} · ${startLabel}`}
        aria-valuetext={fmt(range.start)}
        onChange={(e) => onChange({ start: Number(e.target.value) })}
      />
      <input
        type="range"
        className="trim-range trim-range--end"
        min={0}
        max={max}
        step={STEP}
        value={range.end}
        disabled={disabled}
        aria-label={`${label} · ${endLabel}`}
        aria-valuetext={fmt(range.end)}
        onChange={(e) => onChange({ end: Number(e.target.value) })}
      />
    </div>
  );
}

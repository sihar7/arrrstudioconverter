// Gelombang ASLI file hasil (bukan hiasan): decode sekali lewat OfflineAudioContext (tanpa perangkat audio),
// diringkas jadi N puncak lalu buffer PCM dilepas. Cache per fileId (maks CACHE_MAX, FIFO) → buka-tutup dialog tidak decode ulang.

export interface Waveform {
  peaks: number[];
  /** durasi file yang sebenarnya (detik, presisi), lebih akurat dari metadata yang dibulatkan */
  duration: number;
}

const CACHE_MAX = 24;
const cache = new Map<string, Waveform>();
const inflight = new Map<string, Promise<Waveform>>();

function summarize(buf: AudioBuffer, bars: number): number[] {
  const chans = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i));
  const per = Math.max(1, Math.floor(buf.length / bars));
  // Lompat sampel (stride) — cukup akurat untuk puncak visual, 8× lebih cepat dari membaca semua
  const stride = Math.max(1, Math.floor(per / 2048));
  const out = new Array<number>(bars).fill(0);
  let max = 0;
  for (let b = 0; b < bars; b++) {
    let peak = 0;
    const from = b * per;
    const to = Math.min(buf.length, from + per);
    for (const ch of chans) for (let i = from; i < to; i += stride) peak = Math.max(peak, Math.abs(ch[i]));
    out[b] = peak;
    max = Math.max(max, peak);
  }
  return max > 0 ? out.map((v) => v / max) : out;
}

export function loadWaveform(key: string, url: string, bars: number): Promise<Waveform> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(key);
  if (running) return running;
  const p = (async () => {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.arrayBuffer();
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const buf = await ctx.decodeAudioData(data);
    const wave = { peaks: summarize(buf, bars), duration: buf.duration };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, wave);
    return wave;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

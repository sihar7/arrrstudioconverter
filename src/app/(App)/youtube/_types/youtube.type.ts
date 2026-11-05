import type { VideoInfo } from "@/type/converter";

/** Satu hasil pencarian YouTube (BE /api/youtube/search) */
export interface SearchVideo extends VideoInfo {
  views: string;
  published: string;
}

/** Filter pencarian (sama dengan menu Filter youtube.com; YouTube kini hanya mengurutkan relevansi / populer) */
export interface SearchFilters {
  duration: "any" | "short" | "medium" | "long";
  upload: "any" | "hour" | "today" | "week" | "month" | "year";
  sort: "relevance" | "views";
  /** Versi lagu: ditambahkan ke kata kunci (YouTube tidak punya filter ini), tidak dikirim sebagai parameter BE */
  version: SearchVersion;
}

export type SearchVersion = "all" | "original" | "cover" | "remix" | "acoustic" | "live" | "karaoke" | "instrumental";

/** Kata kunci tambahan per versi */
export const VERSION_TERMS: Record<SearchVersion, string> = {
  all: "",
  original: "official audio",
  cover: "cover",
  remix: "remix",
  acoustic: "acoustic",
  live: "live",
  karaoke: "karaoke",
  instrumental: "instrumental",
};

/**
 * Saring judul per versi: YouTube sering mengabaikan kata kunci tambahan (apalagi saat diurutkan "Terbanyak ditonton"),
 * jadi hasil dicek ulang di sisi klien. exclude = versi "Original" membuang cover/remix/dll.
 */
export const VERSION_MATCH: Record<SearchVersion, { re: RegExp; exclude?: boolean } | null> = {
  all: null,
  original: { re: /\bcover|remix|karaoke|instrumental|\blive\b|sped ?up|slowed|nightcore|acoustic|akustik|\b8d\b|bootleg/i, exclude: true },
  cover: { re: /\bcover(s|ed)?\b|\bcvr\b/i },
  remix: { re: /remix|bootleg|\bflip\b|\bvip\b|\bdj\b|\bmashup\b/i },
  acoustic: { re: /acoustic|akustik|unplugged|piano version|guitar version/i },
  live: { re: /\blive\b|concert|konser|\bsession\b/i },
  karaoke: { re: /karaoke|minus ?one|sing ?along|tanpa vokal/i },
  instrumental: { re: /instrumental|\binst\b|backing track|minus ?one/i },
};

export const matchesVersion = (title: string, v: SearchVersion) => {
  const m = VERSION_MATCH[v];
  return !m || m.re.test(title) !== Boolean(m.exclude);
};

export const DEFAULT_FILTERS: SearchFilters = { duration: "any", upload: "any", sort: "relevance", version: "all" };

export interface SearchResponse {
  items: SearchVideo[];
  /** token halaman berikutnya; null = habis */
  continuation: string | null;
}

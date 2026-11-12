// Penyaring teks sebelum dikirim ke Roblox (nama & deskripsi aset audio / decal).
// File ini IDENTIK di repo web & backend: web memakainya untuk pratinjau nama, server menegakkannya lagi di
// /api/roblox/upload & /api/roblox/decal (klien tidak dipercaya).
//
// Latar: 2026-11-12 akun user kena suspend 1 hari (Privacy: Giving PII) karena cover otomatis menulis nama orang +
// kata kasar ("DJ SO ASU NAYKILLA"). Cover kini tanpa teks (lib/trackMeta); nama aset tetap disaring di sini:
// kata kasar / seksual / narkoba (ID + EN, termasuk ejaan leet "s3x", "k0nt0l", huruf diulang "fuuuck") dan data
// pribadi (email, nomor telepon, link, @handle) dibuang.

/** Kata yang dibuang bila SAMA PERSIS (setelah dinormalisasi) — kata pendek yang juga potongan kata wajar */
const EXACT = [
  // EN
  "ass", "asses", "arse", "dick", "dicks", "cock", "cocks", "cum", "cumming", "tit", "tits", "titty", "titties", "boob", "boobs",
  "hoe", "hoes", "thot", "slut", "sluts", "whore", "whores", "cunt", "cunts", "pussy", "pussies", "bitch", "bitches", "bastard",
  "shit", "shitty", "bullshit", "sex", "sexy", "sexx", "nude", "nudes", "naked", "nsfw", "xxx", "anal", "milf", "dildo", "bdsm",
  "fetish", "erotic", "erotica", "orgasm", "penis", "vagina", "rape", "raped", "rapist", "nigga", "niggas", "nigger", "fag", "fags",
  "faggot", "retard", "retarded", "wtf", "stfu", "lmfao", "weed", "cocaine", "meth", "heroin", "marijuana", "kush", "lsd",
  "ecstasy", "stoned", "twerk", "twerking", "stripper", "strippers", "onlyfans", "hentai", "ahegao", "horny", "kinky",
  "booty", "thicc", 
  // ID / daerah
  "asu", "asw", "anjing", "anjeng", "anjink", "njing", "anjir", "anjrit", "babi", "bangsat", "bajingan", "kampret", "keparat",
  "brengsek", "bacot", "tolol", "goblok", "goblog", "bego", "tai", "taik", "tahi", "kontol", "kntl", "memek", "mmk",
  "pepek", "peler", "titit", "toket", "jembut", "ngentot", "ngewe", "ewe", "entot", "entod", "ngentod", "bokep", "colmek",
  "coli", "sange", "sangean", "birahi", "mesum", "cabul", "bugil", "telanjang", "desah", "desahan", "lonte", "pelacur", "jablay",
  "perek", "jancok", "jancuk", "dancok", "cok", "cuk", "jamput", "pukimak", "kimak", "puki", "kenthu", "ngaceng", "ngacengan",
  "banci", "bencong", "pantat", "sempak", "pentil", "nenen", "ganja", "sabu", "narkoba", "mabok", "mabuk", "ciu", "miras",
  "perkosa", "diperkosa", "bispak", "open bo", "openbo", "pecun",
];

/** Akar kata: kata yang DIAWALI ini juga dibuang (kata turunan: "fucking", "ngentotin", "pornhub") */
const ROOTS = [
  "fuck", "fuk", "motherf", "porn", "bokep", "ngentot", "ngentod", "kontol", "memek", "jancok", "jancuk", "pukimak",
  "masturb", "blowjob", "handjob", "deepthroat", "creampie", "sexting", "sexual", "seksual", "seksi", "telanjang", "bitch",
  "nigg", "faggot", "horni", "sange", "colmek", "lonte", "pelacur", "pemerkosa", "perkosa",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", $: "s", "!": "i", "|": "i" };

/** Bentuk pembanding: huruf kecil, tanpa aksen, leet → huruf, huruf yang diulang dirapatkan ("fuuuck" → "fuck") */
function norm(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[0-9@$!|]/g, (c) => LEET[c] ?? c)
    .replace(/[^\p{L}]/gu, "")
    .replace(/(\p{L})\1+/gu, "$1");
}

const EXACT_SET = new Set(EXACT.filter((w) => !w.includes(" ")).map(norm));
const PHRASES = EXACT.filter((w) => w.includes(" ")).map((w) => w.split(" ").map(norm));
const ROOT_LIST = ROOTS.map(norm);

/** Kata ini tidak pantas untuk Roblox */
export function isBadWord(word: string): boolean {
  // Dua bentuk: utuh ("a$$", "s3x") dan tanpa tanda baca di ujung ("asu!" → bukan "asui")
  const trimmed = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  return [norm(word), norm(trimmed)].some((n) => n.length >= 2 && (EXACT_SET.has(n) || ROOT_LIST.some((r) => n.startsWith(r))));
}

// Data pribadi: email, nomor telepon (≥ 8 digit, boleh berpemisah), link & domain, @handle media sosial
const PII = [
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  /(?:\+62|\b62|\b0)8\d(?:[\s.-]?\d){6,11}\b/g,
  /\b\d{10,}\b/g,
  /\b(?:https?:\/\/|www\.)\S+/gi,
  /\b[\w-]+\.(?:com|net|org|id|co|io|me|gg|xyz|tv|ly)\b\S*/gi,
  /(?:^|\s)@[\w.]{2,}/g,
];

export interface SafeText {
  text: string;
  /** ada yang dibuang (kata kasar / data pribadi) */
  changed: boolean;
}

/** Buang data pribadi & kata tidak pantas dari teks bebas; spasi & tanda pemisah dirapikan */
export function safeText(input: string): SafeText {
  let text = input;
  for (const re of PII) text = text.replace(re, " ");
  // Token = kata + pemisah, supaya tanda baca & huruf non-latin tetap utuh
  const tokens = text.split(/(\s+)/);
  const words = tokens.map((t, i) => (i % 2 === 0 ? t : null));
  // Frasa dua kata (mis. "open bo")
  for (let i = 0; i < words.length; i += 2) {
    for (const ph of PHRASES) {
      if (ph.every((p, k) => words[i + k * 2] != null && norm(words[i + k * 2]!) === p)) ph.forEach((_, k) => (tokens[i + k * 2] = ""));
    }
  }
  for (let i = 0; i < tokens.length; i += 2) {
    const tok = tokens[i];
    if (!tok) continue;
    // "DJ-Asu" / "anjing!" → periksa per bagian yang dipisah tanda baca
    const parts = tok.split(/([^\p{L}\p{N}@$!|]+)/u);
    let cut = false;
    const kept = parts.map((p, k) => (k % 2 === 0 && isBadWord(p) ? ((cut = true), "") : p)).join("");
    // Bagian dibuang → tanda pemisah yang tersisa di ujung ikut dibuang ("DJ-Asu!" → "DJ")
    tokens[i] = cut ? kept.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") : kept;
  }
  const out = tokens
    .join("")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s+([-–—:|,.])(?=\s*(?:[-–—:|,.]|$))/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–—:|,._ ]+|[-–—:|,._ ]+$/g, "")
    .trim();
  return { text: out, changed: out !== input.replace(/\s+/g, " ").trim() };
}

/** Nama aset yang aman (maks `max` karakter); kosong setelah disaring → `fallback` */
export function safeName(input: string, fallback = "Audio", max = 50): string {
  const t = safeText(input).text.slice(0, max).trim();
  return t || fallback;
}

/** Teks memuat kata tidak pantas / data pribadi */
export const isUnsafe = (input: string) => safeText(input).changed;

// Kategori/genre lagu untuk ekspor & Riwayat. Dua sumber:
// 1. Kata kunci judul + artis (lokal, tanpa request) — menang untuk genre regional/scene yang tidak dikenal katalog
//    (Jawa, Funkot, Breakbeat, Indobounce, Phonk…): katalog sering melabeli "Pop"/"Dangdut" untuk lagu Jawa.
// 2. Genre katalog iTunes (primaryGenreName) dipetakan ke daftar kategori yang sama.

/** Kategori kanonik (nama sama di semua bahasa) */
export const GENRES = [
  "Jawa",
  "Sunda",
  "Dangdut",
  "Funkot",
  "Breakbeat",
  "Indobounce",
  "DJ Remix",
  "Phonk",
  "Amapiano",
  "Nightcore",
  "Slowed",
  "Lofi",
  "RnB",
  "Hip-Hop",
  "K-Pop",
  "J-Pop",
  "Pop",
  "Rock",
  "Metal",
  "EDM",
  "House",
  "Techno",
  "Dubstep",
  "Reggae",
  "Latin",
  "Jazz",
  "Klasik",
  "Religi",
  "Soundtrack",
] as const;
export type Genre = (typeof GENRES)[number];

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}&]+/gu, " ")
    .trim()} `;

// Urutan = prioritas: identitas regional/scene dulu, genre umum, lalu gaya olahan (nightcore/slowed/remix) paling akhir.
// Pola dicocokkan pada teks ternormalisasi berbatas spasi. Nama artis pendek/umum sengaja tidak dipakai (salah cocok).
const JAWA_ARTISTS =
  "didi kempot|denny caknan|happy asmara|ndx ?a ?k ?a|guyon waton|ndarboy|via vallen|nella kharisma|shepin misa|esa risty|" +
  "yeni inka|safira inema|niken salindry|sasya arkhisna|dory harsa|cak percil|aftershine|om wawes|suliyana|demy yoga|" +
  "pendhoza|woro widowati|lusiana safara|ilux id|gilga sahid|tasya rosmala|vita alvia";
const RULES: [Genre, RegExp][] = [
  ["Jawa", new RegExp(` (jawa|javanese|koplo|campursari|cursari|langgam|gamelan|jaranan|banyuwangi|osing|tarling|sragenan|${JAWA_ARTISTS}) `)],
  ["Sunda", / (sunda|sundanese|jaipong|degung|darso|doel sumbang|kacapi) /],
  ["Dangdut", / (dangdut|rhoma irama|elvy sukaesih|evie tamala|ikke nurjanah|rita sugiarto|meggy z|iis dahlia) /],
  ["Funkot", / (funkot|funky ?kota|house ?funky|hardfunk) /],
  ["Indobounce", / (indo ?bounce|bounce ?indo) /],
  ["Breakbeat", / (breakbeat|break ?beat|breaklatin|dutch ?break) /],
  ["Phonk", / (phonk|brazilian ?funk|funk ?brasil|montagem) /],
  ["Amapiano", / amapiano /],
  ["K-Pop", / (kpop|k pop|bts|blackpink|twice|newjeans|stray kids|seventeen|aespa|le sserafim|exo|enhypen|itzy|red velvet|nct) /],
  ["J-Pop", / (jpop|j pop|anime|yoasobi|kenshi yonezu|aimer|official hige dandism|king gnu|radwimps) /],
  ["Religi", / (sholawat|shalawat|salawat|qasidah|nasyid|religi|islami|worship|rohani|gospel|hymn) /],
  ["Metal", / (metal|metalcore|deathcore|djent|thrash|slipknot|metallica|bring me the horizon|avenged sevenfold) /],
  ["Dubstep", / (dubstep|riddim|brostep|skrillex) /],
  ["Techno", / (techno|hardstyle|hard techno|trance|psytrance) /],
  ["House", / (house|deep house|tech house|future house) /],
  ["EDM", / (edm|electro|drum and bass|dnb|future bass|big room|alan walker|marshmello) /],
  ["RnB", / (rnb|r&b|r n b|neo soul|soul|sza|the weeknd|frank ocean|daniel caesar|giveon|brent faiyaz) /],
  ["Hip-Hop", / (hip hop|hiphop|rap|trap|drill|boom bap|drake|kendrick lamar|travis scott|eminem) /],
  ["Reggae", / (reggae|ska|bob marley) /],
  ["Latin", / (reggaeton|latin|bachata|salsa|cumbia|bad bunny|j balvin|karol g) /],
  ["Jazz", / (jazz|bossa nova|smooth jazz) /],
  ["Klasik", / (classical|klasik|orchestra|orkestra|symphony|mozart|beethoven|chopin) /],
  ["Lofi", / (lofi|lo fi|chillhop) /],
  ["Soundtrack", / (ost|soundtrack|original score|theme song) /],
  ["Rock", / (rock|punk|grunge|pop punk) /],
  ["Nightcore", / nightcore /],
  ["Slowed", / (slowed|slow ?reverb|reverb ?slowed) /],
  ["DJ Remix", / (dj|remix|jedag jedug|jungle dutch|mashup|full bass) /],
];

/** Tebak kategori dari judul (+ artis). null = tidak ada petunjuk */
export function guessGenre(title: string | null | undefined, artist?: string | null): Genre | null {
  const text = norm(`${title ?? ""} ${artist ?? ""}`);
  if (text.trim() === "") return null;
  for (const [g, re] of RULES) if (re.test(text)) return g;
  return null;
}

// primaryGenreName iTunes (EN/ID store) → kategori
const ITUNES_MAP: [RegExp, Genre][] = [
  [/r&b|soul/i, "RnB"],
  [/hip-?hop|rap/i, "Hip-Hop"],
  [/k-?pop/i, "K-Pop"],
  [/j-?pop|anime/i, "J-Pop"],
  [/dangdut/i, "Dangdut"],
  [/metal/i, "Metal"],
  [/rock|alternative|punk/i, "Rock"],
  [/dance|electronic|electronica/i, "EDM"],
  [/house/i, "House"],
  [/techno|trance/i, "Techno"],
  [/dubstep/i, "Dubstep"],
  [/reggae/i, "Reggae"],
  [/latin|reggaeton|urbano/i, "Latin"],
  [/jazz|blues/i, "Jazz"],
  [/classical/i, "Klasik"],
  [/christian|gospel|religious|inspirational/i, "Religi"],
  [/soundtrack/i, "Soundtrack"],
  [/pop|singer|indonesia|world|asia/i, "Pop"],
];

export function genreFromCatalog(name: string | null | undefined): Genre | null {
  if (!name) return null;
  for (const [re, g] of ITUNES_MAP) if (re.test(name)) return g;
  return null;
}

/** Gabungan: petunjuk judul/artis dulu (lebih spesifik), lalu genre katalog */
export function resolveGenre(title: string | null | undefined, artist: string | null | undefined, catalog?: string | null): Genre | null {
  return guessGenre(title, artist) ?? genreFromCatalog(catalog);
}

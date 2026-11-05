import type { Lang } from "@/utils/i18n";

/**
 * Update log untuk user ("Apa yang baru"). Entri TERBARU DI ATAS; `id` unik & tidak pernah diubah —
 * kartu di deck toast muncul sekali per perangkat setiap ada id teratas yang belum dilihat.
 * Tulis untuk user awam: apa yang berubah + apa yang perlu mereka lakukan, tanpa istilah teknis berlebihan.
 */
export interface ChangelogEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  text: Record<Lang, { title: string; body: string[] }>;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "2026-11-05-youtube-filters-bypass-treble",
    date: "2026-11-05",
    text: {
      id: {
        title: "YouTube: cari cover & yang terbanyak ditonton",
        body: [
          "Di halaman YouTube ada pilihan Versi: Original, Cover, Remix, Akustik, Live, Karaoke, dan Instrumental. Yang muncul hanya lagu dengan versi itu.",
          "Urutkan dengan \"Terbanyak ditonton\": hasilnya diberi nomor peringkat dan jumlah tontonannya terlihat.",
          "Ada pilihan cepat baru, \"Lagu barat viral\".",
          "Roblox Bypass sekarang lebih jernih saat diputar di game atau di sini. Treble yang dulu hilang sudah kembali. Lagu lama perlu di-convert ulang.",
        ],
      },
      en: {
        title: "YouTube: find covers & the most viewed",
        body: [
          "The YouTube page has a Version picker: Original, Cover, Remix, Acoustic, Live, Karaoke, and Instrumental. Only songs of that version are shown.",
          "Sort by \"Most viewed\" to see results ranked, with their view counts.",
          "New quick pick: \"Western viral hits\".",
          "Roblox Bypass now sounds clearer when played in game or here, with the lost treble back. Convert older songs again to get it.",
        ],
      },
    },
  },
  {
    id: "2026-11-05-trim-after-convert",
    date: "2026-11-05",
    text: {
      id: {
        title: "Baru: pangkas lagu setelah convert",
        body: [
          "Begitu lagu selesai di-convert, kamu ditanya mau dipangkas atau tidak. Geser kedua ujung di gelombang lagunya, lalu dengarkan dulu sebelum dipotong.",
          "Beberapa lagu yang selesai bersamaan bisa dipangkas sekaligus. Tombol \"Samakan ke semua\" membuang detik awal dan akhir yang sama dari tiap lagu.",
          "Satu lagu juga bisa dipangkas kapan saja lewat tombol gunting di antrean. Memangkas tidak memakai token.",
          "Tidak mau ditanya terus? Centang \"Jangan tanya lagi\". Pertanyaannya bisa dinyalakan lagi di tab Trim.",
        ],
      },
      en: {
        title: "New: trim songs after converting",
        body: [
          "When a song finishes converting, you're asked whether to trim it. Drag both ends on the song's waveform and listen before cutting.",
          "Songs that finish together can be trimmed in one go. \"Apply to all\" removes the same seconds from the start and end of each song.",
          "You can also trim any song anytime from the scissors button in the queue. Trimming doesn't use tokens.",
          "Don't want to be asked every time? Tick \"Don't ask again\". You can turn it back on in the Trim tab.",
        ],
      },
    },
  },
  {
    id: "2026-11-05-roblox-bypass-1.4",
    date: "2026-11-05",
    text: {
      id: {
        title: "Roblox Bypass sekarang 1.4×",
        body: [
          "Preset Roblox Bypass mempercepat lagu 1.4× (sebelumnya 1.25×), jadi lagu lebih berbeda dari aslinya waktu dicek Roblox.",
          "Supaya di game terdengar seperti lagu asli, isi PlaybackSpeed di Sound dengan 0.7143. Angkanya juga ada di pop-up preset dan bisa disalin.",
          "Lagu lama yang dibuat dengan 1.25× tetap pakai 0.8. Lagu baru pakai 0.7143.",
          "Plan Free sekarang bisa mengatur kecepatan sampai 1.4×.",
        ],
      },
      en: {
        title: "Roblox Bypass is now 1.4×",
        body: [
          "The Roblox Bypass preset now speeds songs up 1.4× (was 1.25×), so they differ more from the original when Roblox checks them.",
          "To make it sound like the original in-game, set the Sound's PlaybackSpeed to 0.7143. The number is also in the preset pop-up, ready to copy.",
          "Older songs made at 1.25× still use 0.8. New songs use 0.7143.",
          "The Free plan can now set speed up to 1.4×.",
        ],
      },
    },
  },
];

export const LATEST_CHANGE = CHANGELOG[0];

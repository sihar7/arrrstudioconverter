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
    id: "2026-11-13-library-bulk-restore",
    date: "2026-11-13",
    text: {
      id: {
        title: "Pulihkan audio arsip sekaligus",
        body: [
          "Audio saya › tab Arsip › Pilih → tandai banyak audio (atau ketuk Disetujui untuk memilih semua yang lolos) → tekan Pulihkan. Audio kembali aktif dan bisa diputar lagi di game.",
        ],
      },
      en: {
        title: "Restore archived audio in bulk",
        body: [
          "My audio › Archived tab › Select → mark many audio (or tap Approved to pick every approved one) → press Restore. They become active and play in games again.",
        ],
      },
    },
  },
  {
    id: "2026-11-12-history-reupload",
    date: "2026-11-12",
    text: {
      id: {
        title: "Upload massal & upload ulang dari Riwayat",
        body: [
          "Riwayat › Pilih → tandai banyak lagu (atau ketuk Belum diupload / Gagal) → tekan Upload. Atur nama, creator, izin, dan cover sekali untuk semua, lalu lagu diupload berurutan dengan progres. Bisa dihentikan kapan saja.",
          "Audio yang Gagal / Ditolak Roblox kini punya tombol Upload ulang — selama filenya belum kedaluwarsa. Hasilnya ID baru.",
        ],
      },
      en: {
        title: "Bulk upload & re-upload from History",
        body: [
          "History › Select → mark many songs (or tap Not uploaded / Failed) → press Upload. Set name, creator, access and cover once for all, then songs upload in order with progress. You can stop any time.",
          "Audio that Failed / was Rejected by Roblox now has a Re-upload button — as long as the file hasn't expired. You get a new ID.",
        ],
      },
    },
  },
  {
    id: "2026-11-12-import-safe-cover",
    date: "2026-11-12",
    text: {
      id: {
        title: "Impor CSV / Excel + cover lebih aman",
        body: [
          "Plan Pro ke atas: tekan Impor file di Converter, pilih CSV / Excel / TXT berisi judul lagu atau link. Lagu dicari otomatis, dipangkas sedikit, lalu diupload ke Roblox berurutan per gelombang (mis. 10 aman semua, baru 10 berikutnya).",
          "Cover otomatis sekarang TANPA tulisan, nama orang, atau wajah — nama di gambar bisa dianggap data pribadi oleh Roblox. Pilihan cover asli dihapus.",
          "Kata kasar, kata dewasa, nomor HP, dan email otomatis dibuang dari nama aset sebelum diupload.",
          "Riwayat bisa dihapus total lewat tombol Hapus semua.",
          "Riwayat › Atur izin kini bisa ke Komunitas (grup), dan bisa untuk banyak audio sekaligus lewat mode Pilih.",
        ],
      },
      en: {
        title: "CSV / Excel import + safer covers",
        body: [
          "Pro plan and up: press Import file in the Converter and pick a CSV / Excel / TXT with song titles or links. Songs are found automatically, trimmed a little, then uploaded to Roblox in waves (e.g. 10 all safe, then the next 10).",
          "Auto covers now have NO text, names, or faces — Roblox can treat names in images as personal info. The original-cover option is gone.",
          "Swear words, adult words, phone numbers, and emails are removed from asset names before upload.",
          "History can be wiped completely with the Delete all button.",
          "History › Set access now supports Community (group), and many audios at once via Select mode.",
        ],
      },
    },
  },
  {
    id: "2026-11-05-spoof-open-use",
    date: "2026-11-05",
    text: {
      id: {
        title: "Spoof: jadikan gambar & mesh publik",
        body: [
          "Di Spoof › Beri akses ada tujuan baru: Publik. Gambar, decal, dan mesh milikmu jadi bisa dipakai game dan komunitas mana pun tanpa izin.",
          "Tempel saja teks yang berisi ID, misalnya isi Config atau README. ID-nya diambil otomatis.",
          "Ini permanen, jadi akan ada konfirmasi dulu. Audio, animasi, dan model tidak bisa dijadikan publik.",
          "API key perlu izin asset-permissions:write.",
        ],
      },
      en: {
        title: "Spoof: make images & meshes public",
        body: [
          "Spoof › Grant access has a new target: Public. Your images, decals, and meshes can then be used by any game or community without permission.",
          "Just paste any text that contains IDs, like a Config or README. The IDs are picked up automatically.",
          "This is permanent, so you'll be asked to confirm first. Audio, animations, and models can't be made public.",
          "Your API key needs the asset-permissions:write permission.",
        ],
      },
    },
  },
  {
    id: "2026-11-05-youtube-foryou-library",
    date: "2026-11-05",
    text: {
      id: {
        title: "YouTube: Untukmu, Riwayat & Tonton nanti",
        body: [
          "Untukmu: rekomendasi lagu otomatis dari lagu yang kamu putar, tambahkan, dan convert. Langsung terbuka saat kamu kembali ke halaman YouTube.",
          "Riwayat: semua lagu yang pernah kamu putar, dikelompokkan per hari. Bisa dihapus satu per satu atau semuanya.",
          "Tonton nanti: klik ikon simpan di kartu lagu atau di pemutar untuk menyimpannya.",
          "Pemutar kini punya daftar Berikutnya dan tombol salin link. Pencarian terakhir muncul di kotak cari.",
        ],
      },
      en: {
        title: "YouTube: For you, History & Watch later",
        body: [
          "For you: automatic song picks based on songs you play, add, and convert. It opens right away when you come back to the YouTube page.",
          "History: every song you've played, grouped by day. Remove one at a time or clear it all.",
          "Watch later: tap the save icon on a song card or in the player to keep it.",
          "The player now has an Up next list and a copy-link button. Recent searches show in the search box.",
        ],
      },
    },
  },
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

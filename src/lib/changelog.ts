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

import { PLANS, type PlanId } from "@/lib/schemas/plans";
import { fmt } from "@/utils/i18n";
import type { Dictionary } from "@/utils/languages/id";

// Daftar fitur plan untuk UI — diturunkan dari PLANS (bukan teks hardcode) supaya selalu sama dengan batas server

export interface PlanFeature {
  text: string;
  /** false = fitur tidak termasuk (ditampilkan tercoret) */
  included: boolean;
}

export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function planFeatures(id: PlanId, t: Dictionary): PlanFeature[] {
  const p = PLANS[id];
  const f = t.pricing.features;
  const list = p.formats.map((x) => x.toUpperCase()).join(", ");
  const allFormats = p.formats.length === PLANS.studio.formats.length;
  return [
    { text: p.daily == null ? f.unlimited : fmt(f.daily, { n: p.daily }), included: true },
    { text: fmt(f.duration, { n: Math.floor(p.maxDurationSec / 60) }), included: true },
    { text: fmt(f.bitrate, { n: p.maxBitrate }), included: true },
    { text: fmt(allFormats ? f.formatsAll : f.formatsFew, { list }), included: true },
    { text: fmt(f.playlist, { n: p.playlistMax }), included: true },
    { text: p.parallel === 1 ? f.parallelOne : fmt(f.parallel, { n: p.parallel }), included: true },
    { text: fmt(f.fileTtl, { n: p.fileTtlHours }), included: true },
    { text: fmt(f.history, { n: p.historyMax }), included: true },
    { text: f.effectsBase, included: true },
    { text: f.eq, included: p.effects.includes("eq") },
    { text: f.reverb, included: p.effects.includes("reverb") },
    { text: f.spatial8d, included: p.effects.includes("spatial8d") },
    { text: f.bulk, included: p.bulkRoblox },
    { text: f.priority, included: p.priority },
  ];
}

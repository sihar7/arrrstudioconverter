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
  const r = p.ranges;
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
    { text: fmt(f.effectsBase, { min: r.speed[0], max: r.speed[1], pitch: r.pitch }), included: true },
    { text: fmt(f.effectsLevel, { volume: r.volume, fade: r.fade }), included: true },
    {
      text: p.smartCompress === "max" ? f.compressMax : p.smartCompress === "standard" ? f.compressStandard : f.smartCompress,
      included: p.smartCompress !== "off",
    },
    p.effects.includes("eq")
      ? { text: fmt(f.eqRange, { b0: r.bass[0], b1: r.bass[1], t0: r.treble[0], t1: r.treble[1] }), included: true }
      : { text: f.eq, included: false },
    p.effects.includes("reverb") ? { text: fmt(f.reverbRange, { n: r.reverb }), included: true } : { text: f.reverb, included: false },
    { text: f.spatial8d, included: p.effects.includes("spatial8d") },
    { text: p.library === "full" ? f.libraryFull : p.library === "basic" ? f.libraryBasic : f.library, included: p.library !== "off" },
    {
      text: p.bulkRoblox == null ? f.bulkUnlimited : p.bulkRoblox > 0 ? fmt(f.bulkMax, { n: p.bulkRoblox }) : f.bulk,
      included: p.bulkRoblox !== 0,
    },
    { text: f.priority, included: p.priority },
    { text: fmt(f.imageMax, { n: p.imageMaxSide, label: p.imageMaxSide >= 4096 ? "4K" : p.imageMaxSide >= 2560 ? "2K" : "HD" }), included: true },
    { text: fmt(f.upscale, { list: p.upscaleScales.map((x) => `${x}×`).join(" / ") }), included: true },
    { text: f.imageBgFull, included: p.imageBg === "full" },
  ];
}

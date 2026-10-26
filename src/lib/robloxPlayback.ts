import type { AudioOptions } from "@/lib/schemas/convert.schema";

/**
 * Hitungan playback Roblox untuk satu setelan convert.
 *
 * Fakta yang dipakai:
 *  - Kecepatan & nada TERTANAM di file hasil. Sound.PlaybackSpeed = 1 → terdengar persis setelan ini.
 *  - PlaybackSpeed P di Roblox me-resample: tempo × P DAN nada bergeser 12·log2(P) semitone sekaligus.
 *  - Nada di file = pitch (+ 12·log2(speed) bila "Jaga nada asli" mati, gaya nightcore/slowed).
 *  - Balik ke asli: P = 1/speed → tempo 1×; sisa nada = nada file − 12·log2(speed).
 *    Sisa itu dikoreksi PitchShiftSoundEffect.Octave = 2^(−sisa/12) (jangkauan Roblox 0.5–2).
 */
export interface RobloxPlayback {
  speed: number;
  /** pergeseran nada yang tertanam di file (semitone) */
  filePitch: number;
  /** PlaybackSpeed untuk mengembalikan tempo asli */
  restoreSpeed: number;
  /** sisa pergeseran nada setelah PlaybackSpeed = restoreSpeed (semitone) */
  residual: number;
  /** Octave PitchShiftSoundEffect untuk menghapus sisa nada */
  octave: number;
  /** octave masih di jangkauan Roblox (0.5–2) */
  octaveOk: boolean;
  /** tempo & nada kembali sempurna hanya dengan PlaybackSpeed */
  exact: boolean;
  /** setelan tidak mengubah kecepatan maupun nada */
  untouched: boolean;
}

const EPS = 0.05; // semitone — di bawah ini tidak terdengar

export const round = (n: number, d: number) => Number(n.toFixed(d));

export function robloxPlayback(o: Pick<AudioOptions, "speed" | "pitch" | "preservePitch">): RobloxPlayback {
  const speed = round(o.speed, 2);
  const tempoSemis = 12 * Math.log2(speed);
  const filePitch = o.preservePitch ? o.pitch : o.pitch + tempoSemis;
  const residual = filePitch - tempoSemis;
  const octave = 2 ** (-residual / 12);
  return {
    speed,
    filePitch: round(filePitch, 1),
    restoreSpeed: round(1 / speed, 3),
    residual: round(residual, 1),
    octave: round(octave, 3),
    octaveOk: octave >= 0.5 - 1e-9 && octave <= 2 + 1e-9,
    exact: Math.abs(residual) < EPS,
    untouched: speed === 1 && Math.abs(filePitch) < EPS,
  };
}

export const semis = (v: number) => `${v > 0 ? "+" : ""}${round(v, 1)} st`;

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
    // 4 desimal: 1/1.1 = 0.9091 (3 desimal meleset ±2 sen nada)
    restoreSpeed: round(1 / speed, 4),
    residual: round(residual, 1),
    octave: round(octave, 3),
    octaveOk: octave >= 0.5 - 1e-9 && octave <= 2 + 1e-9,
    exact: Math.abs(residual) < EPS,
    untouched: speed === 1 && Math.abs(filePitch) < EPS,
  };
}

/**
 * Script Command Bar Studio: pasang PlaybackSpeed "balik ke asli" ke Sound terpilih (termasuk isi folder terpilih).
 * Sisa nada (bila ada & masih dalam jangkauan) dikoreksi PitchShiftSoundEffect bernama tetap → dijalankan ulang tidak menumpuk.
 */
export function restoreScript(pb: RobloxPlayback): string {
  const fix = !pb.exact && pb.octaveOk;
  return `-- ARRR Studio Converter · kembalikan tempo & nada asli (${pb.speed}× → 1×)
local FX = "ArrrRestorePitch"
local n = 0
local function apply(s)
	if not s:IsA("Sound") then return end
	s.PlaybackSpeed = ${pb.restoreSpeed}
	local fx = s:FindFirstChild(FX)
${
  fix
    ? `	if not fx then
		fx = Instance.new("PitchShiftSoundEffect")
		fx.Name = FX
		fx.Parent = s
	end
	fx.Octave = ${pb.octave}`
    : `	if fx then fx:Destroy() end`
}
	n += 1
end
for _, obj in game:GetService("Selection"):Get() do
	apply(obj)
	for _, d in obj:GetDescendants() do apply(d) end
end
print(("PlaybackSpeed ${pb.restoreSpeed} dipasang di %d Sound"):format(n))
`;
}

export const semis =(v: number) => `${v > 0 ? "+" : ""}${round(v, 1)} st`;

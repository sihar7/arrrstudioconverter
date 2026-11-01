"use client";

import { useState } from "react";
import { Copy, MagicWand } from "iconoir-react";
import { patchMusicConfig, type PatchResult } from "@/lib/robloxConfigPatch";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Segmented from "@/components/ui/Segmented";

type Setup = "auto" | "explorer" | "script" | "playlist" | "radio";

/** Potongan Luau per jenis music player — angka PlaybackSpeed diisi dari setelan saat ini */
function snippet(setup: Setup, speed: number): string | null {
  switch (setup) {
    case "script":
      return `sound.SoundId = "rbxassetid://ID_LAGU"
sound.PlaybackSpeed = ${speed} -- SETELAH SoundId, setiap ganti lagu
sound:Play()`;
    case "playlist":
      return `-- Config: tambahkan Speed di lagu hasil Roblox Bypass
Tracks = {
	{ Name = "Judul", Id = "rbxassetid://ID_LAGU", Speed = ${speed} },
	{ Name = "Lagu biasa", Id = "rbxassetid://ID_LAIN" }, -- tanpa Speed = 1
}

-- Script pemutar, di fungsi yang mengganti lagu:
sound.SoundId = track.Id
sound.PlaybackSpeed = track.Speed or 1

-- Durasi/progres yang benar (detik terdengar):
local length = sound.TimeLength / sound.PlaybackSpeed
local position = sound.TimePosition / sound.PlaybackSpeed`;
    case "radio":
      return `-- Hanya bila SEMUA lagu yang diputar radio hasil Roblox Bypass ${round(1 / speed)}×
sound.SoundId = "rbxassetid://" .. idDariPemain
sound.PlaybackSpeed = ${speed}`;
    default:
      return null;
  }
}

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Panduan memasang PlaybackSpeed "balik ke asli" di berbagai jenis music player Roblox.
 * Tiap game menyimpan lagu dengan cara berbeda → pilih yang paling mirip dengan game-mu.
 */
export default function RobloxSetupGuide({ speed }: { speed: number }) {
  const { t, f } = useT();
  const toast = useToast();
  const g = t.converter.robloxGuide;
  const [setup, setSetup] = useState<Setup>("auto");
  // Otomatis: kode user → kode dengan PlaybackSpeed (diproses di browser, tidak dikirim ke server)
  const [source, setSource] = useState("");
  const [patched, setPatched] = useState<PatchResult | null>(null);
  const code = setup === "auto" ? (patched?.changes.length ? patched.code : null) : snippet(setup, speed);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast(g.copied, "ok");
    } catch {
      /* izin clipboard ditolak */
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line/60 p-3">
      <div>
        <p className="text-[13px] font-semibold text-fg">{g.title}</p>
        <p className="mt-1 text-[11.5px] leading-snug text-fg-3">{g.sub}</p>
      </div>
      <Segmented
        size="sm"
        label={g.title}
        value={setup}
        onChange={setSetup}
        options={[
          { value: "auto", label: g.tabs.auto },
          { value: "playlist", label: g.tabs.playlist },
          { value: "script", label: g.tabs.script },
          { value: "explorer", label: g.tabs.explorer },
          { value: "radio", label: g.tabs.radio },
        ]}
      />
      {setup === "auto" ? (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] leading-snug text-fg-2">{g.autoHint}</p>
          <Textarea
            rows={6}
            spellCheck={false}
            className="font-mono text-[12px]"
            placeholder={g.autoPlaceholder}
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPatched(null);
            }}
          />
          <Button
            variant="tonal"
            size="sm"
            disabled={!source.trim()}
            icon={<MagicWand width={16} height={16} />}
            onClick={() => setPatched(patchMusicConfig(source, speed))}
          >
            {g.autoRun}
          </Button>
          {patched && (
            <div aria-live="polite" className="text-[12px] leading-snug">
              {patched.changes.length ? (
                <>
                  <p className="font-semibold text-ok">{f(g.autoDone, { n: patched.changes.length })}</p>
                  <ul className="mt-1 flex flex-col gap-0.5 font-mono text-[11px] text-fg-3">
                    {patched.changes.map((c) => (
                      <li key={c.line} className="truncate">
                        <span className="text-fg-2">{f(g.autoLine, { n: c.line })}</span> {c.text}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-warn">{g.autoNone}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-[12.5px] leading-snug text-fg-2 marker:text-fg-3">
          {g.steps[setup].map((step) => (
            <li key={step}>{f(step, { speed })}</li>
          ))}
        </ol>
      )}
      {code && (
        <div className="relative">
          <pre className="max-h-64 overflow-auto rounded-xs bg-raised p-3 pr-10 font-mono text-[11.5px] leading-relaxed text-fg-2">{code}</pre>
          <button
            type="button"
            onClick={copy}
            aria-label={g.copy}
            className="absolute right-1.5 top-1.5 grid size-8 cursor-pointer place-items-center rounded-[8px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
          >
            <Copy width={15} height={15} aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="text-[11.5px] leading-snug text-fg-3">{f(g.check, { speed })}</p>
    </div>
  );
}

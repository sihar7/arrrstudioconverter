import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Url from "@/Url/Url";

// Gambar preview link (Discord / WhatsApp / TikTok / X) — dibuat saat build, palet grafit + silver dari tokens.css

export const alt = "ARRR Studio Converter — YouTube ke Roblox Audio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  bg: "#0d0e10",
  surface: "#141517",
  raised: "#222428",
  line: "#2c2e33",
  fg: "#e3e5e8",
  fg2: "#bfc3c9",
  fg3: "#8b9098",
  silver: "#c9cdd2",
  gold: "#d6a64a",
};

/** TTF dari Google Fonts (tanpa User-Agent browser → format truetype); gagal = font bawaan */
async function gfont(family: string, weight: number) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? { name: family, data: await (await fetch(url)).arrayBuffer(), weight: weight as 400 | 500 | 700 | 800 } : null;
  } catch {
    return null;
  }
}

// Bentuk gelombang statis (deterministik) — siluet audio di sisi kanan
const BARS = Array.from({ length: 34 }, (_, i) => {
  const x = i / 33;
  const env = Math.sin(x * Math.PI) ** 0.7;
  const wob = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
  return Math.max(10, Math.round(300 * env * wob));
});

const CHIPS = ["YouTube → audio", "Skybox", "AI gambar", "Web · Desktop"];

export default async function Image() {
  const [logo, display, body, mono] = await Promise.all([
    readFile(join(process.cwd(), "src/app/icon.png")),
    gfont("Inter Tight", 800),
    gfont("Inter Tight", 500),
    gfont("JetBrains Mono", 500),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const fonts = [display, body, mono].filter((f) => f !== null);
  const headFont = display ? "Inter Tight" : undefined;
  const monoFont = mono ? "JetBrains Mono" : undefined;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.bg, color: C.fg, position: "relative" }}>
        {/* Grid halus ala kertas teknik */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: `linear-gradient(${C.surface} 1px, transparent 1px), linear-gradient(90deg, ${C.surface} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Bingkai hairline */}
        <div style={{ position: "absolute", top: 28, left: 28, right: 28, bottom: 28, display: "flex", border: `1px solid ${C.line}` }} />

        {/* Kolom kiri: brand + judul + chip */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={64} height={64} alt="" />
            <div style={{ display: "flex", fontFamily: monoFont, fontSize: 18, letterSpacing: 5, color: C.fg }}>
              ARRR STUDIO
              <span style={{ color: C.fg3, marginLeft: 12 }}>CONVERTER</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: monoFont, fontSize: 18, letterSpacing: 4, color: C.fg3 }}>
              <div style={{ width: 10, height: 10, background: C.gold, display: "flex" }} />
              YOUTUBE → ROBLOX
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 22,
                fontFamily: headFont,
                fontSize: 84,
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: -3.5,
              }}
            >
              <span>Studio kecil</span>
              <span style={{ color: C.silver }}>untuk Roblox.</span>
            </div>
            <div style={{ display: "flex", marginTop: 26, fontFamily: headFont, fontWeight: 500, fontSize: 25, lineHeight: 1.4, color: C.fg2, maxWidth: 580 }}>
              YouTube jadi audio Roblox, panorama jadi skybox — sekali alur.
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {CHIPS.map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 38,
                  padding: "0 16px",
                  background: C.raised,
                  border: `1px solid ${C.line}`,
                  fontFamily: monoFont,
                  fontSize: 16,
                  color: C.fg2,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Kolom kanan: gelombang audio + domain */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "64px 72px 64px 24px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", fontFamily: monoFont, fontSize: 15, letterSpacing: 3, color: C.fg3 }}>
            00:00 ─ 03:42
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 320 }}>
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 6,
                  height: h,
                  background: i === 21 ? C.gold : i < 21 ? C.silver : C.line,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", fontFamily: monoFont, fontSize: 18, color: C.fg2 }}>
            {new URL(Url.site).host}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

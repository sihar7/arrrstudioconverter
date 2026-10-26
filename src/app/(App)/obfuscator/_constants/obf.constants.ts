// Metadata UI Obfuscator (proses sebenarnya di backend /api/obfuscate).

export type LayerId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Mode = "basic" | "standard" | "advanced";
export type Engine = "lexer" | "astarr";
export type AstMode = "lite" | "full";

export const ENGINES: Engine[] = ["lexer", "astarr"];
export const AST_MODES: AstMode[] = ["lite", "full"];

export interface LayerMeta {
  id: LayerId;
  /** indeks judul di t.landing.obfLayers (id-1) */
  web: boolean; // true = dijalankan di web/backend; false = butuh ArrObfuscatorKit di Studio
}

export const LAYERS: { id: LayerId; web: boolean }[] = [
  { id: 1, web: true },
  { id: 2, web: true },
  { id: 3, web: true },
  { id: 4, web: false },
  { id: 5, web: false },
  { id: 6, web: false },
  { id: 7, web: false },
  { id: 8, web: true },
  { id: 9, web: false },
  { id: 10, web: true },
];

export const WEB_LAYERS = LAYERS.filter((l) => l.web).map((l) => l.id);

export const MODES: Mode[] = ["basic", "standard", "advanced"];

// Lapis web yang otomatis dipilih saat mode diganti (cocok dengan preset backend).
export const MODE_LAYERS: Record<Mode, number[]> = {
  basic: [1, 2, 10],
  standard: [1, 2, 3, 8, 10],
  advanced: [1, 2, 3, 8, 10],
};

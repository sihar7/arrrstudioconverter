import { apiFetch } from "@/lib/utils";
import type { AstMode, Engine, LayerId, Mode } from "../_constants/obf.constants";

// Semua proses obfus/de-obfus dijalankan di backend (/api/obfuscate, di-proxy ke Railway) — lebih akurat
// dan logika engine tidak ikut ke bundle klien. Admin dicek server-side.
// Dua engine: lexer (reversible, de-obfus jalan) & astarr (AST, rename scope-aware, lebih kuat & satu arah).

export interface ObfResult {
  code: string;
  before: number;
  after: number;
  applied?: LayerId[]; // hanya engine lexer
  skipped?: LayerId[]; // hanya engine lexer
  engine?: Engine;
}

export interface DeobResult {
  code: string;
  decoded: number;
  note: string;
}

export interface ObfParams {
  source: string;
  engine: Engine;
  mode: Mode;
  layers: number[];
  astMode: AstMode;
}

export const runObfuscate = (p: ObfParams) =>
  apiFetch<ObfResult>("/api/obfuscate", { method: "POST", json: { direction: "obfuscate", ...p } });

export const runDeobfuscate = (source: string) =>
  apiFetch<DeobResult>("/api/obfuscate", { method: "POST", json: { direction: "deobfuscate", source } });

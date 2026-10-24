import id, { type Dictionary } from "./languages/id";
import en from "./languages/en";

export type Lang = "id" | "en";
export const LANGS: Lang[] = ["id", "en"];
export const dictionaries: Record<Lang, Dictionary> = { id, en };

/** Ganti {placeholder} dengan nilai */
export function fmt(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

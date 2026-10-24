import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// API client (fetch) — error server {error, code} jadi ApiError
// ============================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("NETWORK", 0, "NETWORK");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(String(data.error ?? `HTTP ${res.status}`), res.status, String(data.code ?? "ERROR"), data);
  }
  return data as T;
}

// ============================================================
// Format
// ============================================================

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`;
}

export function formatDuration(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec)) return "--:--";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

/** "1:23" / "83" / "1:02:03" → detik; "" → null; tidak valid → NaN */
export function parseTime(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(s)) return Number.NaN;
  return s.split(":").reduce((acc, part) => acc * 60 + Number.parseFloat(part), 0);
}

export function formatClock(ts: number, lang: string) {
  return new Date(ts).toLocaleTimeString(lang === "id" ? "id-ID" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(ts: number, lang: string) {
  return new Date(ts).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

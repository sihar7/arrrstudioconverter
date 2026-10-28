"use client";

import { useSyncExternalStore } from "react";

// Percakapan mode Alice — disimpan di perangkat (localStorage), khusus admin. Store modul kecil +
// useSyncExternalStore: sidebar (daftar chat) & halaman chat membaca sumber yang sama tanpa Redux.

export const ALICE_MODELS = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
  "claude-fable-5-1",
  "claude-opus-5",
  "claude-sonnet-5",
  "claude-opus-4-8",
] as const;
export const ALICE_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type AliceModel = (typeof ALICE_MODELS)[number];
export type AliceEffort = (typeof ALICE_EFFORTS)[number];

export type Part =
  | { k: "text"; text: string }
  | { k: "thinking"; text: string; done: boolean }
  | { k: "tool"; id: string; name: string; title: string; done: boolean; ok?: boolean; output?: string; images?: string[] };

export interface Msg {
  id: string;
  role: "user" | "assistant";
  /** isi pesan user */
  text?: string;
  /** lampiran gambar pesan user (data URL JPEG/PNG yang sudah diperkecil) */
  images?: string[];
  /** isi jawaban Alice (berurutan: berpikir, teks, alat, …) */
  parts?: Part[];
  /** jawaban sedang di-stream */
  live?: boolean;
  error?: string;
  note?: "truncated" | "stopped";
  at: number;
}

export interface Conv {
  id: string;
  title: string;
  model: AliceModel;
  effort: AliceEffort;
  msgs: Msg[];
  updatedAt: number;
  /** pemakaian giliran terakhir: token konteks vs jendela model, sisa batas API (0–1) */
  usage?: Usage;
}

export interface Usage {
  context: number;
  window: number;
  rate: number | null;
}

interface State {
  convs: Conv[];
  activeId: string | null;
  model: AliceModel;
  effort: AliceEffort;
  /** sambungkan alat Roblox Studio (app desktop) ke chat */
  studio: boolean;
  /** foto profil Alice (data URL persegi 256px, hanya di perangkat ini) */
  avatar: string | null;
}

const KEY = "arrc:alice:v1";
const MAX_CONVS = 100;
const EMPTY: State = { convs: [], activeId: null, model: "claude-opus-5-5", effort: "medium", studio: false, avatar: null };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<State> | null;
    if (raw && Array.isArray(raw.convs)) {
      // Jawaban yang terputus saat app ditutup → tandai berhenti, bukan "sedang mengetik" selamanya
      const convs = raw.convs.map((c) => ({ ...c, msgs: c.msgs.map((m) => (m.live ? { ...m, live: false, note: "stopped" as const } : m)) }));
      state = {
        convs,
        activeId: null,
        model: ALICE_MODELS.includes(raw.model as AliceModel) ? (raw.model as AliceModel) : EMPTY.model,
        effort: ALICE_EFFORTS.includes(raw.effort as AliceEffort) ? (raw.effort as AliceEffort) : EMPTY.effort,
        studio: raw.studio === true,
        avatar: typeof raw.avatar === "string" && raw.avatar.startsWith("data:image/") ? raw.avatar : null,
      };
    }
  } catch {
    // data rusak → mulai bersih
  }
}

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  // Ditunda: stream mengubah state berkali-kali per detik
  saveTimer = setTimeout(() => {
    const write = (s: State) => {
      const { activeId: _a, ...rest } = s;
      localStorage.setItem(KEY, JSON.stringify(rest));
    };
    try {
      write(state);
    } catch {
      // Kuota localStorage penuh (biasanya gambar): lepas gambar dari percakapan lain, lalu buang yang tertua
      const lean = { ...state, convs: state.convs.map((c) => (c.id === state.activeId ? c : { ...c, msgs: c.msgs.map(({ images: _i, ...m }) => m) })) };
      try {
        write(lean);
      } catch {
        try {
          write({ ...lean, convs: lean.convs.slice(0, Math.max(5, Math.floor(lean.convs.length / 2))) });
        } catch {
          // tetap tidak muat — percakapan tetap ada di memori sampai app ditutup
        }
      }
    }
  }, 400);
}

function set(next: State) {
  state = next;
  persist();
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
};

/** State Alice (server render = kosong) */
export function useAlice<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return pick(state);
    },
    () => pick(EMPTY),
  );
}

export const getAlice = () => {
  load();
  return state;
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const alice = {
  setModel: (model: AliceModel) => set({ ...state, model, convs: patchActive((c) => ({ ...c, model })) }),
  setEffort: (effort: AliceEffort) => set({ ...state, effort, convs: patchActive((c) => ({ ...c, effort })) }),
  setStudio: (studio: boolean) => set({ ...state, studio }),
  setAvatar: (avatar: string | null) => set({ ...state, avatar }),
  setUsage: (convId: string, usage: Usage) => set({ ...state, convs: state.convs.map((c) => (c.id === convId ? { ...c, usage } : c)) }),
  open: (id: string | null) => {
    const c = state.convs.find((x) => x.id === id);
    set({ ...state, activeId: c ? c.id : null, ...(c ? { model: c.model, effort: c.effort } : {}) });
  },
  remove: (id: string) => set({ ...state, convs: state.convs.filter((c) => c.id !== id), activeId: state.activeId === id ? null : state.activeId }),
  /** Mulai percakapan baru (bila belum ada) + pesan user + slot jawaban kosong → { convId, msgId jawaban } */
  ask(text: string, images: string[] = []): { convId: string; replyId: string } {
    const now = Date.now();
    const user: Msg = { id: uid(), role: "user", text, ...(images.length ? { images } : {}), at: now };
    const reply: Msg = { id: uid(), role: "assistant", parts: [], live: true, at: now };
    let conv = state.convs.find((c) => c.id === state.activeId);
    if (!conv) {
      const title = text.replace(/\s+/g, " ").trim().slice(0, 60) || "Gambar";
      conv = { id: uid(), title, model: state.model, effort: state.effort, msgs: [], updatedAt: now };
    }
    const next: Conv = { ...conv, model: state.model, effort: state.effort, msgs: [...conv.msgs, user, reply], updatedAt: now };
    const others = state.convs.filter((c) => c.id !== next.id);
    set({ ...state, activeId: next.id, convs: [next, ...others].slice(0, MAX_CONVS) });
    return { convId: next.id, replyId: reply.id };
  },
  /** Ubah satu pesan (dipakai stream) */
  patchMsg(convId: string, msgId: string, fn: (m: Msg) => Msg) {
    set({
      ...state,
      convs: state.convs.map((c) => (c.id === convId ? { ...c, msgs: c.msgs.map((m) => (m.id === msgId ? fn(m) : m)) } : c)),
    });
  },
  /** Buang jawaban terakhir (coba lagi) → kembalikan teks pertanyaan sebelumnya */
  dropLastReply(convId: string): { text: string; images: string[] } | null {
    const c = state.convs.find((x) => x.id === convId);
    if (!c || c.msgs.length < 2) return null;
    const last = c.msgs.at(-1)!;
    const q = c.msgs.at(-2)!;
    if (last.role !== "assistant" || q.role !== "user") return null;
    set({ ...state, convs: state.convs.map((x) => (x.id === convId ? { ...x, msgs: x.msgs.slice(0, -2) } : x)) });
    return { text: q.text ?? "", images: q.images ?? [] };
  },
};

function patchActive(fn: (c: Conv) => Conv) {
  return state.convs.map((c) => (c.id === state.activeId ? fn(c) : c));
}

/** Teks jawaban (tanpa berpikir/alat) — riwayat yang dikirim ke server */
export const replyText = (m: Msg) => (m.parts ?? []).flatMap((p) => (p.k === "text" ? [p.text] : [])).join("");

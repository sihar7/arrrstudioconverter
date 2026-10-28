"use client";

import { apiFetch } from "@/lib/utils";
import { getDesktop } from "@/type/desktop";

// Memori Claude Code di PC admin → memori Alice di server (/memories/claude-code). App desktop membaca file
// lokalnya, web mengirimnya. Otomatis sekali per sesi app saat mode Alice dibuka; manual dari Pengaturan.

let autoDone = false;
let inflight: Promise<number | null> | null = null;

/** Jumlah file yang disinkron; null = app desktop ini belum bisa membaca memori (versi lama) */
export function syncClaudeMemory(): Promise<number | null> {
  const read = getDesktop()?.readClaudeMemory;
  if (!read) return Promise.resolve(null);
  inflight ??= (async () => {
    try {
      const files = await read();
      await apiFetch("/api/alice/memory/sync", { method: "POST", json: { files: files.slice(0, 500) } });
      return files.length;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export const canSyncClaudeMemory = () => Boolean(getDesktop()?.readClaudeMemory);

/** Sekali per sesi app (dipanggil halaman Alice); gagal diam-diam — memori lama tetap terpakai */
export function autoSyncClaudeMemory() {
  if (autoDone || !canSyncClaudeMemory()) return;
  autoDone = true;
  void syncClaudeMemory().catch(() => {
    autoDone = false;
  });
}

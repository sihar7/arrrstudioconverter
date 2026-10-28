"use client";

import { useEffect, useRef, useState } from "react";
import { Page, RefreshDouble, Trash, Upload } from "iconoir-react";
import { canSyncClaudeMemory, syncClaudeMemory } from "../../alice/_lib/memorySync";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, ApiError } from "@/lib/utils";

interface Item {
  path: string;
  size: number;
  updatedAt: number;
}

const API = "/api/alice/memory";
const MAX_FILE = 100_000;
const kb = (n: number) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

/**
 * Admin (app desktop): memori jangka panjang Alice (/memories di server). Impor file .md — mis. isi folder
 * memori Claude Code (MEMORY.md + catatan) — lalu Alice membacanya lewat memory tool di setiap chat.
 */
export default function AliceMemoryCard() {
  const { t, f } = useT();
  const m = t.alice.memory;
  const toast = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // App desktop 1.3+: baca memori Claude Code langsung dari PC (tanpa pilih file)
  const canSync = canSyncClaudeMemory();

  useEffect(() => {
    apiFetch<{ items: Item[] }>(API)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : String(e), "err");

  const onFiles = async (list: FileList | null) => {
    const files = [...(list ?? [])].filter((x) => /\.(md|txt)$/i.test(x.name));
    if (!files.length) return;
    setBusy(true);
    try {
      const ok: { name: string; text: string }[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE) toast(f(m.tooBig, { name: file.name }), "err");
        else ok.push({ name: file.name, text: await file.text() });
      }
      if (ok.length) {
        const r = await apiFetch<{ items: Item[] }>(API, { method: "PUT", json: { folder: "imported", files: ok.slice(0, 100) } });
        setItems(r.items);
        toast(f(m.imported, { n: ok.length }), "ok");
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (path: string | null) => {
    if (!window.confirm(path ? f(m.deleteOne, { path }) : m.clearConfirm)) return;
    try {
      const r = await apiFetch<{ items: Item[] }>(path ? `${API}?path=${encodeURIComponent(path)}` : API, { method: "DELETE" });
      setItems(r.items);
    } catch (e) {
      fail(e);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const n = await syncClaudeMemory();
      const r = await apiFetch<{ items: Item[] }>(API);
      setItems(r.items);
      if (n != null) toast(f(m.synced, { n }), "ok");
    } catch (e) {
      fail(e);
    } finally {
      setSyncing(false);
    }
  };

  const total = items?.reduce((n, i) => n + i.size, 0) ?? 0;

  return (
    <CardBox className="rise">
      <CardHeader title={m.title} aside={items?.length ? <span className="text-[12px] text-fg-3">{f(m.count, { n: items.length, size: kb(total) })}</span> : undefined} />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <p className="text-[13.5px] text-fg-2">{m.sub}</p>
        {!items ? (
          <Skeleton className="h-16 w-full" />
        ) : items.length === 0 ? (
          <p className="text-[13px] text-fg-3">{m.empty}</p>
        ) : (
          <ul className="thin-scroll -mx-1 flex max-h-64 flex-col gap-px overflow-y-auto px-1">
            {items.map((i) => (
              <li key={i.path} className="group/mem flex h-8 items-center gap-2 rounded-[7px] px-2 text-[12.5px] hover:bg-fg/[0.05]">
                <Page width={14} height={14} className="shrink-0 text-fg-3" />
                <span className="min-w-0 flex-1 truncate font-mono text-fg-2" title={i.path}>
                  {i.path.replace(/^\/memories\//, "")}
                </span>
                <span className="shrink-0 tabular-nums text-fg-3">{kb(i.size)}</span>
                <button
                  type="button"
                  aria-label={f(m.deleteOne, { path: i.path })}
                  onClick={() => void remove(i.path)}
                  className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-[6px] text-fg-3 opacity-0 transition-[opacity,color,background-color] hover:bg-fg/[0.08] hover:text-err focus-visible:opacity-100 group-hover/mem:opacity-100"
                >
                  <Trash width={13} height={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {canSync && (
            <Button size="sm" variant="primary" loading={syncing} icon={<RefreshDouble />} onClick={() => void sync()}>
              {m.sync}
            </Button>
          )}
          <input ref={input} type="file" accept=".md,.txt,text/markdown,text/plain" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
          <Button size="sm" variant={canSync ? "tonal" : "primary"} loading={busy} icon={<Upload />} onClick={() => input.current?.click()}>
            {busy ? m.importing : m.import}
          </Button>
          {Boolean(items?.length) && (
            <Button size="sm" variant="danger" onClick={() => void remove(null)}>
              {m.clear}
            </Button>
          )}
        </div>
      </div>
    </CardBox>
  );
}

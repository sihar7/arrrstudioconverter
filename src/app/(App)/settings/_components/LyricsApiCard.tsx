"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshDouble, Trash } from "iconoir-react";
import { useAppSelector } from "@/store/hooks";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import { apiFetch, ApiError, cn } from "@/lib/utils";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Field, { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useAccountLabel } from "@/components/shared/RobloxAccounts";

// Lyrics API: key untuk server game Roblox (Music ARR) + status lirik tiap lagu.
// Key hanya ditampilkan SEKALI setelah dibuat; Roblox API key dikirim sekali lalu disimpan terenkripsi di BE.

interface KeyInfo {
  id: string;
  name: string;
  hasRobloxKey: boolean;
  createdAt: number;
  lastUsedAt: number | null;
}

interface SongItem {
  assetId: string;
  status: "queued" | "working" | "ready" | "none" | "noaccess" | "failed";
  source: string | null;
  confidence: number | null;
  error: string | null;
  title: string;
  updatedAt: number;
}

const STATUS_TONE: Record<SongItem["status"], string> = {
  ready: "bg-ok",
  queued: "bg-fg-3",
  working: "bg-warn",
  none: "bg-fg-3",
  noaccess: "bg-err",
  failed: "bg-err",
};

function ago(ts: number, lang: string) {
  const s = Math.round((ts - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

export default function LyricsApiCard() {
  const { t, f, lang } = useT();
  const L = t.lyricsApi;
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const { data: me } = useMeQuery();
  const { accounts, activeAccountId, apiKey } = useAppSelector((s) => s.roblox);
  const label = useAccountLabel();
  const active = accounts.find((a) => a.id === activeAccountId);

  const [keys, setKeys] = useState<KeyInfo[] | null>(null);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [name, setName] = useState("");
  const [linkKey, setLinkKey] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const loggedIn = !!me?.user;

  const load = useCallback(async () => {
    try {
      const [k, s] = await Promise.all([
        apiFetch<{ keys: KeyInfo[] }>("/api/lyrics/keys"),
        apiFetch<{ items: SongItem[] }>("/api/lyrics/items"),
      ]);
      setKeys(k.keys);
      setSongs(s.items);
    } catch {
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    void (async () => {
      if (alive) await load();
    })();
    return () => {
      alive = false;
    };
  }, [loggedIn, load]);

  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : L.st_failed, "err");

  const create = async () => {
    setBusy("create");
    try {
      const res = await apiFetch<{ key: string; info: KeyInfo }>("/api/lyrics/keys", {
        method: "POST",
        json: { name: name.trim() || "Roblox", ...(linkKey && apiKey ? { robloxApiKey: apiKey } : {}) },
      });
      setFresh(res.key);
      setName("");
      setKeys((k) => [res.info, ...(k ?? [])]);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const relink = async (k: KeyInfo) => {
    if (!apiKey) return toast(L.noAccountKey, "err");
    setBusy(`link:${k.id}`);
    try {
      await apiFetch(`/api/lyrics/keys/${k.id}`, { method: "PATCH", json: { robloxApiKey: apiKey } });
      setKeys((list) => list?.map((x) => (x.id === k.id ? { ...x, hasRobloxKey: true } : x)) ?? null);
      toast(L.relinked, "ok");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (k: KeyInfo) => {
    const ok = await confirm(f(L.revokeConfirm, { name: k.name }), { title: L.revokeTitle, confirmLabel: L.revoke, variant: "danger" });
    if (!ok) return;
    setBusy(`del:${k.id}`);
    try {
      await apiFetch(`/api/lyrics/keys/${k.id}`, { method: "DELETE" });
      setKeys((list) => list?.filter((x) => x.id !== k.id) ?? null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const redo = async (s: SongItem) => {
    setBusy(`redo:${s.assetId}`);
    try {
      await apiFetch("/api/lyrics/items", { method: "POST", json: { assetId: s.assetId } });
      setSongs((list) => list.map((x) => (x.assetId === s.assetId ? { ...x, status: "queued" } : x)));
      toast(L.redone, "ok");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh).catch(() => {});
    toast(L.copied, "ok");
  };

  return (
    <CardBox className="rise [animation-delay:90ms]">
      <CardHeader title={L.title} />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <p className="text-[13px] leading-relaxed text-fg-3">{L.sub}</p>

        {!loggedIn ? (
          <p className="text-[13.5px] text-fg-2">{L.signIn}</p>
        ) : (
          <>
            {fresh && (
              <div className="flex flex-col gap-3 rounded-m bg-raised p-4" role="status">
                <p className="text-[13px] font-semibold text-fg">{L.created}</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-s bg-surface px-3 py-2.5 font-mono text-[12.5px] text-fg">{fresh}</code>
                  <Button variant="primary" size="sm" icon={<Copy width={15} height={15} />} onClick={copy}>
                    {L.copy}
                  </Button>
                </div>
                <div className="text-[12.5px] leading-relaxed text-fg-2">
                  <p className="mb-1 font-semibold text-fg">{L.setupTitle}</p>
                  <ol className="list-decimal space-y-0.5 pl-4">
                    <li>{L.setup1}</li>
                    <li>{L.setup2}</li>
                    <li>{L.setup3}</li>
                  </ol>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Field label={L.keyName}>
                {({ id }) => (
                  <Input id={id} value={name} maxLength={50} placeholder={L.keyNamePh} onChange={(e) => setName(e.target.value)} />
                )}
              </Field>
              <label className="flex cursor-pointer items-start gap-3 text-[13px] text-fg-2">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                  checked={linkKey && !!apiKey}
                  disabled={!apiKey}
                  onChange={(e) => setLinkKey(e.target.checked)}
                />
                <span>
                  <span className="text-fg">{f(L.useAccount, { name: active ? label(active) : "—" })}</span>
                  <span className="mt-0.5 block text-[12px] text-fg-3">{apiKey ? L.useAccountHint : L.noAccountKey}</span>
                </span>
              </label>
              <div>
                <Button variant="primary" loading={busy === "create"} onClick={create}>
                  {L.create}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-fg">{L.keys}</h3>
              {keys && keys.length === 0 && <p className="text-[13px] text-fg-3">{L.none}</p>}
              {keys?.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-m bg-raised px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-fg">{k.name}</p>
                    <p className="text-[12px] text-fg-3">
                      <span className={k.hasRobloxKey ? "text-fg-2" : "text-warn"}>{k.hasRobloxKey ? L.robloxLinked : L.robloxMissing}</span>
                      {" · "}
                      {k.lastUsedAt ? f(L.lastUsed, { when: ago(k.lastUsedAt, lang) }) : L.neverUsed}
                    </p>
                  </div>
                  <Button size="sm" variant="subtle" loading={busy === `link:${k.id}`} onClick={() => relink(k)}>
                    {L.relink}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${L.revoke} ${k.name}`}
                    icon={<Trash width={15} height={15} />}
                    loading={busy === `del:${k.id}`}
                    onClick={() => revoke(k)}
                  />
                </div>
              ))}
            </div>

            {keys && keys.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold text-fg">
                  {L.songs} <span className="font-mono text-[12px] font-normal text-fg-3">{songs.length}</span>
                </h3>
                {songs.length === 0 ? (
                  <p className="text-[13px] text-fg-3">{L.songsEmpty}</p>
                ) : (
                  <ul className="flex max-h-80 flex-col overflow-y-auto [scrollbar-width:thin]">
                    {songs.slice(0, 100).map((s) => (
                      <li key={s.assetId} className="flex items-center gap-3 border-b border-[var(--hairline)] py-2.5 last:border-0">
                        <span className={cn("size-2 shrink-0 rounded-full", STATUS_TONE[s.status])} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-fg">{s.title}</p>
                          <p className="truncate text-[11.5px] text-fg-3" title={s.error ?? undefined}>
                            {L[`st_${s.status}`]}
                            {s.status === "ready" && s.confidence != null && ` · ${Math.round(s.confidence * 100)}%`}
                            {s.status !== "ready" && s.error ? ` · ${s.error}` : ""}
                            <span className="font-mono"> · {s.assetId}</span>
                          </p>
                        </div>
                        {s.status !== "working" && s.status !== "queued" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`${L.redo} ${s.title}`}
                            title={L.redo}
                            icon={<RefreshDouble width={15} height={15} />}
                            loading={busy === `redo:${s.assetId}`}
                            onClick={() => redo(s)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {confirmDialog}
    </CardBox>
  );
}

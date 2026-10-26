"use client";

import { useState } from "react";
import { Check, Copy, Download, Lock, Sparks, Trash } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { useMeQuery } from "@/store/api/baseApi";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import CardBox from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import PageLoader from "@/components/shared/PageLoader";
import { cn } from "@/lib/utils";
import { AST_MODES, ENGINES, LAYERS, MODES, MODE_LAYERS, WEB_LAYERS, type AstMode, type Engine, type Mode } from "../_constants/obf.constants";
import { runDeobfuscate, runObfuscate } from "../_service/obfuscator.service";

const SAMPLE = `-- contoh script Luau
local Config = { name = "ArrStudio", version = 10, greeting = "halo dunia" }

local function announce(msg)
\tprint("[" .. Config.name .. "] " .. msg)
end

for i = 1, Config.version do
\tannounce("iterasi " .. i .. " dari " .. Config.greeting)
end`;

type Tab = "obfuscate" | "deobfuscate";

export default function ObfuscatorScreen() {
  const { t } = useT();
  const o = t.obf;
  const { data: me, isLoading } = useMeQuery();
  const isAdmin = Boolean(me?.user?.isAdmin);

  if (isLoading) return <PageLoader />;
  if (!isAdmin) return <AdminOnly title={o.adminOnly} body={o.adminOnlyBody} />;
  return <Tool />;
}

function AdminOnly({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-l border border-line/60 bg-surface text-fg-3">
        <Lock width={24} height={24} />
      </span>
      <h1 className="mt-6 font-display text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-fg-2">{body}</p>
    </div>
  );
}

function Tool() {
  const { t, f } = useT();
  const o = t.obf;
  const layerNames = t.landing.obfLayers; // judul 10 lapis (sinkron dengan landing)
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("obfuscate");
  const [engine, setEngine] = useState<Engine>("lexer");
  const [astMode, setAstMode] = useState<AstMode>("full");
  const [mode, setMode] = useState<Mode>("advanced");
  const [selected, setSelected] = useState<Set<number>>(() => new Set(WEB_LAYERS));
  const [src, setSrc] = useState("");
  const [out, setOut] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [stats, setStats] = useState<{ label: string; value: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const pickMode = (m: Mode) => {
    setMode(m);
    setSelected((prev) => {
      // pertahankan lapis Studio yang mungkin dipilih; set lapis web ke preset mode
      const next = new Set([...prev].filter((id) => !LAYERS.find((l) => l.id === id)?.web));
      MODE_LAYERS[m].forEach((id) => next.add(id));
      return next;
    });
  };

  const toggle = (id: number, web: boolean) => {
    if (!web) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async () => {
    if (!src.trim()) {
      toast(o.emptyInput, "err");
      return;
    }
    setBusy(true);
    setCopied(false);
    try {
      if (tab === "deobfuscate") {
        const r = await runDeobfuscate(src);
        setOut(r.code);
        setNote(r.note);
        setStats([{ label: o.statApplied, value: f(o.decodedCount, { n: r.decoded }) }]);
      } else {
        const r = await runObfuscate({ source: src, engine, mode, layers: [...selected], astMode });
        setOut(r.code);
        setNote(engine === "astarr" ? o.astOneWayNote : null);
        const pct = r.before ? Math.round((r.after / r.before) * 100) : 0;
        const base = [
          { label: o.statBefore, value: `${r.before.toLocaleString()} B` },
          { label: o.statAfter, value: `${r.after.toLocaleString()} B · ${pct}%` },
        ];
        setStats(
          engine === "astarr"
            ? base
            : [...base, { label: o.statApplied, value: r.applied?.join(", ") || "—" }, { label: o.statSkipped, value: r.skipped?.join(", ") || "—" }],
        );
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Gagal memproses", "err");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Gagal menyalin", "err");
    }
  };

  const download = () => {
    if (!out) return;
    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "deobfuscate" ? "deobfuscated.lua" : "obfuscated.lua";
    a.click();
    URL.revokeObjectURL(url);
  };

  const modeLabels: Record<Mode, string> = { basic: o.modeBasic, standard: o.modeStandard, advanced: o.modeAdvanced };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={o.eyebrow}
        title={o.title}
        sub={o.sub}
        actions={
          <Button
            variant="primary"
            loading={busy}
            icon={!busy ? <Lock width={16} height={16} /> : undefined}
            onClick={run}
          >
            {busy ? o.processing : tab === "deobfuscate" ? o.runDeob : o.run}
          </Button>
        }
      />

      {/* Tab + mode */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label={o.title} className="inline-flex rounded-full border border-line/60 bg-surface p-1">
          {(["obfuscate", "deobfuscate"] as Tab[]).map((tb) => (
            <button
              key={tb}
              role="tab"
              aria-selected={tab === tb}
              onClick={() => setTab(tb)}
              className={cn(
                "state-layer rounded-full px-5 py-2 text-[13px] font-semibold transition-colors",
                tab === tb ? "bg-accent text-on-accent" : "text-fg-3 hover:text-fg",
              )}
            >
              {tb === "obfuscate" ? o.tabObfuscate : o.tabDeobfuscate}
            </button>
          ))}
        </div>

        {tab === "obfuscate" && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {/* Engine: lexer (reversible) vs AST ARR (lebih kuat, satu arah) */}
            <div className="flex items-center gap-2.5">
              <span className="caps text-[11px] text-fg-3">{o.engineLabel}</span>
              <div className="inline-flex rounded-s border border-line/60 bg-surface p-1">
                {ENGINES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEngine(e)}
                    aria-pressed={engine === e}
                    title={o.engineHint[e]}
                    className={cn(
                      "state-layer rounded-[6px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                      engine === e ? "bg-accent text-on-accent" : "text-fg-3 hover:text-fg",
                    )}
                  >
                    {e === "lexer" ? o.engineLexer : o.engineAstarr}
                  </button>
                ))}
              </div>
            </div>

            {engine === "lexer" ? (
              <div className="flex items-center gap-2.5">
                <span className="caps text-[11px] text-fg-3">{o.modeLabel}</span>
                <div className="inline-flex rounded-s border border-line/60 bg-surface p-1">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      onClick={() => pickMode(m)}
                      aria-pressed={mode === m}
                      title={o.modeHint[m]}
                      className={cn(
                        "state-layer rounded-[6px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                        mode === m ? "bg-fg text-bg" : "text-fg-3 hover:text-fg",
                      )}
                    >
                      {modeLabels[m]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="caps text-[11px] text-fg-3">{o.astModeLabel}</span>
                <div className="inline-flex rounded-s border border-line/60 bg-surface p-1">
                  {AST_MODES.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAstMode(a)}
                      aria-pressed={astMode === a}
                      title={o.astHint[a]}
                      className={cn(
                        "state-layer rounded-[6px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                        astMode === a ? "bg-fg text-bg" : "text-fg-3 hover:text-fg",
                      )}
                    >
                      {a === "lite" ? o.astLite : o.astFull}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pemilih lapis (hanya untuk obfus engine lexer; AST ARR pakai preset level) */}
      {tab === "obfuscate" && engine === "lexer" && (
        <CardBox className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="caps text-[11px] text-fg-3">{o.layersLabel}</h2>
            <span className="text-[12px] text-fg-3">{o.modeHint[mode]}</span>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {LAYERS.map((L) => {
              const on = selected.has(L.id);
              const title = layerNames[L.id - 1]?.title ?? `Lapis ${L.id}`;
              return (
                <li key={L.id}>
                  <button
                    type="button"
                    onClick={() => toggle(L.id, L.web)}
                    aria-pressed={on}
                    disabled={!L.web}
                    className={cn(
                      "state-layer group flex w-full items-start gap-2.5 rounded-s border p-3 text-left transition-colors",
                      L.web
                        ? on
                          ? "border-accent/60 bg-accent/[0.08]"
                          : "border-line/60 bg-surface hover:bg-raised"
                        : "cursor-not-allowed border-line/40 bg-surface/50 opacity-60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors",
                        on ? "border-accent bg-accent text-on-accent" : "border-line-2 text-transparent",
                      )}
                    >
                      <Check width={13} height={13} strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-fg-3">{String(L.id).padStart(2, "0")}</span>
                        <span className="truncate text-[13px] font-semibold">{title}</span>
                      </span>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                          L.web ? "bg-ok/15 text-ok" : "bg-fg/10 text-fg-3",
                        )}
                      >
                        {L.web ? o.webBadge : o.studioBadge}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[12px] text-fg-3">{o.studioNote}</p>
        </CardBox>
      )}

      {/* Input / Output */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <CardBox className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3">
            <h2 className="caps text-[11px] text-fg-3">{o.inputLabel}</h2>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="subtle" icon={<Sparks width={14} height={14} />} onClick={() => setSrc(SAMPLE)}>
                {o.sample}
              </Button>
              <Button size="sm" variant="subtle" icon={<Trash width={14} height={14} />} onClick={() => setSrc("")}>
                {o.clear}
              </Button>
            </div>
          </div>
          <textarea
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            spellCheck={false}
            placeholder={o.inputPh}
            className="h-[420px] w-full resize-y bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:text-fg-3"
          />
        </CardBox>

        <CardBox className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3">
            <h2 className="caps text-[11px] text-fg-3">{o.outputLabel}</h2>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="subtle"
                icon={copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
                onClick={copy}
                disabled={!out}
              >
                {copied ? o.copied : o.copy}
              </Button>
              <Button size="sm" variant="subtle" icon={<Download width={14} height={14} />} onClick={download} disabled={!out}>
                {o.download}
              </Button>
            </div>
          </div>
          <textarea
            value={out}
            readOnly
            spellCheck={false}
            placeholder={o.outputPh}
            className="h-[420px] w-full resize-y bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-fg-2 outline-none placeholder:text-fg-3"
          />
        </CardBox>
      </div>

      {note && <p className="-mt-2 text-[13px] leading-relaxed text-fg-3">{note}</p>}

      {stats && (
        <dl className={cn("grid gap-px overflow-hidden rounded-l border border-line/60 bg-line/60", stats.length > 1 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1")}>
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-4">
              <dt className="caps text-[10.5px] text-fg-3">{s.label}</dt>
              <dd className="mt-1.5 font-mono text-[14px] font-semibold text-fg">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Page, WarningTriangle } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";
import Progress from "@/components/ui/Progress";
import { IMPORT_ACCEPT } from "@/lib/import/sheet";
import { useImport, type TrimLevel } from "../_hooks/useImport";

interface Props {
  /** maks lagu per file (plan) */
  limit: number;
  /** maks lagu per gelombang upload (plan bulkRoblox; null = tanpa batas) */
  bulkMax: number | null;
  /** API key & Creator ID Roblox sudah diisi */
  canUpload: boolean;
  /** file yang di-drop ke kolom link (langsung dibaca) */
  initialFile?: File | null;
  onClose: () => void;
}

const WAVES = [5, 10, 15, 20, 25];

// Contoh file: judul + artis, plus satu baris berisi link (kolom link boleh kosong)
const TEMPLATE = "judul,artis,link\nMungkin Nanti,Peterpan,\nYellow,Coldplay,\n,,https://youtu.be/dQw4w9WgXcQ\n";

/** Nomor langkah besar — user awam langsung tahu urutannya (lihat feedback "UI instan") */
function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <li className={cn("flex items-center gap-2 text-[13px] font-semibold transition-colors", active ? "text-fg" : done ? "text-fg-2" : "text-fg-3")}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 place-items-center rounded-full text-[12px] tabular-nums transition-colors",
          active ? "bg-accent text-on-accent" : done ? "bg-fg/[0.1] text-fg" : "bg-fg/[0.06]",
        )}
      >
        {done ? <Check width={13} height={13} strokeWidth={2.4} /> : n}
      </span>
      {label}
    </li>
  );
}

export default function ImportDialog({ limit, bulkMax, canUpload, initialFile, onClose }: Props) {
  const { t, f } = useT();
  const c = t.converter.importer;
  const toast = useToast();
  const imp = useImport(limit);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [trim, setTrim] = useState<TrimLevel>("light");
  const [upload, setUpload] = useState(canUpload);
  const waveChoices = WAVES.filter((n) => bulkMax == null || n <= bulkMax);
  const [wave, setWave] = useState(waveChoices.includes(10) ? 10 : (waveChoices.at(-1) ?? 5));
  // File dari drag & drop di kolom link: dibaca sekali saat dialog dibuka
  const opened = useRef(false);
  const { pick } = imp;
  useEffect(() => {
    if (!initialFile || opened.current) return;
    opened.current = true;
    void pick(initialFile);
  }, [initialFile, pick]);

  const { phase } = imp;
  const step = phase.kind === "pick" || phase.kind === "reading" ? 1 : phase.kind === "ready" ? 2 : 3;
  const running = phase.kind === "running";

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contoh-daftar-lagu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const footer =
    phase.kind === "ready" ? (
      <>
        <Button variant="subtle" onClick={imp.reset}>
          {c.changeFile}
        </Button>
        <Button variant="primary" onClick={() => void imp.start({ trim, upload: upload && canUpload, waveSize: wave })}>
          {f(c.start, { n: phase.rows.length - phase.playlists })}
        </Button>
      </>
    ) : running ? (
      <Button variant="subtle" onClick={imp.stop}>
        {c.cancel}
      </Button>
    ) : phase.kind === "done" ? (
      <Button variant="primary" onClick={onClose}>
        {c.finish}
      </Button>
    ) : (
      <Button variant="subtle" onClick={onClose}>
        {t.common.cancel}
      </Button>
    );

  return (
    <Dialog open onClose={running ? imp.stop : onClose} title={c.title} sub={c.sub} width="max-w-[600px]" footer={footer}>
      <div className="flex flex-col gap-5">
        <ol className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Step n={1} label={c.step1} active={step === 1} done={step > 1} />
          <Step n={2} label={c.step2} active={step === 2} done={step > 2} />
          <Step n={3} label={c.step3} active={step === 3} done={phase.kind === "done"} />
        </ol>

        {(phase.kind === "pick" || phase.kind === "reading") && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const file = e.dataTransfer.files[0];
                if (file) void imp.pick(file);
              }}
              className={cn(
                "flex flex-col items-center gap-3 rounded border px-5 py-8 text-center transition-colors",
                drag ? "border-accent bg-accent/[0.06]" : imp.error ? "border-err/60" : "border-line bg-bg/60",
              )}
            >
              <span className="grid size-12 place-items-center rounded-[12px] bg-fg/[0.06] text-fg-2">
                <Page width={22} height={22} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-fg">{phase.kind === "reading" ? c.reading : c.drop}</p>
                <p className="mt-1 text-[12.5px] text-fg-3">{c.formats}</p>
              </div>
              <Button variant="primary" size="sm" loading={phase.kind === "reading"} onClick={() => input.current?.click()}>
                {c.choose}
              </Button>
              <input
                ref={input}
                type="file"
                accept={IMPORT_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void imp.pick(file);
                }}
              />
            </div>
            {imp.error && (
              <p role="alert" className="flex items-start gap-2 text-[13px] text-err">
                <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0" />
                {imp.error}
              </p>
            )}
            <button
              type="button"
              onClick={downloadTemplate}
              className="state-layer inline-flex h-10 cursor-pointer items-center gap-2 self-start rounded-full px-3 text-[13px] font-medium text-fg-2 hover:text-fg"
            >
              <Download width={15} height={15} />
              {c.template}
            </button>
          </>
        )}

        {phase.kind === "ready" && (
          <>
            {/* Satu angka besar = jawaban "berapa lagu yang akan diproses" */}
            <div className="rounded bg-raised px-4 py-3.5">
              <p className="font-display text-[22px] font-semibold leading-tight text-fg tabular-nums">{f(c.found, { n: phase.rows.length })}</p>
              <p className="mt-1 text-[13px] text-fg-2">{f(c.foundSplit, { links: phase.links, titles: phase.rows.length - phase.links })}</p>
              <ul className="mt-3 flex flex-col divide-y divide-line/60 border-t border-line/60">
                {phase.rows.slice(0, 4).map((r) => (
                  <li key={r.n} className="flex items-baseline gap-3 py-1.5 text-[13px]">
                    <span className="w-6 shrink-0 text-right font-mono text-[11px] text-fg-3">{r.n}</span>
                    <span className="min-w-0 truncate text-fg-2">{r.query ?? r.link}</span>
                  </li>
                ))}
                {phase.rows.length > 4 && <li className="py-1.5 pl-9 text-[12.5px] text-fg-3">+{phase.rows.length - 4}</li>}
              </ul>
              {phase.truncated && <p className="mt-2 text-[12.5px] text-warn">{f(c.truncated, { n: phase.truncated })}</p>}
              {phase.playlists > 0 && <p className="mt-1 text-[12.5px] text-fg-3">{f(c.skippedPlaylist, { n: phase.playlists })}</p>}
            </div>

            <div className="grid gap-2">
              <span className="text-[13px] font-semibold text-fg-2">{c.trim}</span>
              <Segmented
                label={c.trim}
                value={trim}
                onChange={setTrim}
                options={[
                  { value: "off", label: c.trimOff },
                  { value: "light", label: c.trimLight },
                  { value: "medium", label: c.trimMedium },
                ]}
              />
              <p className="text-[12.5px] text-fg-3">{c.trimHint}</p>
            </div>

            <div className="grid gap-3 border-t border-line pt-4">
              <Switch label={c.upload} hint={canUpload ? c.uploadHint : c.noKey} checked={upload && canUpload} disabled={!canUpload} onChange={setUpload} />
              {upload && canUpload && waveChoices.length > 1 && (
                <div className="grid gap-2">
                  <span className="text-[13px] font-semibold text-fg-2">{c.wave}</span>
                  <Segmented label={c.wave} value={wave} onChange={setWave} size="sm" options={waveChoices.map((n) => ({ value: n, label: f(c.waveN, { n }) }))} />
                </div>
              )}
            </div>
          </>
        )}

        {running && (
          <div className="grid gap-3 py-2" aria-live="polite">
            <p className="font-display text-[18px] font-semibold text-fg tabular-nums">{f(c.searching, { done: phase.done, n: phase.total })}</p>
            <Progress value={(phase.done / Math.max(1, phase.total)) * 100} label={c.title} />
          </div>
        )}

        {phase.kind === "done" && (
          <div className="grid gap-3">
            <div>
              <p className="font-display text-[22px] font-semibold leading-tight text-fg tabular-nums">{f(c.doneTitle, { n: phase.added })}</p>
              <p className="mt-1 text-[13px] text-fg-2">{c.doneSub}</p>
            </div>
            {imp.error && <p className="text-[13px] text-err">{imp.error}</p>}
            {phase.notFound.length > 0 && (
              <div className="rounded bg-raised px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13.5px] font-semibold text-warn">{f(c.notFound, { n: phase.notFound.length })}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(phase.notFound.join("\n"))
                        .then(() => toast(c.copied, "ok"))
                        .catch(() => {})
                    }
                  >
                    {c.copyList}
                  </Button>
                </div>
                <ul className="thin-scroll mt-2 max-h-36 overflow-y-auto text-[12.5px] leading-6 text-fg-3">
                  {phase.notFound.slice(0, 100).map((q, i) => (
                    <li key={i} className="truncate">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

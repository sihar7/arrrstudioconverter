"use client";

import { useState } from "react";
import { Link as LinkIcon, PasteClipboard, Plus, Xmark } from "iconoir-react";
import CardBox from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useAddSource } from "../_hooks/useAddSource";
import { extractLinks } from "../_utils/helpers";

const YT_RE = /(^|\/\/|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)\b|^[A-Za-z0-9_-]{11}$/i;

/** Ringkasan link yang diketik — dihitung langsung saat mengetik (feedback sebelum menekan Tambah) */
function detect(text: string) {
  const links = extractLinks(text);
  const yt = links.filter((l) => YT_RE.test(l));
  return { ok: yt.length, playlists: yt.filter((l) => /[?&]list=/.test(l)).length, bad: links.length - yt.length };
}

/** Command bar sumber: input + deteksi link langsung + tempel/tambah dalam satu permukaan; menerima drag & drop */
export default function SourceCard() {
  const { t, f } = useT();
  const c = t.converter;
  const src = useAddSource();
  const [drag, setDrag] = useState(false);
  const info = detect(src.value);

  const append = (text: string) => src.setValue((v) => (v.trim() ? `${v.trimEnd()}\n${text}` : text));
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) append(text);
    } catch {
      /* izin clipboard ditolak — user bisa tempel manual */
    }
  };

  return (
    <CardBox className="rise p-4 sm:p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void src.submit();
        }}
      >
        <label htmlFor="source-input" className="caps mb-3 flex items-center gap-2.5 text-[11px] text-fg-2">
          <span aria-hidden="true" className="font-mono tracking-[0.1em] text-fg-3">
            01
          </span>
          {c.sourceLabel}
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
            if (text) append(text);
          }}
          className={cn(
            "group relative rounded-l border bg-bg/60 transition-[border-color,box-shadow,background-color] duration-200",
            "focus-within:border-fg-3 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
            src.error ? "border-err" : drag ? "border-accent bg-accent/[0.06]" : "border-line-2 hover:border-fg-3/60",
          )}
        >
          <div className="flex items-start gap-3 px-4 pt-3.5">
            <LinkIcon width={18} height={18} aria-hidden="true" className="mt-0.5 shrink-0 text-fg-3 transition-colors group-focus-within:text-fg" />
            <textarea
              id="source-input"
              aria-describedby="source-status"
              aria-invalid={Boolean(src.error)}
              rows={2}
              value={src.value}
              onChange={(e) => {
                src.setValue(e.target.value);
                if (src.error) src.setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void src.submit();
                }
              }}
              placeholder={drag ? c.dropHere : c.sourcePlaceholder}
              spellCheck={false}
              autoComplete="off"
              className="thin-scroll max-h-40 min-h-12 w-full flex-1 resize-none bg-transparent font-mono text-[14px] leading-6 text-fg [field-sizing:content] placeholder:text-fg-3"
              // Cincin fokus ada di wadah (focus-within) — outline global ditimpa agar tidak dobel
              style={{ outline: "none" }}
            />
            {src.value && (
              <IconButton
                label={t.common.close}
                size="sm"
                icon={<Xmark width={16} height={16} />}
                onClick={() => src.setValue("")}
                className="-mr-2 -mt-1.5"
              />
            )}
          </div>

          {/* Status langsung + aksi */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 pt-2 sm:pl-4">
            <div id="source-status" aria-live="polite" className="flex min-h-8 flex-wrap items-center gap-1.5 text-[12.5px]">
              {src.error ? (
                <span className="text-err">{src.error}</span>
              ) : info.ok || info.bad ? (
                <>
                  {info.ok > 0 && (
                    <span className="rise inline-flex h-7 items-center gap-1.5 rounded-full bg-ok/12 px-2.5 font-semibold text-ok [animation-duration:.3s]">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
                      {f(c.detected, { n: info.ok })}
                    </span>
                  )}
                  {info.playlists > 0 && (
                    <span className="inline-flex h-7 items-center rounded-full bg-tonal px-2.5 font-medium text-on-tonal">{f(c.detectedPl, { n: info.playlists })}</span>
                  )}
                  {info.bad > 0 && (
                    <span className="inline-flex h-7 items-center rounded-full bg-warn/12 px-2.5 font-medium text-warn">{f(c.detectedBad, { n: info.bad })}</span>
                  )}
                </>
              ) : (
                <span className="text-fg-3">{c.sourceHelp}</span>
              )}
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="ghost" size="sm" onClick={paste} icon={<PasteClipboard width={16} height={16} />} className="flex-1 sm:flex-none">
                {c.paste}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={src.busy}
                disabled={!info.ok}
                icon={<Plus width={16} height={16} />}
                className="flex-1 sm:flex-none"
              >
                {src.busy ? c.adding : info.ok > 1 ? `${c.add} ${info.ok}` : c.add}
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-2 hidden text-[12px] text-fg-3 sm:block">{c.enterHint}</p>
      </form>

      {src.suggestion && (
        <div className="rise mt-4 flex items-center gap-3 border-l-2 border-accent bg-bg py-2.5 pl-4 pr-2">
          <p className="flex-1 text-[13.5px] text-fg-2">{c.playlistFound}</p>
          <Button size="sm" variant="ghost" loading={src.loadingPlaylist} onClick={src.addPlaylist}>
            {c.addPlaylist}
          </Button>
          <IconButton label={t.common.close} size="sm" icon={<Xmark width={16} height={16} />} onClick={src.dismissSuggestion} />
        </div>
      )}
    </CardBox>
  );
}

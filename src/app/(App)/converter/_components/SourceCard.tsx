"use client";

import { forwardRef, useMemo, useState } from "react";
import { Link as LinkIcon, PasteClipboard, Plus, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAutoConvert } from "@/store/slices/converterSlice";
import { useHydrated } from "@/hooks/useHydrated";
import CardBox from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import { SwitchTrack } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import type { useAddSource } from "../_hooks/useAddSource";
import { parseLinks, type ParsedLink } from "../_utils/helpers";
import Kbd from "./Kbd";

const MAX_CHIPS = 6;

/** Chip satu link hasil deteksi: jenis · id; duplikat & bukan-YouTube diberi tanda */
function LinkChip({ link }: { link: ParsedLink }) {
  const { t } = useT();
  const c = t.converter;
  const bad = link.kind === "invalid";
  return (
    <li
      title={link.dup ? `${link.raw} — ${c.inQueue}` : link.raw}
      className={cn(
        "rise inline-flex h-7 max-w-full items-center gap-1.5 rounded-xs border px-2 text-[12px] [animation-duration:.25s]",
        bad ? "border-warn/40 text-warn" : link.dup ? "border-line text-fg-3" : "border-line-2 text-fg-2",
      )}
    >
      <span className={cn("font-semibold", !bad && !link.dup && "text-fg")}>{c.linkKinds[link.kind]}</span>
      {!bad && <span className="truncate font-mono text-[11px] text-fg-3">{link.id}</span>}
      {link.dup && <span className="text-[11px]">· {c.inQueue}</span>}
    </li>
  );
}

/** Composer sumber: kolom link + deteksi langsung + tempel/tambah; menerima drag & drop */
const SourceCard = forwardRef<HTMLTextAreaElement, { src: ReturnType<typeof useAddSource> }>(function SourceCard({ src }, ref) {
  const { t, f } = useT();
  const c = t.converter;
  const dispatch = useAppDispatch();
  const hydrated = useHydrated();
  const storedAuto = useAppSelector((s) => s.converter.autoConvert);
  const autoConvert = hydrated && storedAuto;
  const items = useAppSelector((s) => s.converter.items);
  const [drag, setDrag] = useState(false);

  const queued = useMemo(() => new Set(items.filter((i) => i.status !== "done" && i.status !== "error").map((i) => i.videoId)), [items]);
  const links = useMemo(() => parseLinks(src.value, queued), [src.value, queued]);
  const addable = links.filter((l) => l.kind !== "invalid" && !l.dup).length;

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
    <CardBox className="rise overflow-hidden">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void src.submit();
        }}
      >
        {/* Kepala: judul langkah + opsi auto-convert */}
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line/70 px-5">
          <label htmlFor="source-input" className="flex items-center gap-3 whitespace-nowrap font-display text-[17px] font-semibold text-fg">
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-fg/[0.08] text-[12px] font-semibold tabular-nums text-fg-2">
              1
            </span>
            {c.composerTitle}
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={autoConvert}
            title={c.autoConvertHint}
            onClick={() => dispatch(setAutoConvert(!autoConvert))}
            className={cn(
              "group -mr-1.5 inline-flex h-11 shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full px-1.5 text-[13.5px] font-medium transition-colors",
              autoConvert ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {c.autoConvert}
            <SwitchTrack on={autoConvert} size="sm" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
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
              "group relative rounded border bg-bg/60 transition-[border-color,box-shadow,background-color] duration-200",
              "focus-within:border-fg-3 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)]",
              src.error ? "border-err" : drag ? "border-accent bg-accent/[0.06]" : "border-line hover:border-line-2",
            )}
          >
            <div className="flex items-start gap-3 px-4 pt-3.5">
              <LinkIcon width={18} height={18} aria-hidden="true" className="mt-[3px] shrink-0 text-fg-3 transition-colors group-focus-within:text-fg" />
              <textarea
                ref={ref}
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
                  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    void src.submit();
                  }
                }}
                placeholder={drag ? c.dropHere : c.sourcePlaceholder}
                spellCheck={false}
                autoComplete="off"
                className="thin-scroll max-h-40 min-h-12 w-full flex-1 resize-none bg-transparent text-[15px] leading-6 text-fg [field-sizing:content] placeholder:text-fg-3"
                // Cincin fokus ada di wadah (focus-within) — outline global ditimpa agar tidak dobel
                style={{ outline: "none" }}
              />
              {src.value && (
                <IconButton label={c.clearInput} size="sm" icon={<Xmark width={16} height={16} />} onClick={() => src.setValue("")} className="-mr-2 -mt-1.5" />
              )}
            </div>

            {/* Deteksi langsung: tiap link jadi chip */}
            <div id="source-status" aria-live="polite" className="px-4 pb-1 pt-2">
              {src.error ? (
                <p className="pb-2 text-[13px] text-err" role="alert">
                  {src.error}
                </p>
              ) : links.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5 pb-2">
                  {links.slice(0, MAX_CHIPS).map((l) => (
                    <LinkChip key={l.raw} link={l} />
                  ))}
                  {links.length > MAX_CHIPS && (
                    <li className="inline-flex h-7 items-center px-1 text-[12px] text-fg-3">{f(c.moreLinks, { n: links.length - MAX_CHIPS })}</li>
                  )}
                </ul>
              ) : (
                <p className="pb-2 text-[13px] leading-relaxed text-fg-3">{c.sourceHelp}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 px-3 py-3 sm:pl-4">
              <p className="hidden items-center gap-1.5 text-[12px] text-fg-3 md:flex">
                <Kbd>Enter</Kbd> {c.add.toLowerCase()} <span className="mx-1 text-line-2">·</span>
                <Kbd>Ctrl</Kbd>
                <Kbd>V</Kbd> {c.pasteAnywhere.replace(/^Ctrl\+V\s*/, "")}
              </p>
              <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto">
                <Button type="button" variant="ghost" size="sm" onClick={paste} icon={<PasteClipboard width={16} height={16} />}>
                  {c.paste}
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={src.busy} disabled={!addable} icon={<Plus width={16} height={16} />} className="md:min-w-32">
                  {src.busy ? c.adding : addable > 1 ? `${c.add} ${addable}` : c.add}
                </Button>
              </div>
            </div>
          </div>

          {src.suggestion && (
            <div className="rise mt-3 flex items-center gap-3 rounded border border-line bg-raised py-2 pl-4 pr-2">
              <p className="flex-1 text-[13.5px] text-fg-2">{c.playlistFound}</p>
              <Button size="sm" variant="ghost" loading={src.loadingPlaylist} onClick={src.addPlaylist}>
                {c.addPlaylist}
              </Button>
              <IconButton label={t.common.close} size="sm" icon={<Xmark width={16} height={16} />} onClick={src.dismissSuggestion} />
            </div>
          )}
        </div>
      </form>
    </CardBox>
  );
});

export default SourceCard;

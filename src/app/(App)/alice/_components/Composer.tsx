"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, Check, Cube, MediaImagePlus, NavArrowDown, Xmark } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/type/desktop";
import { MAX_ATTACH, toAttachment } from "../_lib/images";
import { ALICE_EFFORTS, ALICE_MODELS, alice, useAlice, type AliceEffort, type AliceModel } from "../_lib/store";
import { send, stop } from "../_lib/chat";

const MAX_H = 260;

/**
 * Kotak tulis (acuan Claude Desktop): textarea tumbuh otomatis · kiri bawah model & effort · kanan kirim/hentikan.
 * Enter = kirim, Shift+Enter = baris baru (IME aman).
 */
export default function Composer({ busy, convId, autoFocus }: { busy: boolean; convId: string | null; autoFocus?: boolean }) {
  const { t } = useT();
  const a = t.alice;
  const model = useAlice((s) => s.model);
  const effort = useAlice((s) => s.effort);
  const studioOn = useAlice((s) => s.studio);
  const hasStudio = Boolean(getDesktop()?.studio);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const attach = async (files: Iterable<Blob>) => {
    const room = MAX_ATTACH - images.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    const urls = (await Promise.all(picked.map(toAttachment))).filter((u): u is string => Boolean(u));
    if (urls.length) setImages((cur) => [...cur, ...urls].slice(0, MAX_ATTACH));
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(MAX_H, el.scrollHeight)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, convId]);

  const submit = () => {
    const v = text.trim();
    if ((!v && !images.length) || busy) return;
    setText("");
    setImages([]);
    void send(v, images);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes("Files")) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void attach(e.dataTransfer.files);
      }}
      data-alice-composer=""
      className={cn(
        "rounded-[18px] border border-[var(--hairline)] bg-surface shadow-[0_10px_40px_-18px_rgb(0_0_0/0.55)] transition-[border-color,box-shadow] focus-within:border-fg/20 light:bg-white light:shadow-[0_8px_30px_-16px_rgb(0_0_0/0.18)]",
        drag && "border-accent/60 ring-2 ring-accent/25",
      )}
    >
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-3 pt-3" aria-label={a.attachments}>
          {images.map((src, i) => (
            <li key={i} className="group/att relative size-16 overflow-hidden rounded-[10px] border border-[var(--hairline)] bg-fg/[0.05]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label={a.removeImage}
                onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid size-5 cursor-pointer place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover/att:opacity-100"
              >
                <Xmark width={12} height={12} strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="sr-only" htmlFor="alice-input">
        {a.placeholder}
      </label>
      <textarea
        id="alice-input"
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onPaste={(e) => {
          const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
          if (!files.length) return;
          e.preventDefault();
          void attach(files);
        }}
        placeholder={a.placeholder}
        className="thin-scroll block max-h-[260px] w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed outline-none placeholder:text-fg-3"
      />
      <div className="flex items-center gap-1 px-2 pb-2 pt-1">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void attach(e.target.files ?? []).then(() => (e.target.value = ""))} />
        <IconToggle label={a.attach} onClick={() => fileRef.current?.click()} disabled={images.length >= MAX_ATTACH}>
          <MediaImagePlus width={18} height={18} />
        </IconToggle>
        {hasStudio && (
          <IconToggle label={studioOn ? a.studioOn : a.studioOff} active={studioOn} onClick={() => alice.setStudio(!studioOn)}>
            <Cube width={17} height={17} />
          </IconToggle>
        )}
        <Picker
          label={a.model}
          value={model}
          options={ALICE_MODELS.map((m) => ({ value: m, name: a.models[m][0], desc: a.models[m][1] }))}
          onChange={(v) => alice.setModel(v as AliceModel)}
        />
        <Picker
          label={a.effort}
          value={effort}
          prefix={`${a.effort} · `}
          options={ALICE_EFFORTS.map((e) => ({ value: e, name: a.efforts[e][0], desc: a.efforts[e][1] }))}
          onChange={(v) => alice.setEffort(v as AliceEffort)}
        />
        <span className="ml-auto hidden pr-2 text-[11.5px] text-fg-3 sm:block">{a.hint}</span>
        {busy && convId ? (
          <RoundButton label={a.stop} onClick={() => stop(convId)}>
            <span className="size-3 rounded-[3px] bg-current" />
          </RoundButton>
        ) : (
          <RoundButton label={a.send} onClick={submit} disabled={!text.trim() && !images.length} primary>
            <ArrowUp width={18} height={18} strokeWidth={2.2} />
          </RoundButton>
        )}
      </div>
    </div>
  );
}

/** Tombol ikon kecil di baris bawah (lampirkan gambar, Roblox Studio aktif/mati) */
function IconToggle({ label, onClick, active, disabled, children }: { label: string; onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 shrink-0 cursor-pointer place-items-center rounded-[8px] transition-[background-color,color,scale] active:scale-90 disabled:cursor-default disabled:opacity-35",
        active ? "bg-accent/15 text-accent hover:bg-accent/20" : "text-fg-3 hover:bg-fg/[0.07] hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function RoundButton({ label, onClick, disabled, primary, children }: { label: string; onClick: () => void; disabled?: boolean; primary?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-[background-color,opacity,scale] duration-150 active:scale-90 disabled:cursor-default disabled:opacity-35",
        primary ? "bg-accent text-on-accent hover:bg-accent-strong" : "bg-fg/[0.1] text-fg hover:bg-fg/[0.16]",
      )}
    >
      {children}
    </button>
  );
}

interface Option {
  value: string;
  name: string;
  desc: string;
}

/** Tombol teks kecil → menu pilihan (nama + keterangan, centang di yang aktif). Panah atas/bawah, Esc menutup. */
function Picker({ label, value, options, onChange, prefix = "" }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; prefix?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    // Fokus ke pilihan aktif saat menu terbuka
    box.current?.querySelector<HTMLButtonElement>("[aria-checked='true']")?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(box.current?.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      box.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={box} className="relative" onKeyDown={open ? onMenuKey : undefined}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${current.name}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 cursor-pointer items-center gap-1 rounded-[8px] px-2.5 text-[13px] font-medium text-fg-2 transition-colors hover:bg-fg/[0.07] hover:text-fg",
          open && "bg-fg/[0.07] text-fg",
        )}
      >
        <span className="text-fg-3">{prefix}</span>
        {current.name}
        <NavArrowDown width={14} height={14} className={cn("text-fg-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="ios-pop absolute bottom-[calc(100%+6px)] left-0 z-30 w-64 rounded-[12px] border border-[var(--hairline)] bg-raised/95 p-1 shadow-[0_16px_48px_-12px_rgb(0_0_0/0.55)] backdrop-blur-xl light:bg-white/95"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-left outline-none transition-colors hover:bg-fg/[0.07] focus-visible:bg-fg/[0.07]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-fg">{o.name}</span>
                <span className="block text-[12px] text-fg-3">{o.desc}</span>
              </span>
              {o.value === value && <Check width={16} height={16} strokeWidth={2.2} className="shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

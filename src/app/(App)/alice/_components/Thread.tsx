"use client";

import { memo, useState } from "react";
import { Check, Copy, NavArrowDown, Refresh, WarningTriangle, Xmark } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import Markdown from "./Markdown";
import AliceAvatar from "./AliceAvatar";
import { replyText, type Conv, type Msg, type Part } from "../_lib/store";
import { retry } from "../_lib/chat";

/** Daftar pesan satu percakapan (kolom tengah ±720px, acuan Claude Desktop) */
export default function Thread({ conv }: { conv: Conv }) {
  return (
    <ol className="flex flex-col gap-7 pb-6" aria-live="polite">
      {conv.msgs.map((m, i) => (
        <li key={m.id}>{m.role === "user" ? <UserMsg msg={m} /> : <Reply msg={m} convId={conv.id} last={i === conv.msgs.length - 1} />}</li>
      ))}
    </ol>
  );
}

/** Pesan user: gelembung kanan, permukaan tonal */
const UserMsg = memo(function UserMsg({ msg }: { msg: Msg }) {
  return (
    <div className="flex flex-col items-end gap-2">
      {msg.images?.length ? (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-2">
          {msg.images.map((src, i) => (
            <span key={i} className="block overflow-hidden rounded-[12px] border border-[var(--hairline)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="max-h-56 max-w-[260px] object-cover" />
            </span>
          ))}
        </div>
      ) : null}
      {msg.text && (
        <p className="max-w-[85%] whitespace-pre-wrap rounded-[18px] rounded-br-[6px] bg-fg/[0.08] px-4 py-2.5 text-[14.5px] leading-relaxed [overflow-wrap:anywhere] light:bg-black/[0.06]">
          {msg.text}
        </p>
      )}
    </div>
  );
});

/** Jawaban Alice gaya chat: foto profil di kiri + nama, isi tanpa gelembung — berpikir · alat · teks Markdown · aksi */
const Reply = memo(function Reply({ msg, convId, last }: { msg: Msg; convId: string; last: boolean }) {
  const { t } = useT();
  const a = t.alice;
  const parts = msg.parts ?? [];
  const waiting = msg.live && !parts.length;
  const text = replyText(msg);

  return (
    <div className="flex gap-3">
      <AliceAvatar size={32} live={Boolean(msg.live)} className="mt-0.5" />
      <div className="group/reply flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex items-baseline gap-2 text-[13px] font-semibold leading-none text-fg">
          {a.title}
          <time className="text-[11.5px] font-normal text-fg-3" dateTime={new Date(msg.at).toISOString()}>
            {new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
        </p>
      {waiting && <ThinkingRow live text="" />}
      {parts.map((p, i) => (
        <PartView key={p.k === "tool" ? p.id : `${p.k}-${i}`} part={p} live={Boolean(msg.live) && i === parts.length - 1} />
      ))}
      {msg.error && (
        <p role="alert" className="flex items-start gap-2 rounded-[10px] bg-err/[0.1] px-3 py-2 text-[13.5px] text-err">
          <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0" />
          {msg.error}
        </p>
      )}
      {msg.note && <p className="text-[12.5px] text-fg-3">{msg.note === "truncated" ? a.truncated : a.stopped}</p>}
      {!msg.live && (
        <div className={cn("flex items-center gap-0.5 transition-opacity", last ? "opacity-100" : "opacity-0 group-hover/reply:opacity-100 focus-within:opacity-100")}>
          {text && <CopyButton text={text} />}
          {last && (
            <ActionButton label={a.retry} onClick={() => retry(convId)}>
              <Refresh width={15} height={15} />
            </ActionButton>
          )}
        </div>
      )}
      </div>
    </div>
  );
});

function PartView({ part, live }: { part: Part; live: boolean }) {
  if (part.k === "text") return <Markdown text={part.text} />;
  if (part.k === "thinking") return <ThinkingRow live={live && !part.done} text={part.text} />;
  return <ToolRow part={part} />;
}

/** "Berpikir…" (berdenyut saat jalan) → dapat dibuka untuk melihat ringkasan proses berpikir */
function ThinkingRow({ live, text }: { live: boolean; text: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const canOpen = Boolean(text.trim());
  return (
    <div>
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={canOpen ? open : undefined}
        className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[7px] text-[13px] text-fg-3 transition-colors hover:text-fg-2 disabled:cursor-default"
      >
        <span className={cn(live && "alice-shimmer")}>{live ? t.alice.thinking : t.alice.thought}</span>
        {canOpen && <NavArrowDown width={14} height={14} className={cn("transition-transform duration-200", open && "rotate-180")} />}
      </button>
      {open && canOpen && (
        <p className="mt-1 whitespace-pre-wrap border-l-2 border-[var(--hairline)] pl-3 text-[13px] leading-relaxed text-fg-3">{text}</p>
      )}
    </div>
  );
}

/** Langkah alat: ikon status + nama alat, bisa dibuka untuk melihat hasil mentahnya */
function ToolRow({ part }: { part: Extract<Part, { k: "tool" }> }) {
  const { t, f } = useT();
  const [open, setOpen] = useState(false);
  const label = !part.done ? f(t.alice.toolRunning, { tool: part.title }) : part.ok ? f(t.alice.toolDone, { tool: part.title }) : f(t.alice.toolFailed, { tool: part.title });
  return (
    <div className="rounded-[10px] border border-[var(--hairline)] bg-fg/[0.03]">
      <button
        type="button"
        disabled={!part.done}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={part.done ? open : undefined}
        className="flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-[13px] disabled:cursor-default"
      >
        <span className={cn("grid size-4 shrink-0 place-items-center", part.done ? (part.ok ? "text-ok" : "text-err") : "text-fg-3")}>
          {!part.done ? <Spinner className="size-3.5" /> : part.ok ? <Check width={15} height={15} strokeWidth={2.2} /> : <Xmark width={15} height={15} strokeWidth={2.2} />}
        </span>
        <span className={cn("min-w-0 flex-1 truncate", part.done ? "text-fg-2" : "alice-shimmer text-fg-3")}>{label}</span>
        <span className="hidden font-mono text-[11px] text-fg-3 sm:inline">{part.name.replace(/^studio__/, "")}</span>
        {part.done && <NavArrowDown width={14} height={14} className={cn("shrink-0 text-fg-3 transition-transform duration-200", open && "rotate-180")} />}
      </button>
      {/* Gambar hasil alat (mis. screenshot Roblox Studio) selalu terlihat, seperti di Claude Desktop */}
      {part.images?.length ? (
        <div className="flex flex-wrap gap-2 border-t border-[var(--hairline)] p-2">
          {part.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="max-h-80 max-w-full rounded-[8px] border border-[var(--hairline)] object-contain" />
          ))}
        </div>
      ) : null}
      {open && part.output && (
        <pre className="thin-scroll max-h-72 overflow-auto border-t border-[var(--hairline)] p-3 font-mono text-[12px] leading-relaxed text-fg-2">{part.output}</pre>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { t } = useT();
  const [done, setDone] = useState(false);
  return (
    <ActionButton
      label={done ? t.alice.copied : t.alice.copy}
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
    >
      {done ? <Check width={15} height={15} /> : <Copy width={15} height={15} />}
    </ActionButton>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 cursor-pointer place-items-center rounded-[8px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-95"
    >
      {children}
    </button>
  );
}

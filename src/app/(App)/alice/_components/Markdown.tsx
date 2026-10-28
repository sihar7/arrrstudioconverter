"use client";

import { memo, useState, type ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "iconoir-react";
import { useT } from "@/hooks/useT";

/** Blok kode: label bahasa + salin (gaya Claude Desktop: panel gelap tipis, tanpa highlight warna-warni) */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-3 overflow-hidden rounded-[10px] border border-[var(--hairline)] bg-fg/[0.04]">
      <div className="flex h-8 items-center justify-between border-b border-[var(--hairline)] pl-3 pr-1 text-[11.5px] text-fg-3">
        <span className="font-mono">{lang || "text"}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="flex h-6 cursor-pointer items-center gap-1 rounded-[6px] px-2 transition-colors hover:bg-fg/[0.07] hover:text-fg"
        >
          {copied ? <Check width={13} height={13} /> : <Copy width={13} height={13} />}
          {copied ? t.alice.copied : t.alice.copy}
        </button>
      </div>
      <pre className="thin-scroll overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  pre: ({ children }) => <>{children}</>,
  code({ className, children, ...rest }: ComponentProps<"code">) {
    const lang = /language-([\w-]+)/.exec(className ?? "")?.[1];
    const text = String(children ?? "");
    // Blok (berbahasa atau multi-baris) vs kode sebaris
    if (lang || text.includes("\n")) return <CodeBlock lang={lang ?? ""} code={text.replace(/\n$/, "")} />;
    return (
      <code className="rounded-[5px] bg-fg/[0.08] px-1.5 py-0.5 font-mono text-[0.88em]" {...rest}>
        {children}
      </code>
    );
  },
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
      {children}
    </a>
  ),
  // Gambar dari jawaban Alice (URL https) — rapi, tidak melebihi kolom
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className="my-3 max-h-96 max-w-full rounded-[10px] border border-[var(--hairline)]" />,
  table: ({ children }) => (
    <div className="thin-scroll my-3 overflow-x-auto rounded-[10px] border border-[var(--hairline)]">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-[var(--hairline)] bg-fg/[0.04] px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-[var(--hairline)] px-3 py-2 align-top">{children}</td>,
};

/** Jawaban Alice dalam Markdown (GFM: tabel, daftar tugas, coret) */
function Markdown({ text }: { text: string }) {
  return (
    <div className="alice-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);

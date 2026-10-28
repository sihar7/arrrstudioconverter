"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Eye, EyeClosed } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { apiFetch, ApiError, cn } from "@/lib/utils";

interface Status {
  enabled: boolean;
  url: string | null;
  createdAt: number | null;
  fromEnv: boolean;
  /** chat Alice di app aktif (ANTHROPIC_API_KEY terpasang di server) */
  ai: boolean;
}

const API = "/api/alice/connector";

/**
 * Admin (app desktop): konektor Claude (MCP) — buat/salin/ganti/matikan URL yang ditempel di Claude.ai →
 * Connectors. URL disamarkan sampai ditampilkan. Ditambah status chat Alice di app (butuh API key server).
 */
export default function ConnectorCard() {
  const { t, f, lang } = useT();
  const c = t.alice.connector;
  const toast = useToast();
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<Status>(API)
      .then(setS)
      .catch(() => setS({ enabled: false, url: null, createdAt: null, fromEnv: false, ai: false }));
  }, []);

  const act = useCallback(
    async (method: "POST" | "DELETE", confirmText?: string) => {
      if (confirmText && !window.confirm(confirmText)) return;
      setBusy(true);
      try {
        const next = await apiFetch<Status>(API, { method });
        setS(next);
        setShow(method === "POST");
      } catch (e) {
        toast(e instanceof ApiError ? e.message : String(e), "err");
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const masked = s?.url ? s.url.replace(/(\/api\/mcp\/)(.{4}).+$/, "$1$2••••••••••••••••") : "";

  return (
    <CardBox className="rise">
      <CardHeader title={c.title} />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <p className="text-[13.5px] text-fg-2">{c.sub}</p>
        {!s ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            {s.url ? (
              <div className="flex flex-col gap-2">
                <span className="text-[12.5px] font-semibold text-fg-2">{c.url}</span>
                <div className="flex items-center gap-1 rounded-[10px] border border-[var(--hairline)] bg-fg/[0.04] py-1 pl-3 pr-1">
                  <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg" title={show ? s.url : undefined}>
                    {show ? s.url : masked}
                  </code>
                  <button
                    type="button"
                    aria-label={show ? "Sembunyikan" : "Tampilkan"}
                    onClick={() => setShow((v) => !v)}
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[7px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
                  >
                    {show ? <EyeClosed width={15} height={15} /> : <Eye width={15} height={15} />}
                  </button>
                  <button
                    type="button"
                    aria-label={copied ? t.alice.copied : t.alice.copy}
                    onClick={() =>
                      void navigator.clipboard.writeText(s.url!).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      })
                    }
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[7px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
                  >
                    {copied ? <Check width={15} height={15} /> : <Copy width={15} height={15} />}
                  </button>
                </div>
                <p className="text-[12px] text-warn">{c.secret}</p>
                <p className="text-[12.5px] text-fg-3">{c.steps}</p>
                {s.createdAt && (
                  <p className="text-[12px] text-fg-3">
                    {f(c.created, { date: new Date(s.createdAt).toLocaleString(lang === "en" ? "en-US" : "id-ID", { dateStyle: "medium", timeStyle: "short" }) })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-fg-3">{s.fromEnv ? c.fromEnv : c.off}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {s.url ? (
                <>
                  <Button size="sm" variant="tonal" loading={busy} onClick={() => void act("POST", c.rotateConfirm)}>
                    {c.rotate}
                  </Button>
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => void act("DELETE", c.disableConfirm)}>
                    {c.disable}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="primary" loading={busy} onClick={() => void act("POST")}>
                  {c.enable}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4 text-[13px]">
              <span className="font-medium text-fg-2">{c.ai}</span>
              <span className={cn("flex items-center gap-1.5", s.ai ? "text-ok" : "text-fg-3")}>
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", s.ai ? "bg-ok" : "bg-fg-3")} />
                {s.ai ? c.aiOn : c.aiOff}
              </span>
            </div>
          </>
        )}
      </div>
    </CardBox>
  );
}

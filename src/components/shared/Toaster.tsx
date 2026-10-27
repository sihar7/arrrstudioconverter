"use client";

import { useEffect } from "react";
import { CheckCircle, InfoCircle, WarningTriangle, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissToast, type Toast } from "@/store/slices/toastSlice";
import { cn } from "@/lib/utils";
import QueueNotice from "./QueueNotice";

function ToastRow({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissToast(toast.id)), toast.kind === "err" ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [dispatch, toast.id, toast.kind]);

  const Icon = toast.kind === "ok" ? CheckCircle : toast.kind === "err" ? WarningTriangle : InfoCircle;
  return (
    <div className="rise pointer-events-auto flex w-full items-start gap-3 rounded border border-line-2 bg-raised px-4 py-3 shadow-[var(--shadow)]">
      <Icon
        width={18}
        height={18}
        className={cn("mt-0.5 shrink-0", toast.kind === "ok" ? "text-ok" : toast.kind === "err" ? "text-err" : "text-fg-2")}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-[14px] leading-snug [overflow-wrap:anywhere]">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dispatch(dismissToast(toast.id))}
        className="-m-1 cursor-pointer rounded-s p-1 text-fg-3 hover:text-fg"
      >
        <Xmark width={16} height={16} />
      </button>
    </div>
  );
}

export default function Toaster() {
  const items = useAppSelector((s) => s.toast.items);
  return (
    <div
      aria-live="polite"
      data-toaster=""
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-[380px] desk:bottom-[calc(var(--dock-h)+16px)]"
    >
      {items.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
      <QueueNotice />
    </div>
  );
}

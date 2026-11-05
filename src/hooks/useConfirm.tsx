"use client";

import { useCallback, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useT } from "./useT";

/** Teks & gaya dialog; default = konfirmasi hapus */
export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
}

/**
 * Konfirmasi aksi: const [confirm, dialog] = useConfirm(); if (await confirm(msg)) …
 * Default judul & tombol "Hapus"; aksi lain wajib mengisi opts (mis. "Jadikan publik").
 */
export function useConfirm() {
  const { t } = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    setOpts(options);
    setMsg(message);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setMsg(null);
  };

  const dialog = (
    <Dialog
      open={msg != null}
      onClose={() => close(false)}
      title={opts.title ?? t.common.delete}
      width="max-w-[440px]"
      footer={
        <>
          <Button variant="subtle" onClick={() => close(false)}>
            {t.common.cancel}
          </Button>
          <Button variant={opts.variant ?? "danger"} onClick={() => close(true)}>
            {opts.confirmLabel ?? t.common.delete}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-fg-2">{msg}</p>
    </Dialog>
  );

  return [confirm, dialog] as const;
}

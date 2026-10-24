"use client";

import { useCallback, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useT } from "./useT";

/** Konfirmasi aksi destruktif: const [confirm, dialog] = useConfirm(); if (await confirm(msg)) … */
export function useConfirm() {
  const { t } = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((message: string) => {
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
      title={t.common.delete}
      width="max-w-[440px]"
      footer={
        <>
          <Button variant="subtle" onClick={() => close(false)}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" onClick={() => close(true)}>
            {t.common.delete}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-fg-2">{msg}</p>
    </Dialog>
  );

  return [confirm, dialog] as const;
}

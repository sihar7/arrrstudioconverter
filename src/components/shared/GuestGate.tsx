"use client";

import { Discord } from "iconoir-react";
import Dialog from "@/components/ui/Dialog";
import Button, { buttonClass } from "@/components/ui/Button";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";

/** Muncul saat kuota guest habis — ajak masuk Discord */
export default function GuestGate({ open, onClose, next = "/converter" }: { open: boolean; onClose: () => void; next?: string }) {
  const { data } = useMeQuery();
  const { t, f } = useT();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.gate.title}
      width="max-w-[460px]"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t.gate.later}
          </Button>
          <a href={`/api/auth/discord?next=${encodeURIComponent(next)}`} className={buttonClass("primary")}>
            <Discord width={18} height={18} /> {t.gate.login}
          </a>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-fg-2">{f(t.gate.sub, { max: data?.quota.limit ?? 3 })}</p>
    </Dialog>
  );
}

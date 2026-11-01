"use client";

import { useEffect, useState } from "react";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import LoginLinks from "@/components/shared/LoginLinks";

/**
 * Satu akun = satu perangkat aktif. Bila akun ini login di perangkat lain, server mengeluarkan sesi ini (me.kicked)
 * → jelaskan lewat dialog. Sesi dicek ulang saat tab kembali aktif supaya pemberitahuannya cepat.
 */
export default function KickNotice() {
  const { t } = useT();
  const k = t.kick;
  const { data, refetch } = useMeQuery();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  const open = Boolean(data?.kicked) && !dismissed;
  return (
    <Dialog
      open={open}
      onClose={() => setDismissed(true)}
      title={k.title}
      width="max-w-[460px]"
      footer={
        <>
          <Button variant="subtle" onClick={() => setDismissed(true)}>
            {k.later}
          </Button>
          <LoginLinks next={typeof window === "undefined" ? "/converter" : window.location.pathname} label={k.again} />
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-fg-2">{k.sub}</p>
    </Dialog>
  );
}

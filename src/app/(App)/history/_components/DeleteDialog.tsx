"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash } from "iconoir-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { useT } from "@/hooks/useT";
import type { HistoryItem } from "@/type/history";

/**
 * Konfirmasi hapus riwayat. Item yang SUDAH diupload ke Roblox bisa ikut diarsipkan (default aktif bila ada API key);
 * item yang belum diupload cukup dihapus dari riwayat.
 */
export default function DeleteDialog({
  items,
  hasKey,
  busy,
  onClose,
  onConfirm,
}: {
  items: HistoryItem[] | null;
  hasKey: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (archive: boolean) => void;
}) {
  const { t, f } = useT();
  const h = t.history;
  const [archive, setArchive] = useState(true);
  const list = items ?? [];
  const uploaded = list.filter((i) => i.roblox?.assetId).length;

  return (
    <Dialog
      open={items != null}
      onClose={onClose}
      title={list.length === 1 ? h.deleteTitleOne : f(h.deleteTitle, { n: list.length })}
      sub={list.length === 1 ? list[0].title : h.deleteSub}
      width="max-w-[480px]"
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={busy}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" loading={busy} onClick={() => onConfirm(hasKey && uploaded > 0 && archive)} icon={<Trash aria-hidden="true" />}>
            {f(h.deleteAction, { n: list.length })}
          </Button>
        </>
      }
    >
      {uploaded === 0 ? (
        <p className="text-[14px] leading-relaxed text-fg-2">{h.deleteLocalOnly}</p>
      ) : hasKey ? (
        <div className="rounded-s border border-line/60 bg-bg/40 p-4">
          <Switch label={h.archiveToggle} hint={f(h.archiveHint, { n: uploaded })} checked={archive} onChange={setArchive} />
        </div>
      ) : (
        <p className="rounded-s bg-warn/10 px-4 py-3 text-[13.5px] leading-relaxed text-warn">
          {h.archiveNoKey}{" "}
          <Link href="/settings" className="font-semibold underline underline-offset-4">
            {t.nav.settings}
          </Link>
        </p>
      )}
    </Dialog>
  );
}

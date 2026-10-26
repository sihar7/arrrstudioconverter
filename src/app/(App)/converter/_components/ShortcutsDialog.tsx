"use client";

import Dialog from "@/components/ui/Dialog";
import { useT } from "@/hooks/useT";
import Kbd from "./Kbd";

export default function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <Dialog open={open} onClose={onClose} title={t.converter.shortcuts} width="max-w-[440px]">
      <ul className="flex flex-col">
        {t.converter.shortcutList.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-4 border-b border-line/60 py-3 text-[14px] last:border-b-0">
            <span className="text-fg-2">{s.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

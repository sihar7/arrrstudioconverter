"use client";

import { useEffect, useState } from "react";
import { Folder } from "iconoir-react";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Field from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { ArrDesktop, DesktopSaveSettings } from "@/type/desktop";

/**
 * Khusus app desktop: cara menyimpan hasil (dialog Simpan tiap kali / otomatis ke folder) + folder pilihan.
 * Nilai disimpan di app (desktop/src/downloads.js), bukan di web — berlaku untuk semua download.
 */
export default function DesktopStorageCard({ desktop }: { desktop: ArrDesktop }) {
  const { t } = useT();
  const d = t.desktop;
  const [s, setS] = useState<DesktopSaveSettings | null>(null);

  useEffect(() => {
    let alive = true;
    desktop.getSaveSettings?.().then((v) => alive && setS(v));
    return () => {
      alive = false;
    };
  }, [desktop]);

  const changeFolder = async () => {
    await desktop.chooseDownloadsFolder();
    const next = await desktop.getSaveSettings?.();
    if (next) setS(next);
  };

  return (
    <CardBox className="rise">
      <CardHeader title={d.storageTitle} />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {!s ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <Field label={d.storageMode} hint={s.mode === "ask" ? d.storageAskHint : d.storageAutoHint}>
              {() => (
                <Segmented
                  label={d.storageMode}
                  value={s.mode}
                  options={[
                    { value: "ask", label: d.storageAsk },
                    { value: "folder", label: d.storageAuto },
                  ]}
                  onChange={async (mode) => {
                    setS({ ...s, mode }); // langsung terasa; nilai final dari app
                    const next = await desktop.setSaveMode?.(mode);
                    if (next) setS(next);
                  }}
                />
              )}
            </Field>

            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-fg-2">{d.storageFolder}</p>
              <div
                className={cn(
                  "flex items-center gap-3 rounded border border-line/60 bg-raised px-3.5 py-3 transition-opacity",
                  s.mode === "ask" && "opacity-70",
                )}
              >
                <Folder width={18} height={18} className="shrink-0 text-fg-3" />
                <div className="min-w-0 flex-1">
                  <p title={s.folder} className="truncate font-mono text-[12.5px] text-fg [direction:rtl] [text-align:left]">
                    {/* rtl → potongan "…" di depan, ujung path (nama folder) tetap terlihat */}
                    <bdi>{s.folder}</bdi>
                  </p>
                  {s.isDefault && <p className="mt-0.5 text-[11.5px] text-fg-3">{d.storageDefault}</p>}
                </div>
                <Button variant="subtle" size="sm" onClick={() => desktop.openDownloadsFolder()}>
                  {d.storageOpen}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="tonal" size="sm" onClick={changeFolder}>
                  <Folder width={16} height={16} /> {d.storageChange}
                </Button>
                {!s.isDefault && (
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={async () => {
                      const next = await desktop.resetDownloadsFolder?.();
                      if (next) setS(next);
                    }}
                  >
                    {d.storageReset}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </CardBox>
  );
}

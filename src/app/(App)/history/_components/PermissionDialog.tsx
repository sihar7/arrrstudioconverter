"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Field, { Input } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import type { HistoryEntry } from "@/type/history";

interface Props {
  entry: HistoryEntry;
  onClose: () => void;
  onApply: (mode: "place" | "public", placeId?: string) => Promise<boolean>;
}

export default function PermissionDialog({ entry, onClose, onApply }: Props) {
  const { t } = useT();
  const savedPlace = useAppSelector((s) => s.roblox.placeId);
  const [mode, setMode] = useState<"place" | "public">("place");
  const [placeId, setPlaceId] = useState(savedPlace);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const apply = async () => {
    if (mode === "place" && !/^\d{1,20}$/.test(placeId)) return setErr(t.upload.placeId);
    setBusy(true);
    const ok = await onApply(mode, mode === "place" ? placeId : undefined);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t.permission.title}
      sub={t.permission.sub}
      width="max-w-[480px]"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" loading={busy} onClick={apply}>
            {busy ? t.permission.applying : t.permission.apply}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="font-mono text-[12.5px] text-fg-3">
          {entry.title} · {entry.roblox?.assetId}
        </p>
        <Field label={t.upload.permission} hint={mode === "place" ? t.upload.permPlaceHint : t.upload.permPublicHint}>
          {() => (
            <Segmented
              label={t.upload.permission}
              value={mode}
              options={[
                { value: "place", label: t.upload.permPlace },
                { value: "public", label: t.upload.permPublic },
              ]}
              onChange={setMode}
            />
          )}
        </Field>
        {mode === "place" && (
          <Field label={t.upload.placeId} error={err}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                inputMode="numeric"
                className="font-mono"
                value={placeId}
                onChange={(e) => {
                  setPlaceId(e.target.value.replace(/\D/g, ""));
                  setErr(null);
                }}
              />
            )}
          </Field>
        )}
      </div>
    </Dialog>
  );
}

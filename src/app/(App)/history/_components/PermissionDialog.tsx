"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Field, { Input } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import type { HistoryEntry } from "@/type/history";
import type { GrantMode } from "../_service/history.service";

interface Props {
  /** satu entri (tombol per baris) atau banyak (mode pilih) — hanya yang sudah punya asset ID */
  entries: HistoryEntry[];
  onClose: () => void;
  /** target = Place ID (place) / ID komunitas (group) */
  onApply: (mode: GrantMode, target?: string) => Promise<boolean>;
}

/** Izin pakai audio: Place tertentu · Komunitas (semua game grup itu) · Publik (semua game) */
export default function PermissionDialog({ entries, onClose, onApply }: Props) {
  const { t, f } = useT();
  const p = t.permission;
  const roblox = useAppSelector((s) => s.roblox);
  const [mode, setMode] = useState<GrantMode>("place");
  const [placeId, setPlaceId] = useState(roblox.placeId);
  // Upload sebagai grup → ID komunitas itu jadi isian awal
  const [groupId, setGroupId] = useState(roblox.creatorType === "group" ? roblox.creatorId : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const one = entries.length === 1 ? entries[0] : null;
  const target = mode === "place" ? placeId : mode === "group" ? groupId : undefined;

  const apply = async () => {
    if (mode !== "public" && !/^\d{1,20}$/.test(target ?? "")) return setErr(mode === "place" ? t.upload.placeId : p.groupId);
    setBusy(true);
    const ok = await onApply(mode, target);
    setBusy(false);
    if (ok) onClose();
  };

  const hint = mode === "place" ? t.upload.permPlaceHint : mode === "group" ? p.groupHint : t.upload.permPublicHint;

  return (
    <Dialog
      open
      onClose={onClose}
      title={one ? p.title : f(p.bulkTitle, { n: entries.length })}
      sub={p.sub}
      width="max-w-[480px]"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" loading={busy} onClick={apply}>
            {busy ? p.applying : p.apply}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="font-mono text-[12.5px] text-fg-3">{one ? `${one.title} · ${one.roblox?.assetId}` : f(p.bulkSub, { n: entries.length })}</p>
        <Field label={t.upload.permission} hint={hint}>
          {() => (
            <Segmented
              label={t.upload.permission}
              value={mode}
              options={[
                { value: "place", label: t.upload.permPlace },
                { value: "group", label: p.group },
                { value: "public", label: t.upload.permPublic },
              ]}
              onChange={(m) => {
                setMode(m);
                setErr(null);
              }}
            />
          )}
        </Field>
        {mode !== "public" && (
          <Field label={mode === "place" ? t.upload.placeId : p.groupId} error={err}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                inputMode="numeric"
                className="font-mono"
                value={target ?? ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (mode === "place") setPlaceId(v);
                  else setGroupId(v);
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

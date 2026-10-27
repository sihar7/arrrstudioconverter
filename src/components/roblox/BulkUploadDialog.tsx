"use client";

import { useState } from "react";
import { WarningTriangle } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Field, { Input, Textarea } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";
import { nameFor, type NameStyle } from "@/lib/shortName";
import NameStylePicker from "./NameStylePicker";
import type { UploadForm } from "@/type/roblox";

export interface BulkEntry {
  key: string;
  title: string;
  thumbnail: string;
  displayName: string;
}

interface Props {
  entries: BulkEntry[];
  initial: UploadForm;
  onClose: () => void;
  onSubmit: (picked: { key: string; form: UploadForm }[]) => void;
}

/** Upload banyak audio sekaligus: pengaturan pemilik/izin sama, nama aset per audio */
export default function BulkUploadDialog({ entries, initial, onClose, onSubmit }: Props) {
  const { t, f } = useT();
  const u = t.upload;
  const [form, setForm] = useState<UploadForm>(initial);
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(entries.map((e) => [e.key, e.displayName])));
  const [style, setStyle] = useState<NameStyle | null>("short");
  // Satu klik → semua nama dipotong ulang dengan gaya yang sama
  const applyStyle = (s: NameStyle) => {
    setStyle(s);
    setNames(Object.fromEntries(entries.map((e) => [e.key, nameFor(e.title, s)])));
  };
  const [picked, setPicked] = useState<Set<string>>(() => new Set(entries.map((e) => e.key)));
  const [placeErr, setPlaceErr] = useState<string | null>(null);
  const set = (patch: Partial<UploadForm>) => setForm((s) => ({ ...s, ...patch }));

  const allOn = picked.size === entries.length;
  const toggle = (key: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const valid = picked.size > 0 && /^\d+$/.test(form.creatorId) && entries.every((e) => !picked.has(e.key) || names[e.key]?.trim());

  const submit = () => {
    if (form.permission === "place" && !/^\d{1,20}$/.test(form.placeId)) {
      setPlaceErr(u.placeId);
      return;
    }
    onSubmit(
      entries
        .filter((e) => picked.has(e.key))
        .map((e) => ({ key: e.key, form: { ...form, displayName: names[e.key].trim().slice(0, 50) } })),
    );
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={u.bulkTitle}
      sub={u.bulkSub}
      width="max-w-[640px]"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            {f(u.bulkSubmit, { n: picked.size })}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-fg-2">{u.bulkNames}</span>
            <button
              type="button"
              onClick={() => setPicked(allOn ? new Set() : new Set(entries.map((e) => e.key)))}
              className="state-layer h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium text-accent"
            >
              {allOn ? f(u.bulkSelected, { n: picked.size }) : u.selectAll}
            </button>
          </div>
          <NameStylePicker value={style} onChange={applyStyle} />
          <ul className="thin-scroll flex max-h-[38dvh] flex-col gap-1.5 overflow-y-auto rounded-l bg-bg p-1.5">
            {entries.map((e) => {
              const on = picked.has(e.key);
              const order = on ? entries.filter((x) => picked.has(x.key)).findIndex((x) => x.key === e.key) + 1 : null;
              return (
                <li key={e.key} className={cn("flex items-center gap-3 rounded-s p-1.5 pr-2 transition-colors", on ? "bg-raised" : "opacity-60")}>
                  {/* Cover = tombol pilih bernomor (urutan upload) */}
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={e.title}
                    onClick={() => toggle(e.key)}
                    className="group/thumb relative aspect-video w-[72px] shrink-0 cursor-pointer overflow-hidden rounded-[6px] bg-bg transition-transform duration-150 active:scale-[0.94]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.thumbnail}
                      alt=""
                      loading="lazy"
                      className={cn(
                        "size-full object-cover transition-[filter,transform] duration-300",
                        on ? "scale-[1.08] brightness-[0.42]" : "grayscale group-hover/thumb:grayscale-0",
                      )}
                    />
                    {on ? (
                      <span
                        key={order}
                        aria-hidden="true"
                        className="pick-pop absolute inset-0 m-auto grid size-6 place-items-center rounded-full bg-accent font-mono text-[11.5px] font-semibold tabular-nums text-on-accent"
                      >
                        {order}
                      </span>
                    ) : (
                      <span aria-hidden="true" className="absolute inset-0 m-auto size-5 rounded-full border-[1.5px] border-white/90 bg-black/30" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <Input
                      aria-label={`${u.name} — ${e.title}`}
                      maxLength={50}
                      disabled={!on}
                      value={names[e.key] ?? ""}
                      onChange={(ev) => {
                        setNames((s) => ({ ...s, [e.key]: ev.target.value }));
                        setStyle(null);
                      }}
                      className="h-10 text-[14px]"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Field label={u.creator}>
            {() => (
              <Segmented
                label={u.creator}
                value={form.creatorType}
                options={[
                  { value: "user", label: u.user },
                  { value: "group", label: u.group },
                ]}
                onChange={(creatorType) => set({ creatorType })}
              />
            )}
          </Field>
          <Field label={f(u.creatorId, { type: form.creatorType === "user" ? u.user : u.group })}>
            {({ id }) => (
              <Input
                id={id}
                inputMode="numeric"
                className="font-mono"
                value={form.creatorId}
                onChange={(e) => set({ creatorId: e.target.value.replace(/\D/g, "") })}
              />
            )}
          </Field>
        </div>

        <Field label={u.description}>
          {({ id }) => <Textarea id={id} rows={2} maxLength={1000} value={form.description} onChange={(e) => set({ description: e.target.value })} />}
        </Field>

        <Switch label={u.cover} hint={u.coverHint} checked={form.uploadCover} onChange={(uploadCover) => set({ uploadCover })} />

        <Field
          label={u.permission}
          hint={form.permission === "place" ? u.permPlaceHint : form.permission === "public" ? u.permPublicHint : undefined}
        >
          {() => (
            <Segmented
              label={u.permission}
              value={form.permission}
              options={[
                { value: "none", label: u.permNone },
                { value: "place", label: u.permPlace },
                { value: "public", label: u.permPublic },
              ]}
              onChange={(permission) => set({ permission })}
            />
          )}
        </Field>

        {form.permission === "place" && (
          <Field label={u.placeId} error={placeErr}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                inputMode="numeric"
                className="font-mono"
                value={form.placeId}
                onChange={(e) => {
                  set({ placeId: e.target.value.replace(/\D/g, "") });
                  setPlaceErr(null);
                }}
              />
            )}
          </Field>
        )}

        <div className="flex gap-3 rounded-l bg-warn/10 px-4 py-3 text-[13px] leading-relaxed text-fg-2">
          <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0 text-warn" />
          <p>
            {u.rights} {u.reviewNote}
          </p>
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

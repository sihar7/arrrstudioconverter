"use client";

import { useEffect, useRef, useState } from "react";
import { WarningTriangle } from "iconoir-react";
import { useT } from "@/hooks/useT";
import Dialog from "@/components/ui/Dialog";
import Button, { ButtonLink } from "@/components/ui/Button";
import Field, { Input } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";
import Progress from "@/components/ui/Progress";
import NameStylePicker from "@/components/roblox/NameStylePicker";
import { nameFor, type NameStyle } from "@/lib/shortName";
import type { HistoryItem } from "@/type/history";
import type { UploadForm } from "@/type/roblox";

type Result = { ok: true; coverFailed: boolean } | { ok: false; error: string; fatal: boolean };

interface Props {
  /** Yang bisa diupload (sudah disaring canUploadItem) */
  items: HistoryItem[];
  /** Terpilih tapi dilewati (kedaluwarsa / sudah di Roblox / format) */
  skipped: number;
  needKey: boolean;
  initial: Omit<UploadForm, "displayName" | "description">;
  upload: (item: HistoryItem, form: UploadForm) => Promise<Result>;
  /** Dipanggil sekali saat antrean berhenti (selesai / dihentikan) → muat ulang riwayat */
  onFinished: () => void;
  onClose: () => void;
}

/** Berapa lagu diupload bersamaan — kecil supaya tidak kena rem Roblox / BE */
const PARALLEL = 2;

type Phase = "setup" | "running" | "done";

/** Upload massal dari mode Pilih: atur sekali (nama, creator, izin, cover) → antrean berjalan dengan progres, bisa dihentikan */
export default function BulkUploadDialog({ items, skipped, needKey, initial, upload, onFinished, onClose }: Props) {
  const { t, f } = useT();
  const u = t.upload;
  const b = t.history.bulk;
  const [form, setForm] = useState(initial);
  const [style, setStyle] = useState<NameStyle>("short");
  const [placeErr, setPlaceErr] = useState<string | null>(null);
  const set = (patch: Partial<typeof form>) => setForm((s) => ({ ...s, ...patch }));

  const [phase, setPhase] = useState<Phase>("setup");
  const [done, setDone] = useState(0);
  const [okN, setOkN] = useState(0);
  const [coverFailN, setCoverFailN] = useState(0);
  const [failures, setFailures] = useState<{ id: string; title: string; error: string }[]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [stoppedByUser, setStoppedByUser] = useState(false);
  // Antrean tetap jalan di luar render: ref untuk berhenti + cegah setState setelah unmount
  const stopRef = useRef(false);
  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
      stopRef.current = true;
    },
    [],
  );

  const total = items.length;

  const run = async () => {
    if (form.permission === "place" && !/^\d{1,20}$/.test(form.placeId)) {
      setPlaceErr(u.placeId);
      return;
    }
    stopRef.current = false;
    setPhase("running");
    let next = 0;
    const worker = async () => {
      while (!stopRef.current && next < items.length) {
        const item = items[next++];
        if (aliveRef.current) setCurrent((c) => [...c, item.id]);
        const r = await upload(item, { ...form, displayName: nameFor(item.title, style), description: "" });
        if (!aliveRef.current) return;
        setCurrent((c) => c.filter((id) => id !== item.id));
        setDone((d) => d + 1);
        if (r.ok) {
          setOkN((n) => n + 1);
          if (r.coverFailed) setCoverFailN((n) => n + 1);
        } else {
          setFailures((fs) => [...fs, { id: item.id, title: item.title, error: r.error }]);
          // Key salah / kena rem → lagu berikutnya pasti gagal juga
          if (r.fatal) {
            stopRef.current = true;
            setFatal(r.error);
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
    onFinished();
    if (aliveRef.current) setPhase("done");
  };

  const stop = () => {
    stopRef.current = true;
    setStoppedByUser(true);
  };

  // Tutup saat berjalan = hentikan sisa antrean (yang sedang diupload tetap selesai di server)
  const close = () => {
    if (phase === "running") stop();
    onClose();
  };

  const left = total - done;
  const titleOf = (id: string) => items.find((i) => i.id === id)?.title ?? "";
  const summary =
    phase === "done"
      ? left > 0 || stoppedByUser || fatal
        ? f(b.stopped, { ok: okN, failed: failures.length, left })
        : f(b.done, { ok: okN, failed: failures.length })
      : null;

  return (
    <Dialog
      open
      onClose={close}
      title={f(b.title, { n: total })}
      sub={phase === "setup" ? b.sub : undefined}
      footer={
        needKey || phase === "done" ? (
          <Button onClick={onClose}>{t.common.close}</Button>
        ) : phase === "running" ? (
          <Button variant="subtle" disabled={stoppedByUser} onClick={stop}>
            {b.stop}
          </Button>
        ) : (
          <>
            <Button variant="subtle" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" disabled={!total || !/^\d+$/.test(form.creatorId)} onClick={run}>
              {f(b.start, { n: total })}
            </Button>
          </>
        )
      }
    >
      {needKey ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-[15px] text-fg-2">{u.needKey}</p>
          <ButtonLink href="/settings" variant="primary">
            {t.converter.panel.setupKey}
          </ButtonLink>
        </div>
      ) : phase === "setup" ? (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          {skipped > 0 && <p className="border-l-2 border-line-2 pl-3 text-[13px] leading-relaxed text-fg-3">{f(b.skipped, { n: skipped })}</p>}

          <Field label={b.nameFrom} hint={items[0] ? `${items[0].title} → ${nameFor(items[0].title, style)}` : undefined}>
            {() => <NameStylePicker value={style} onChange={setStyle} />}
          </Field>

          <Switch label={u.cover} hint={u.coverHint} checked={form.uploadCover} onChange={(uploadCover) => set({ uploadCover })} />

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
                <Input id={id} inputMode="numeric" className="font-mono" value={form.creatorId} onChange={(e) => set({ creatorId: e.target.value.replace(/\D/g, "") })} />
              )}
            </Field>
          </div>

          <Field label={u.permission} hint={form.permission === "place" ? u.permPlaceHint : form.permission === "public" ? u.permPublicHint : undefined}>
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

          <div className="flex gap-3 border-l-2 border-warn/60 bg-bg py-3 pl-4 pr-3 text-[13px] leading-relaxed text-fg-2">
            <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0 text-warn" />
            <p>
              {u.rights} {u.reviewNote}
            </p>
          </div>
          <button type="submit" hidden />
        </form>
      ) : (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-[26px] font-bold tabular-nums leading-none tracking-[-0.02em]">
              {f(b.progress, { done, total })}
            </p>
            <p className="font-mono text-[12px] text-fg-3">
              <span className="text-ok">{f(b.ok, { n: okN })}</span>
              {failures.length > 0 && <span className="text-err"> · {f(b.failed, { n: failures.length })}</span>}
            </p>
          </div>
          <Progress value={(done / Math.max(1, total)) * 100} tone={phase === "done" && failures.length && !okN ? "err" : phase === "done" ? "ok" : "accent"} label={f(b.progress, { done, total })} />

          {phase === "running" &&
            current.map((id) => (
              <p key={id} className="truncate text-[13px] text-fg-2">
                {f(b.now, { title: titleOf(id) })}
              </p>
            ))}
          {phase === "running" && <p className="text-[12.5px] text-fg-3">{b.closeHint}</p>}

          {summary && <p className="text-[14px] font-medium text-fg">{summary}</p>}
          {fatal && <p className="text-[13px] text-err">{f(b.fatal, { error: fatal })}</p>}
          {phase === "done" && coverFailN > 0 && <p className="text-[13px] text-fg-3">{f(b.coverFailed, { n: coverFailN })}</p>}

          {failures.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <p className="caps text-[10px] text-fg-3">{b.failedList}</p>
              <ul className="thin-scroll flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                {failures.map((x) => (
                  <li key={x.id} className="min-w-0 text-[12.5px] leading-snug">
                    <p className="truncate font-medium text-fg-2">{x.title}</p>
                    <p className="text-err">{x.error}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

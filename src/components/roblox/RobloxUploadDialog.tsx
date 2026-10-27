"use client";

import { useEffect, useState } from "react";
import { WarningTriangle } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import Dialog from "@/components/ui/Dialog";
import Button, { ButtonLink } from "@/components/ui/Button";
import Field, { Input, Textarea } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";
import { nameFor, type NameStyle } from "@/lib/shortName";
import { coverDataUrl } from "@/lib/trackMeta";
import { useAppSelector } from "@/store/hooks";
import NameStylePicker from "./NameStylePicker";
import type { UploadBlock, UploadForm } from "@/type/roblox";

interface Props {
  title: string;
  /** Cover album (atau thumbnail video) + artis — pratinjau Decal; tanpa cover = opsi Decal disembunyikan */
  cover?: string;
  artist?: string | null;
  /** Untuk pratinjau cover otomatis (pola per lagu) */
  videoId?: string;
  block: UploadBlock;
  initial: UploadForm;
  onClose: () => void;
  onSubmit: (form: UploadForm) => Promise<boolean>;
}

export default function RobloxUploadDialog({ title, cover, artist, videoId, block, initial, onClose, onSubmit }: Props) {
  const { t, f } = useT();
  const u = t.upload;
  const [form, setForm] = useState<UploadForm>(initial);
  const [busy, setBusy] = useState(false);
  const [style, setStyle] = useState<NameStyle | null>("short");
  const [placeErr, setPlaceErr] = useState<string | null>(null);
  const set = (patch: Partial<UploadForm>) => setForm((s) => ({ ...s, ...patch }));

  // Cover otomatis → pratinjau persis gambar yang akan diupload sebagai Decal
  const coverStyle = useAppSelector((s) => s.roblox.coverStyle);
  const [autoCover, setAutoCover] = useState<string | null>(null);
  const wantAuto = Boolean(cover && videoId && coverStyle === "safe" && form.uploadCover);
  useEffect(() => {
    if (!wantAuto) return;
    let alive = true;
    coverDataUrl(cover!, videoId!, { style: "safe", text: { title, artist: artist ?? null } })
      .then((url) => alive && setAutoCover(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wantAuto, cover, videoId, title, artist]);
  const shownCover = wantAuto ? (autoCover ?? cover) : cover;

  const submit = async () => {
    if (form.permission === "place" && !/^\d{1,20}$/.test(form.placeId)) {
      setPlaceErr(u.placeId);
      return;
    }
    setBusy(true);
    const ok = await onSubmit(form);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={u.title}
      sub={u.sub}
      footer={
        block ? (
          <Button onClick={onClose}>{t.common.close}</Button>
        ) : (
          <>
            <Button variant="subtle" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" loading={busy} disabled={!form.displayName.trim() || !/^\d+$/.test(form.creatorId)} onClick={submit}>
              {busy ? u.uploading : u.submit}
            </Button>
          </>
        )
      }
    >
      {block === "key" || block === "login" ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-[15px] text-fg-2">{block === "login" ? t.converter.loginToUpload : u.needKey}</p>
          <ButtonLink href={block === "login" ? "/login?next=/converter" : "/settings"} variant="primary">
            {block === "login" ? t.nav.login : t.converter.panel.setupKey}
          </ButtonLink>
        </div>
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {cover ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shownCover}
                alt={wantAuto ? u.coverPreview : ""}
                title={wantAuto ? u.coverPreview : undefined}
                className={cn("shrink-0 rounded-[10px] bg-fg/[0.07] object-cover transition-[width,height] duration-200", wantAuto ? "size-20" : "size-12")}
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-fg-2">{title}</p>
                {artist && <p className="mt-0.5 truncate text-[12.5px] text-fg-3">{artist}</p>}
              </div>
            </div>
          ) : (
            <p className="line-clamp-2 border-l-2 border-line-2 pl-3 text-[13.5px] text-fg-3">{title}</p>
          )}

          <Field label={u.name} hint={u.nameHelp} aside={<span className="font-mono text-[11px] text-fg-3">{form.displayName.length}/50</span>}>
            {({ id, describedBy }) => (
              <div className="flex flex-col gap-1">
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  maxLength={50}
                  value={form.displayName}
                  onChange={(e) => {
                    set({ displayName: e.target.value });
                    setStyle(null);
                  }}
                />
                <NameStylePicker
                  value={style}
                  onChange={(s) => {
                    setStyle(s);
                    set({ displayName: nameFor(title, s) });
                  }}
                />
              </div>
            )}
          </Field>

          <Field label={u.description}>
            {({ id }) => <Textarea id={id} rows={2} maxLength={1000} value={form.description} onChange={(e) => set({ description: e.target.value })} />}
          </Field>

          {cover && <Switch label={u.cover} hint={u.coverHint} checked={form.uploadCover} onChange={(uploadCover) => set({ uploadCover })} />}

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

          <div className="flex gap-3 border-l-2 border-warn/60 bg-bg py-3 pl-4 pr-3 text-[13px] leading-relaxed text-fg-2">
            <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0 text-warn" />
            <p>
              {u.rights} {u.reviewNote}
            </p>
          </div>
          {/* Enter di field mana pun mengirim form */}
          <button type="submit" hidden />
        </form>
      )}
      {block === "format" && <p className="text-[15px] text-fg-2">{t.converter.robloxFormatOnly}</p>}
    </Dialog>
  );
}

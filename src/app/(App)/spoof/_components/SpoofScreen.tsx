"use client";

import { useState } from "react";
import { WarningTriangle, Xmark } from "iconoir-react";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import PageHeader from "@/components/shared/PageHeader";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Button, { ButtonLink } from "@/components/ui/Button";
import Field, { Input, Textarea } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";
import Spinner from "@/components/ui/Spinner";
import { SfSpoof } from "@/components/icons/SfIcons";
import { MAX_IDS, useSpoof, type SpoofSettings } from "../_hooks/useSpoof";
import { parseAssetIds } from "../_service/spoof.service";
import SpoofResultCard from "./SpoofResultCard";
import type { SpoofKind } from "@/type/spoof";

/** Spoof animasi / audio: tempel ID → file untuk Studio + upload ulang otomatis ke akun / grup sendiri */
export default function SpoofScreen() {
  const { t, f } = useT();
  const S = t.spoof;
  const u = t.upload;
  const roblox = useAppSelector((s) => s.roblox);
  const sp = useSpoof();

  const [kind, setKind] = useState<SpoofKind>("animation");
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<SpoofSettings>(() => ({
    autoUpload: true,
    creatorType: roblox.creatorType,
    creatorId: roblox.creatorId,
    permission: roblox.defaultPermission,
    placeId: roblox.placeId,
  }));
  const set = (p: Partial<SpoofSettings>) => setSettings((s) => ({ ...s, ...p }));

  const ids = parseAssetIds(text, MAX_IDS);
  const hasKey = Boolean(roblox.apiKey);
  const placeOk = !settings.autoUpload || settings.permission !== "place" || /^\d{1,20}$/.test(settings.placeId);
  const ready = hasKey && /^\d{1,20}$/.test(settings.creatorId) && placeOk;
  const running = sp.pending.filter((p) => !p.error);
  const failed = sp.pending.filter((p) => p.error);

  const submit = () => {
    if (!ready || !ids.length || sp.busy) return;
    void sp.start(ids, kind, settings);
    setText("");
  };

  return (
    <div className="flex flex-col gap-8 pb-24">
      <PageHeader eyebrow={S.eyebrow} title={S.title} sub={S.sub} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] desk:gap-4">
        <div className="flex min-w-0 flex-col gap-6 desk:gap-4">
          {/* Input ID */}
          <CardBox className="rise">
            <form
              className="flex flex-col gap-4 p-5 desk:p-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <Segmented
                label={S.kind}
                value={kind}
                options={[
                  { value: "animation", label: S.kindAnimation },
                  { value: "audio", label: S.kindAudio },
                ]}
                onChange={setKind}
              />
              <Field label={S.ids} hint={f(S.idsHint, { n: MAX_IDS })}>
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    className="font-mono"
                    placeholder={S.idsPlaceholder}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                  />
                )}
              </Field>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto sm:self-end"
                disabled={!ready || !ids.length || sp.busy}
                loading={sp.busy}
                icon={<SfSpoof size={18} />}
              >
                {ids.length > 1 ? f(S.startMany, { n: ids.length }) : S.start}
              </Button>
            </form>
          </CardBox>

          {/* Hasil */}
          <CardBox className="rise">
            <CardHeader
              title={S.resultsTitle}
              aside={
                sp.items.length > 0 && (
                  <Button size="sm" variant="subtle" disabled={sp.busy} onClick={() => void sp.clear()}>
                    {S.clear}
                  </Button>
                )
              }
            />
            {running.map((p) => (
              <div key={`run-${p.sourceId}`} className="flex items-center gap-3 border-b border-[var(--hairline)] px-5 py-4 text-[14px] desk:px-4 desk:py-3 desk:text-[13px]">
                <Spinner className="size-4 text-fg-3" />
                <span className="min-w-0 flex-1 truncate text-fg-2">
                  {S.working} <span className="font-mono text-fg">{p.sourceId}</span>
                </span>
              </div>
            ))}
            {failed.map((p) => (
              <div key={`err-${p.sourceId}`} className="flex items-start gap-3 border-b border-[var(--hairline)] px-5 py-4 text-[14px] desk:px-4 desk:py-3 desk:text-[13px]">
                <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0 text-err" aria-hidden="true" />
                <p className="min-w-0 flex-1 leading-relaxed text-fg-2">
                  <span className="font-mono text-fg">{p.sourceId}</span> — {p.error}
                </p>
                <button
                  type="button"
                  onClick={() => sp.dismiss(p.sourceId)}
                  aria-label={S.dismiss}
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[8px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
                >
                  <Xmark width={16} height={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            {sp.items.map((rec) => (
              <SpoofResultCard
                key={rec.id}
                rec={rec}
                uploading={running.some((p) => p.sourceId === rec.sourceId)}
                onUploadNow={() => void sp.uploadNow(rec, settings)}
              />
            ))}
            {sp.loaded && !sp.items.length && !sp.pending.length && <EmptyState icon={<SfSpoof size={24} />} title={S.emptyTitle} sub={S.emptySub} />}
            {!sp.loaded && (
              <div className="grid place-items-center py-16">
                <Spinner className="size-5 text-fg-3" />
              </div>
            )}
          </CardBox>
        </div>

        {/* Pengaturan upload ulang */}
        <CardBox as="aside" className="rise lg:sticky lg:top-[calc(var(--nav-h)+24px)] desk:lg:top-4">
          <CardHeader title={S.settingsTitle} />
          <div className="flex flex-col gap-5 p-5 desk:gap-4 desk:p-4">
            {!hasKey && (
              <div className="flex flex-col gap-3 rounded-l bg-warn/10 px-4 py-3 text-[13px] leading-relaxed text-fg-2">
                <p className="flex gap-2">
                  <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
                  {S.needKey}
                </p>
                <ButtonLink href="/settings" size="sm" variant="tonal" className="self-start">
                  {t.converter.panel.setupKey}
                </ButtonLink>
              </div>
            )}

            <Switch label={S.autoUpload} hint={S.autoUploadHint} checked={settings.autoUpload} onChange={(autoUpload) => set({ autoUpload })} />

            <Field label={u.creator}>
              {() => (
                <Segmented
                  label={u.creator}
                  value={settings.creatorType}
                  options={[
                    { value: "user", label: u.user },
                    { value: "group", label: u.group },
                  ]}
                  onChange={(creatorType) => set({ creatorType })}
                />
              )}
            </Field>
            <Field label={f(u.creatorId, { type: settings.creatorType === "user" ? u.user : u.group })}>
              {({ id }) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  className="font-mono"
                  value={settings.creatorId}
                  onChange={(e) => set({ creatorId: e.target.value.replace(/\D/g, "") })}
                />
              )}
            </Field>

            {settings.autoUpload && (
              <>
                <Field
                  label={u.permission}
                  hint={settings.permission === "place" ? u.permPlaceHint : settings.permission === "public" ? u.permPublicHint : undefined}
                >
                  {() => (
                    <Segmented
                      label={u.permission}
                      value={settings.permission}
                      options={[
                        { value: "none", label: u.permNone },
                        { value: "place", label: u.permPlace },
                        { value: "public", label: u.permPublic },
                      ]}
                      onChange={(permission) => set({ permission })}
                    />
                  )}
                </Field>
                {settings.permission === "place" && (
                  <Field label={u.placeId}>
                    {({ id }) => (
                      <Input
                        id={id}
                        inputMode="numeric"
                        className="font-mono"
                        value={settings.placeId}
                        onChange={(e) => set({ placeId: e.target.value.replace(/\D/g, "") })}
                      />
                    )}
                  </Field>
                )}
              </>
            )}

            <p className="text-[12.5px] leading-relaxed text-fg-3">{S.accessNote}</p>
          </div>
        </CardBox>
      </div>
    </div>
  );
}

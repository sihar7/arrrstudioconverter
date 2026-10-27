"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Clock, MusicDoubleNote, Plus, Upload, WarningTriangle } from "iconoir-react";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import PageHeader from "@/components/shared/PageHeader";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button, { ButtonLink } from "@/components/ui/Button";
import Field, { Input, Textarea } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import { ACCEPT, MAX_FILES, useFileUpload, type UploadSettings } from "../_hooks/useFileUpload";
import FileRow from "./FileRow";

/** Upload file audio dari perangkat ke Roblox — satuan (tombol per baris) atau sekaligus */
export default function UploadScreen() {
  const { t, f } = useT();
  const U = t.fileUpload;
  const u = t.upload;
  const roblox = useAppSelector((s) => s.roblox);
  const up = useFileUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const [settings, setSettings] = useState<UploadSettings>(() => ({
    creatorType: roblox.creatorType,
    creatorId: roblox.creatorId,
    description: "",
    permission: roblox.defaultPermission,
    placeId: roblox.placeId,
  }));
  const set = (p: Partial<UploadSettings>) => setSettings((s) => ({ ...s, ...p }));

  const hasKey = Boolean(roblox.apiKey);
  const placeOk = settings.permission !== "place" || /^\d{1,20}$/.test(settings.placeId);
  const ready = hasKey && /^\d{1,20}$/.test(settings.creatorId) && placeOk;
  const pending = up.items.filter((i) => i.status === "idle" || i.status === "error").length;
  const doneCount = up.items.filter((i) => i.status === "done").length;

  // Pratinjau: satu elemen audio untuk semua baris
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const togglePlay = (key: string, url: string) => {
    audio.current ??= new Audio();
    const a = audio.current;
    a.onended = () => setPlaying(null);
    if (playing === key) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = url;
    void a.play().then(() => setPlaying(key)).catch(() => setPlaying(null));
  };
  const remove = (key: string) => {
    if (playing === key) {
      audio.current?.pause();
      setPlaying(null);
    }
    up.remove(key);
  };

  const onDrag = (e: DragEvent, kind: "enter" | "leave" | "over" | "drop") => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    if (kind === "enter") dragDepth.current++;
    if (kind === "leave") dragDepth.current--;
    if (kind === "drop") {
      dragDepth.current = 0;
      up.add(Array.from(e.dataTransfer.files));
    }
    setDragging(dragDepth.current > 0);
  };

  const picker = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={[...ACCEPT, "audio/mpeg", "audio/ogg", "audio/wav", "audio/flac"].join(",")}
      className="hidden"
      onChange={(e) => {
        if (e.target.files) up.add(Array.from(e.target.files));
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="flex flex-col gap-8 pb-24">
      <PageHeader
        eyebrow={U.eyebrow}
        title={U.title}
        sub={U.sub}
        actions={
          <ButtonLink href="/history" variant="ghost" icon={<Clock width={16} height={16} aria-hidden="true" />}>
            {U.openHistory}
          </ButtonLink>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] desk:gap-4">
        <CardBox
          className={cn("rise relative overflow-hidden transition-shadow duration-200", dragging && "shadow-[0_0_0_2px_var(--accent)]")}
        >
          <div
            onDragEnter={(e) => onDrag(e, "enter")}
            onDragLeave={(e) => onDrag(e, "leave")}
            onDragOver={(e) => onDrag(e, "over")}
            onDrop={(e) => onDrag(e, "drop")}
          >
            {picker}
            {up.items.length === 0 ? (
              // Kosong: seluruh kartu = area lepas file, tombol untuk keyboard/sentuh
              <div className="flex flex-col items-center px-6 py-16 text-center sm:py-20">
                <div
                  className={cn(
                    "forged-tile flex size-16 items-center justify-center rounded-l text-fg transition-transform duration-300 ease-[var(--ease)]",
                    dragging && "-translate-y-1 scale-105",
                  )}
                >
                  <MusicDoubleNote width={24} height={24} aria-hidden="true" />
                </div>
                <p className="mt-6 font-display text-[19px] font-bold tracking-[-0.02em]">{dragging ? U.dropActive : U.dropTitle}</p>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-fg-2">{f(U.dropSub, { n: MAX_FILES })}</p>
                <Button variant="primary" className="mt-7" icon={<Plus aria-hidden="true" />} onClick={() => inputRef.current?.click()}>
                  {U.pick}
                </Button>
              </div>
            ) : (
              <>
                <CardHeader
                  title={
                    <>
                      {U.listTitle}
                      <span className="font-mono text-[13px] font-medium text-fg-3">{f(U.summary, { done: doneCount, total: up.items.length })}</span>
                    </>
                  }
                  aside={
                    <div className="flex flex-wrap items-center gap-1.5">
                      {doneCount > 0 && (
                        <Button size="sm" variant="subtle" onClick={() => up.clear(true)}>
                          {U.clearDone}
                        </Button>
                      )}
                      <Button size="sm" variant="subtle" disabled={up.busy} onClick={() => up.clear(false)}>
                        {U.clearAll}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Plus aria-hidden="true" />} onClick={() => inputRef.current?.click()}>
                        {U.addMore}
                      </Button>
                    </div>
                  }
                />
                <ul>
                  {up.items.map((it) => (
                    <FileRow
                      key={it.key}
                      item={it}
                      playing={playing === it.key}
                      canUpload={ready}
                      onPlay={() => togglePlay(it.key, it.url)}
                      onRename={(name) => up.rename(it.key, name)}
                      onUpload={() => void up.uploadSingle(it.key, settings)}
                      onRemove={() => remove(it.key)}
                    />
                  ))}
                </ul>
                <p
                  className={cn(
                    "flex h-11 items-center justify-center border-t border-[var(--hairline)] px-4 text-[13px] transition-colors",
                    dragging ? "bg-accent/[0.08] text-accent" : "text-fg-3",
                  )}
                >
                  {dragging ? U.dropActive : f(U.dropSub, { n: MAX_FILES })}
                </p>
              </>
            )}
          </div>
        </CardBox>

        {/* Pengaturan bersama + aksi massal */}
        <CardBox as="aside" className="rise lg:sticky lg:top-[calc(var(--nav-h)+24px)] desk:lg:top-4">
          <CardHeader title={U.settingsTitle} />
          <form
            className="flex flex-col gap-5 p-5 desk:gap-4 desk:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && pending) void up.uploadAll(settings);
            }}
          >
            {!hasKey && (
              <div className="flex flex-col gap-3 rounded-l bg-warn/10 px-4 py-3 text-[13px] leading-relaxed text-fg-2">
                <p className="flex gap-2">
                  <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
                  {u.needKey}
                </p>
                <ButtonLink href="/settings" size="sm" variant="tonal" className="self-start">
                  {t.converter.panel.setupKey}
                </ButtonLink>
              </div>
            )}

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
            <Field label={u.description}>
              {({ id }) => <Textarea id={id} rows={2} maxLength={1000} value={settings.description} onChange={(e) => set({ description: e.target.value })} />}
            </Field>
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

            <p className="text-[12.5px] leading-relaxed text-fg-3">{U.nameHint}</p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!ready || !pending}
              icon={<Upload aria-hidden="true" />}
            >
              {U.uploadAll}
              {pending > 0 && <span className="font-mono opacity-80">{pending}</span>}
            </Button>

            <p className="text-[12.5px] leading-relaxed text-fg-3">
              {u.rights} {u.reviewNote} {U.historyNote}
            </p>
          </form>
        </CardBox>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { ListSelect, ShieldCheck, Trash, WarningTriangle, Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import { useSelectMode } from "@/hooks/useSelectMode";
import SelectionDock from "@/components/shared/SelectionDock";
import PageHeader from "@/components/shared/PageHeader";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import { AccountPicker } from "@/components/shared/RobloxAccounts";
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
import SpoofResultGroup from "./SpoofResultGroup";
import KindPicker from "./KindPicker";
import type { SpoofWant } from "@/type/spoof";

/** Spoof aset (animasi, audio, gambar, mesh, model, video): tempel ID → file + upload ulang otomatis ke akun / grup sendiri */
export default function SpoofScreen() {
  const { t, f } = useT();
  const S = t.spoof;
  const u = t.upload;
  const roblox = useAppSelector((s) => s.roblox);
  const sp = useSpoof();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();

  const [kind, setKind] = useState<SpoofWant>("auto");
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<SpoofSettings>(() => ({
    autoUpload: true,
    creatorType: roblox.creatorType,
    creatorId: roblox.creatorId,
    permission: roblox.defaultPermission,
    placeId: roblox.placeId,
  }));
  const set = (p: Partial<SpoofSettings>) => setSettings((s) => ({ ...s, ...p }));
  // "access" = ID tetap, game diberi izin pakai; "reupload" = unduh + upload ulang jadi ID baru
  const [action, setAction] = useState<"reupload" | "access">("reupload");
  const access = action === "access";
  // Tujuan akses: komunitas (default ID grup dari pengaturan), game, atau publik (Open Use, tanpa ID tujuan)
  const [grantKind, setGrantKind] = useState<"group" | "place" | "open">("group");
  const [groupId, setGroupId] = useState(() => (roblox.creatorType === "group" ? roblox.creatorId : ""));
  const openUse = grantKind === "open";
  const grantId = grantKind === "group" ? groupId : openUse ? "" : settings.placeId;

  const ids = parseAssetIds(text, MAX_IDS);
  const hasKey = Boolean(roblox.apiKey);
  const placeValid = /^\d{1,20}$/.test(settings.placeId);
  const placeOk = !settings.autoUpload || settings.permission !== "place" || placeValid;
  const ready = access ? hasKey && (openUse || /^\d{1,20}$/.test(grantId)) : hasKey && /^\d{1,20}$/.test(settings.creatorId) && placeOk;
  const running = sp.pending.filter((p) => !p.error);

  // Hasil kembar digabung: satu baris per pesan (bukan puluhan baris pesan yang sama)
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; ok: boolean; message: string; ids: string[]; grant: boolean }>();
    const add = (key: string, ok: boolean, message: string, id: string, grant: boolean) => {
      const g = map.get(key) ?? { key, ok, message, ids: [], grant };
      g.ids.push(id);
      map.set(key, g);
    };
    for (const g of sp.grants) {
      const msg = g.error ?? (g.target.kind === "open" ? S.grantDoneOpen : f(g.target.kind === "group" ? S.grantDoneGroup : S.grantDone, { id: g.target.id }));
      add(`grant:${g.error ? "err" : "ok"}:${msg}`, !g.error, msg, g.assetId, true);
    }
    for (const p of sp.pending) if (p.error) add(`spoof:${p.error}`, false, p.error, p.sourceId, false);
    // Gagal di atas, berhasil di bawah
    return [...map.values()].sort((a, b) => Number(a.ok) - Number(b.ok));
  }, [sp.grants, sp.pending, S, f]);
  const idsRef = useRef<HTMLTextAreaElement>(null);
  const refill = (list: string[]) => {
    setText(list.join("\n"));
    idsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    idsRef.current?.focus({ preventScroll: true });
  };

  const recordIds = useMemo(() => sp.items.map((r) => r.id), [sp.items]);
  const [asking, setAsking] = useState(false);
  const sel = useSelectMode(recordIds, undefined, asking);
  const { selecting, picked } = sel;
  const selected = recordIds.filter((id) => picked.has(id));

  /** ids → hapus terpilih; tanpa ids → semua. Selalu minta konfirmasi dulu */
  const removeRecords = async (ids?: string[]) => {
    const n = ids?.length ?? sp.items.length;
    if (!n) return;
    setAsking(true);
    const yes = await confirm(f(ids ? S.deleteSelConfirm : S.deleteAllConfirm, { n }));
    setAsking(false);
    if (!yes || !(await sp.remove(ids))) return;
    toast(f(S.deleted, { n }), "ok");
    sel.exit();
  };

  /** Hapus semua: baris hasil izin/gagal langsung ditutup; catatan spoof tersimpan → konfirmasi dulu */
  const clearAll = async () => {
    sp.clearResults();
    if (sp.items.length) await removeRecords();
  };

  const submit = async () => {
    if (!ready || !ids.length || sp.busy) return;
    // Open Use permanen (Roblox tidak bisa mengembalikannya ke privat) → selalu minta konfirmasi
    if (access && openUse) {
      setAsking(true);
      const yes = await confirm(f(S.openConfirm, { n: ids.length }), { title: S.openConfirmTitle, confirmLabel: S.openConfirmOk, variant: "primary" });
      setAsking(false);
      if (!yes) return;
    }
    if (access) void sp.grant(ids, { kind: grantKind, id: grantId });
    else void sp.start(ids, kind, settings);
    setText("");
  };

  return (
    <div className={cn("flex flex-col gap-8 pb-24", selecting && "pb-36")}>
      <PageHeader eyebrow={S.eyebrow} title={S.title} sub={S.sub} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] desk:gap-4">
        <div className="flex min-w-0 flex-col gap-6 desk:gap-4">
          {/* Input ID */}
          <CardBox className="rise">
            <form
              className="flex flex-col gap-4 p-5 desk:p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {!access && <KindPicker value={kind} onChange={setKind} />}
              <Field label={S.ids} hint={f(S.idsHint, { n: MAX_IDS })}>
                {({ id }) => (
                  <Textarea
                    ref={idsRef}
                    id={id}
                    rows={3}
                    className="font-mono"
                    placeholder={S.idsPlaceholder}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        void submit();
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
                icon={access ? <ShieldCheck width={18} height={18} /> : <SfSpoof size={18} />}
              >
                {access
                  ? ids.length > 1 ? f(S.grantMany, { n: ids.length }) : S.grantStart
                  : ids.length > 1 ? f(S.startMany, { n: ids.length }) : S.start}
              </Button>
            </form>
          </CardBox>

          {/* Hasil */}
          <CardBox className="rise">
            <CardHeader
              title={S.resultsTitle}
              aside={
                (sp.items.length > 0 || groups.length > 0) && (
                  <div className="flex gap-1.5">
                    {sp.items.length > 0 && (
                      <Button
                        size="sm"
                        variant={selecting ? "primary" : "subtle"}
                        icon={selecting ? <Xmark width={15} height={15} /> : <ListSelect width={15} height={15} />}
                        onClick={() => (selecting ? sel.exit() : sel.start())}
                        aria-pressed={selecting}
                      >
                        {selecting ? S.cancelSelect : S.select}
                      </Button>
                    )}
                    {!selecting && (
                      <Button size="sm" variant="subtle" disabled={sp.busy} icon={<Trash width={15} height={15} />} onClick={() => void clearAll()}>
                        {S.clear}
                      </Button>
                    )}
                  </div>
                )
              }
            />
            {groups.map((g) => (
              <SpoofResultGroup
                key={g.key}
                ok={g.ok}
                message={g.message}
                ids={g.ids}
                onDismiss={() => (g.grant ? sp.dismissGrant(g.ids) : sp.dismiss(g.ids))}
                onRefill={g.ok ? undefined : () => refill(g.ids)}
              />
            ))}
            {running.map((p) => (
              <div key={`run-${p.sourceId}`} className="flex items-center gap-3 border-b border-[var(--hairline)] px-5 py-4 text-[14px] desk:px-4 desk:py-3 desk:text-[13px]">
                <Spinner className="size-4 text-fg-3" />
                <span className="min-w-0 flex-1 truncate text-fg-2">
                  {S.working} <span className="font-mono text-fg">{p.sourceId}</span>
                </span>
              </div>
            ))}
            {selecting && <p className="fade-swap border-b border-[var(--hairline)] px-5 py-2.5 text-[13px] text-fg-3 desk:px-4">{S.selectHint}</p>}
            {sp.items.map((rec) => (
              <SpoofResultCard
                key={rec.id}
                rec={rec}
                uploading={running.some((p) => p.sourceId === rec.sourceId)}
                onUploadNow={() => void sp.uploadNow(rec, settings)}
                selecting={selecting}
                selected={picked.has(rec.id)}
                onToggle={(shift) => sel.toggle(rec.id, shift)}
                onLongPress={() => sel.start(rec.id)}
              />
            ))}
            {sp.loaded && !sp.items.length && !sp.pending.length && !sp.grants.length && <EmptyState icon={<SfSpoof size={24} />} title={S.emptyTitle} sub={S.emptySub} />}
            {!sp.loaded && (
              <div className="grid place-items-center py-16">
                <Spinner className="size-5 text-fg-3" />
              </div>
            )}
          </CardBox>
        </div>

        {/* Pengaturan upload ulang */}
        <CardBox as="aside" className="rise lg:sticky lg:top-[calc(var(--nav-h)+24px)] desk:lg:top-4">
          <CardHeader title={access ? S.accessTitle : S.settingsTitle} aside={<AccountPicker />} />
          <div className="flex flex-col gap-5 p-5 desk:gap-4 desk:p-4">
            <Field label={S.action} hint={access ? S.accessHint : undefined}>
              {() => (
                <Segmented
                  label={S.action}
                  value={action}
                  options={[
                    { value: "reupload", label: S.actionReupload },
                    { value: "access", label: S.actionAccess },
                  ]}
                  onChange={setAction}
                />
              )}
            </Field>
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

            {access ? (
              <>
                <Field label={S.grantTo}>
                  {() => (
                    <Segmented
                      label={S.grantTo}
                      value={grantKind}
                      options={[
                        { value: "group", label: S.grantToGroup },
                        { value: "place", label: S.grantToPlace },
                        { value: "open", label: S.grantToOpen },
                      ]}
                      onChange={setGrantKind}
                    />
                  )}
                </Field>
                {openUse ? (
                  <p className="text-[13px] leading-relaxed text-fg-2 desk:text-[12px]">{S.accessOpenHint}</p>
                ) : (
                <Field label={grantKind === "group" ? S.groupIdLabel : u.placeId} hint={grantKind === "group" ? S.accessGroupHint : S.accessPlaceHint}>
                  {({ id }) => (
                    <Input
                      id={id}
                      inputMode="numeric"
                      className="font-mono"
                      value={grantId}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        if (grantKind === "group") setGroupId(v);
                        else set({ placeId: v });
                      }}
                    />
                  )}
                </Field>
                )}
              </>
            ) : (
              <>
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
              <Field
                label={f(u.creatorId, { type: settings.creatorType === "user" ? u.user : u.group })}
                hint={settings.creatorType === "group" ? S.groupHint : undefined}
              >
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
              </>
            )}

            <p className="text-[12.5px] leading-relaxed text-fg-3">{S.accessNote}</p>
          </div>
        </CardBox>
      </div>

      {/* Dock aksi mode pilih — sama seperti Riwayat */}
      <SelectionDock
        open={selecting}
        count={selected.length}
        label={selected.length ? t.common.pickedWord : t.common.tapToSelect}
        onExit={sel.exit}
        quick={[
          selected.length === recordIds.length
            ? { key: "none", label: S.selectNone, n: 0, onClick: () => sel.pick([]) }
            : { key: "all", label: S.selectAll, n: recordIds.length, onClick: () => sel.pick(recordIds) },
        ]}
      >
        <Button variant="danger" size="sm" disabled={!selected.length} onClick={() => void removeRecords(selected)} icon={<Trash aria-hidden="true" />}>
          {f(S.deleteSelected, { n: selected.length })}
        </Button>
      </SelectionDock>
      {confirmDialog}
    </div>
  );
}

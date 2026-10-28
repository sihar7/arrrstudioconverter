"use client";

import { useState } from "react";
import { Undo } from "iconoir-react";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Field, { Input, Select } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
import { PLAN_IDS, type PlanId, type TokenRules } from "@/lib/schemas/plans";
import { baseApi } from "@/store/api/baseApi";
import { useAppDispatch } from "@/store/hooks";
import { PLAN_TUNABLE, type PlanOverrides, type PlanSettings, type PlanTunable, type TunableLimits } from "@/type/admin";
import { getPlanSettings, savePlanSettings } from "../_service/admin.service";
import { errorText, useAdminData, useAuthGuard } from "../_hooks/useAdmin";
import { ErrorBox, nf } from "./parts";

const PLAN_LABEL: Record<PlanId, string> = { free: "Free", pro: "Pro", studio: "Studio" };
const BITRATES = [96, 128, 192, 256, 320] as const;

interface Spec {
  label: string;
  hint: string;
  unit: string;
  /** nilai server = nilai form × scale (mis. detik ↔ menit) */
  scale?: number;
  min: number;
  max: number;
  /** kosong = null (tanpa batas) */
  nullable?: boolean;
}

// Batas min/max sama dengan validasi zod di BE (planConfig.ts), dalam satuan form
const SPEC: Record<PlanTunable, Spec> = {
  tokens: { label: "Token per periode", hint: "Terisi penuh lagi tiap periode. Kosongkan = tanpa batas.", unit: "token", min: 0, max: 100_000, nullable: true },
  maxDurationSec: { label: "Durasi video maksimal", hint: "Video lebih panjang ditolak.", unit: "menit", scale: 60, min: 1, max: 240 },
  playlistMax: { label: "Item playlist maksimal", hint: "Sekali impor playlist.", unit: "item", min: 1, max: 1000 },
  parallel: { label: "Konversi bersamaan", hint: "Per akun.", unit: "job", min: 1, max: 20 },
  maxBitrate: { label: "Bitrate maksimal", hint: "Pilihan di atas ini dikunci.", unit: "kbps", min: 96, max: 320 },
  fileTtlHours: { label: "Masa simpan file", hint: "Lama hasil bisa diunduh.", unit: "jam", min: 1, max: 720 },
  historyMax: { label: "Entri riwayat", hint: "Yang lebih lama dibuang.", unit: "entri", min: 10, max: 20_000 },
  bulkRoblox: { label: "Upload massal Roblox", hint: "0 = tidak bisa. Kosongkan = tanpa batas.", unit: "lagu", min: 0, max: 1000, nullable: true },
  imageMaxSide: { label: "Sisi gambar maksimal", hint: "Hapus background & Upscale.", unit: "px", min: 256, max: 8192 },
};

type TokenKey = keyof TokenRules;
// Sama dengan validasi zod di BE (planConfig.ts → overridesSchema.tokens)
const TOKEN_SPEC: Record<TokenKey, Spec> = {
  windowHours: { label: "Periode isi ulang", hint: "Token terisi penuh lagi sekian jam sejak token pertama dipakai.", unit: "jam", min: 1, max: 168 },
  minutesPerToken: { label: "Menit audio per token", hint: "Mis. 5 menit/token: lagu 4 menit = 1 token, 12 menit = 3 token.", unit: "menit", min: 1, max: 240 },
};
const TOKEN_KEYS = Object.keys(TOKEN_SPEC) as TokenKey[];

type Draft = { guest: string; tokens: Record<TokenKey, string>; plans: Record<PlanId, Record<PlanTunable, string>> };

const toText = (k: PlanTunable, v: number | null) => (v == null ? "" : String(v / (SPEC[k].scale ?? 1)));

const toDraft = (s: PlanSettings): Draft => ({
  guest: String(s.effective.guest),
  tokens: { windowHours: String(s.effective.tokens.windowHours), minutesPerToken: String(s.effective.tokens.minutesPerToken) },
  plans: Object.fromEntries(
    PLAN_IDS.map((id) => [id, Object.fromEntries(PLAN_TUNABLE.map((k) => [k, toText(k, s.effective.plans[id][k])]))]),
  ) as Draft["plans"],
});

/** Teks form → nilai server; string = pesan error */
function parse(k: PlanTunable, text: string): number | null | string {
  const s = SPEC[k];
  const t = text.trim();
  if (!t) return s.nullable ? null : "Wajib diisi";
  const n = Number(t);
  if (!Number.isInteger(n)) return "Harus bilangan bulat";
  if (n < s.min || n > s.max) return `Antara ${nf(s.min)}–${nf(s.max)}`;
  return n * (s.scale ?? 1);
}

function parseGuest(text: string): number | string {
  const n = Number(text.trim());
  if (!text.trim() || !Number.isInteger(n)) return "Harus bilangan bulat";
  return n < 0 || n > 100 ? "Antara 0–100" : n;
}

function parseToken(k: TokenKey, text: string): number | string {
  const s = TOKEN_SPEC[k];
  const n = Number(text.trim());
  if (!text.trim() || !Number.isInteger(n)) return "Harus bilangan bulat";
  return n < s.min || n > s.max ? `Antara ${nf(s.min)}–${nf(s.max)}` : n;
}

const show = (k: PlanTunable, v: number | null) => (v == null ? "tanpa batas" : `${nf(v / (SPEC[k].scale ?? 1))} ${SPEC[k].unit}`);

/** Admin console → Plan: atur token (periode & tarif), batas tiap plan & token tamu tanpa deploy */
export default function PlansTab() {
  const { data, error, reload } = useAdminData(getPlanSettings, []);
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  // key = muat ulang draft dari server setelah data baru
  return <PlansForm key={JSON.stringify(data.effective)} settings={data} />;
}

function PlansForm({ settings }: { settings: PlanSettings }) {
  const toast = useToast();
  const guard = useAuthGuard();
  const dispatch = useAppDispatch();
  const [saved, setSaved] = useState(settings);
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [plan, setPlan] = useState<PlanId>("free");
  const [busy, setBusy] = useState(false);

  const base = toDraft(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const guestVal = parseGuest(draft.guest);
  const tokenVals = Object.fromEntries(TOKEN_KEYS.map((k) => [k, parseToken(k, draft.tokens[k])])) as Record<TokenKey, number | string>;
  const values = Object.fromEntries(
    PLAN_IDS.map((id) => [id, Object.fromEntries(PLAN_TUNABLE.map((k) => [k, parse(k, draft.plans[id][k])]))]),
  ) as Record<PlanId, Record<PlanTunable, number | null | string>>;
  const invalid =
    typeof guestVal === "string" ||
    TOKEN_KEYS.some((k) => typeof tokenVals[k] === "string") || PLAN_IDS.some((id) => PLAN_TUNABLE.some((k) => typeof values[id][k] === "string"));
  const planDirty = (id: PlanId) => PLAN_TUNABLE.some((k) => draft.plans[id][k] !== base.plans[id][k]);
  const overridden = (id: PlanId) => Object.keys(saved.overrides.plans?.[id] ?? {}).length;

  const setField = (id: PlanId, k: PlanTunable, v: string) =>
    setDraft((d) => ({ ...d, plans: { ...d.plans, [id]: { ...d.plans[id], [k]: v } } }));

  const save = async () => {
    setBusy(true);
    try {
      const body: PlanOverrides = {
        guest: guestVal as number,
        tokens: tokenVals as TokenRules,
        plans: Object.fromEntries(PLAN_IDS.map((id) => [id, values[id] as unknown as TunableLimits])),
      };
      const next = await savePlanSettings(body);
      setSaved(next);
      setDraft(toDraft(next));
      // Halaman lain di tab ini (Harga, Converter) memuat batas baru
      dispatch(baseApi.util.invalidateTags(["Plans"]));
      toast("Batas plan disimpan — berlaku untuk semua user dalam ±1 menit", "ok");
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
    } finally {
      setBusy(false);
    }
  };

  const guestDefault = saved.defaultGuest;
  const guestChanged = draft.guest !== String(guestDefault);

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[68ch] text-[14px] leading-relaxed text-fg-2">
        Angka di sini menimpa nilai bawaan di kode tanpa perlu deploy. Fitur per plan (format, efek, latar gambar) tetap di kode. Nilai yang sama
        dengan bawaan tidak disimpan, jadi perubahan bawaan di kode tetap ikut berlaku.
      </p>

      <CardBox>
        <CardHeader title="Token" />
        <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {TOKEN_KEYS.map((k) => {
            const s = TOKEN_SPEC[k];
            const v = tokenVals[k];
            const def = saved.defaultTokens[k];
            return (
              <Field
                key={k}
                label={s.label}
                hint={typeof v === "string" ? undefined : s.hint}
                error={typeof v === "string" ? v : null}
                aside={
                  draft.tokens[k] !== String(def) && (
                    <ResetLink label={`Bawaan: ${def} ${s.unit}`} onClick={() => setDraft((d) => ({ ...d, tokens: { ...d.tokens, [k]: String(def) } }))} />
                  )
                }
              >
                {({ id, describedBy, invalid: bad }) => (
                  <UnitInput
                    id={id}
                    describedBy={describedBy}
                    invalid={bad}
                    unit={s.unit}
                    value={draft.tokens[k]}
                    onChange={(t) => setDraft((d) => ({ ...d, tokens: { ...d.tokens, [k]: t } }))}
                  />
                )}
              </Field>
            );
          })}
          <Field
            label="Token tamu (tanpa login)"
            hint={typeof guestVal === "string" ? undefined : "Per periode per perangkat/IP. 0 = wajib login."}
            error={typeof guestVal === "string" ? guestVal : null}
            aside={guestChanged && <ResetLink label={`Bawaan: ${guestDefault} token`} onClick={() => setDraft((d) => ({ ...d, guest: String(guestDefault) }))} />}
          >
            {({ id, describedBy, invalid: bad }) => (
              <UnitInput id={id} describedBy={describedBy} invalid={bad} unit="token" value={draft.guest} onChange={(v) => setDraft((d) => ({ ...d, guest: v }))} />
            )}
          </Field>
        </div>
      </CardBox>

      <CardBox>
        <CardHeader
          title="Batas per plan"
          aside={
            <Segmented
              label="Plan"
              value={plan}
              onChange={setPlan}
              className="w-full sm:w-[300px]"
              options={PLAN_IDS.map((id) => ({ value: id, label: `${PLAN_LABEL[id]}${planDirty(id) ? " •" : ""}` }))}
            />
          }
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] px-5 py-3 text-[13px] text-fg-2">
          {overridden(plan) > 0 ? <Badge tone="warn">{overridden(plan)} angka diubah admin</Badge> : <Badge tone="ok">Semua bawaan</Badge>}
          {planDirty(plan) && <span>Ada perubahan belum disimpan</span>}
        </div>
        <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {PLAN_TUNABLE.map((k) => {
            const s = SPEC[k];
            const v = values[plan][k];
            const def = saved.defaults[plan][k];
            const changed = draft.plans[plan][k] !== toText(k, def);
            return (
              <Field
                key={`${plan}-${k}`}
                label={s.label}
                hint={s.hint}
                error={typeof v === "string" ? v : null}
                aside={changed && <ResetLink label={`Bawaan: ${show(k, def)}`} onClick={() => setField(plan, k, toText(k, def))} />}
              >
                {({ id, describedBy, invalid: bad }) =>
                  k === "maxBitrate" ? (
                    <Select id={id} aria-describedby={describedBy} value={draft.plans[plan][k]} onChange={(e) => setField(plan, k, e.target.value)}>
                      {BITRATES.map((b) => (
                        <option key={b} value={b}>
                          {b} kbps
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <UnitInput
                      id={id}
                      describedBy={describedBy}
                      invalid={bad}
                      unit={s.unit}
                      placeholder={s.nullable ? "Tanpa batas" : undefined}
                      value={draft.plans[plan][k]}
                      onChange={(t) => setField(plan, k, t)}
                    />
                  )
                }
              </Field>
            );
          })}
        </div>
      </CardBox>

      {/* Bilah simpan menempel di bawah selama ada perubahan (sticky: .fade-swap ber-transform mengurung position:fixed) */}
      {dirty && (
        <div className="sticky bottom-0 z-30 -mx-4 -mb-16 border-t border-line/70 bg-[var(--glass)] backdrop-blur-md sm:-mx-8">
          <div className="flex items-center justify-end gap-2 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-8">
            <p className="mr-auto text-[13px] text-fg-2">{invalid ? "Perbaiki isian yang salah dulu" : "Perubahan belum disimpan"}</p>
            <Button variant="subtle" disabled={busy} onClick={() => setDraft(base)}>
              Batalkan
            </Button>
            <Button variant="primary" loading={busy} disabled={invalid} onClick={save}>
              Simpan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitInput({
  id,
  describedBy,
  invalid,
  unit,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  unit: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        className="pr-16 tabular-nums"
      />
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-fg-3">
        {unit}
      </span>
    </div>
  );
}

function ResetLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Kembalikan ke bawaan"
      className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-full text-[12px] font-medium leading-none text-accent transition-opacity hover:opacity-75"
    >
      <Undo width={12} height={12} aria-hidden="true" />
      {label}
    </button>
  );
}

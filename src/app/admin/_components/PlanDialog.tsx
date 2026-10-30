"use client";

import { useState } from "react";
import { Check } from "iconoir-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import Field, { Input } from "@/components/ui/Field";
import { useToast } from "@/hooks/useToast";
import { PLAN_IDS, type PlanId, type PublicPlanId, PLAN_NAMES } from "@/lib/schemas/plans";
import { usePlans } from "@/hooks/usePlans";
import type { AdminUser } from "@/type/admin";
import { setUserPlan } from "../_service/admin.service";
import { errorText, useAuthGuard } from "../_hooks/useAdmin";
import { dateShort } from "./parts";

const DAY = 86_400_000;
const DURATIONS = [
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
  { value: "365", label: "1 tahun" },
  { value: "custom", label: "Tanggal" },
  { value: "forever", label: "Permanen" },
] as const;
type Duration = (typeof DURATIONS)[number]["value"];

// Label semua plan (untuk "Plan sekarang"); pilihan yang bisa diberikan hanya PLAN_IDS publik —
// plan "admin" otomatis untuk admin aplikasi
const PLAN_LABEL: Record<PlanId, string> = PLAN_NAMES;

/** Atur plan user secara manual (hadiah, kompensasi, kerja sama) — tercatat di log audit */
export default function PlanDialog({ user, onClose, onSaved }: { user: AdminUser | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Dialog
      open={user != null}
      onClose={onClose}
      title="Atur plan"
      sub={user ? `${user.displayName ?? user.username ?? user.id} · ${user.id}` : undefined}
      width="max-w-[520px]"
    >
      {/* key → form direset tiap ganti user */}
      {user && <PlanForm key={user.id} user={user} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function PlanForm({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const guard = useAuthGuard();
  const { plans, tokens } = usePlans();
  const freeTokens = plans.free.tokens;
  const [plan, setPlan] = useState<PublicPlanId>(user.plan === "free" || user.plan === "admin" ? "pro" : user.plan);
  const [duration, setDuration] = useState<Duration>("30");
  const [date, setDate] = useState(() => new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  // Waktu acuan dibekukan saat form dibuka (render tetap murni)
  const [now] = useState(() => Date.now());

  const expiresAt =
    plan === "free" || duration === "forever"
      ? null
      : duration === "custom"
        ? new Date(`${date}T23:59:59`).getTime()
        : now + Number(duration) * DAY;
  const invalid = duration === "custom" && plan !== "free" && (!expiresAt || Number.isNaN(expiresAt) || expiresAt <= now);

  const save = async () => {
    setSaving(true);
    try {
      await setUserPlan(user.id, plan, expiresAt);
      toast(plan === "free" ? "Plan dicabut — user kembali ke Free" : `Plan ${PLAN_LABEL[plan]} aktif ${expiresAt ? `s/d ${dateShort(expiresAt)}` : "permanen"}`, "ok");
      onSaved();
      onClose();
    } catch (e) {
      if (!guard(e)) toast(errorText(e), "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-s bg-raised px-4 py-3 text-[14px] text-fg-2">
        Plan sekarang: <strong className="text-fg">{PLAN_LABEL[user.plan]}</strong>
        {user.plan !== "free" && ` · ${user.planExpiresAt ? `s/d ${dateShort(user.planExpiresAt)}` : "permanen"}`}
      </div>

      <div className="flex flex-col gap-2">
        <p className="caps text-[11px] text-fg-2">Plan</p>
        <Segmented label="Plan" value={plan} onChange={setPlan} options={PLAN_IDS.map((p) => ({ value: p, label: PLAN_LABEL[p] }))} />
      </div>

      {plan !== "free" && (
        <div className="flex flex-col gap-2">
          <p className="caps text-[11px] text-fg-2">Masa aktif (dihitung dari hari ini)</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={duration === d.value}
                onClick={() => setDuration(d.value)}
                className={
                  "ios-press h-10 cursor-pointer rounded-full text-[13.5px] font-semibold " +
                  (duration === d.value ? "bg-accent text-on-accent" : "bg-fg/[0.07] text-fg-2 hover:bg-fg/[0.12] hover:text-fg")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
          {duration === "custom" && (
            <Field label="Berakhir pada" error={invalid ? "Pilih tanggal setelah hari ini" : null} className="mt-2">
              {({ id, describedBy, invalid: inv }) => (
                <Input id={id} type="date" aria-describedby={describedBy} aria-invalid={inv} value={date} min={new Date(now + DAY).toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
              )}
            </Field>
          )}
        </div>
      )}

      <p className="text-[13px] leading-relaxed text-fg-3">
        {plan === "free"
          ? `User kembali ke batas Free (${freeTokens == null ? "token tanpa batas" : `${freeTokens} token/${tokens.windowHours} jam`}). Order yang sudah lunas tidak dikembalikan otomatis.`
          : `Hasil: ${PLAN_LABEL[plan]} ${expiresAt ? `aktif sampai ${dateShort(expiresAt)}` : "permanen"}. Menimpa plan yang sedang aktif.`}
      </p>

      <div className="flex justify-end gap-2 border-t border-line/60 pt-4">
        <Button variant="subtle" onClick={onClose}>
          Batal
        </Button>
        <Button variant={plan === "free" ? "danger" : "primary"} loading={saving} disabled={invalid} onClick={save} icon={<Check aria-hidden="true" />}>
          {plan === "free" ? "Cabut plan" : "Simpan plan"}
        </Button>
      </div>
    </div>
  );
}

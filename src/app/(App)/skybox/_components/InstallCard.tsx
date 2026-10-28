"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Refresh, Settings, Upload } from "iconoir-react";
import { ApiError, cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Field, { inputClass } from "@/components/ui/Field";
import { FACE_PROP, FACES, luauScript, parseAssetId, type FaceId } from "../_lib/skyMath";
import { saveBlob } from "../_lib/zip";
import type { SkyAtmosphere } from "../_lib/atmosphere";
import { checkOperation, faceDataUrl, fetchTextureId, skyRbxmx, uploadDecal } from "../_service/skybox.service";

type Status = "idle" | "uploading" | "processing" | "texture" | "done" | "pending" | "error";
interface FaceUpload {
  status: Status;
  decalId?: string;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TONE: Record<Status, string> = {
  idle: "text-fg-3",
  uploading: "text-fg-2",
  processing: "text-fg-2",
  texture: "text-fg-2",
  done: "text-ok",
  pending: "text-warn",
  error: "text-err",
};

/**
 * Pasang di Roblox: upload otomatis 6 sisi (Decal → Texture ID) memakai API key dari Pengaturan,
 * atau isi ID manual. Hasilnya script Command Bar + file Sky .rbxmx.
 */
export default function InstallCard({
  faces,
  stale,
  atmosphere,
}: {
  faces: Record<FaceId, { blob: Blob }> | null;
  stale: boolean;
  /** Atmosphere yang ikut script & .rbxmx; null = belum ada hasil / tidak disertakan */
  atmosphere: SkyAtmosphere | null;
}) {
  const { t, f } = useT();
  const s = t.skybox;
  const toast = useToast();
  const roblox = useAppSelector((st) => st.roblox);
  const [ids, setIds] = useState<Partial<Record<FaceId, string>>>({});
  const [name, setName] = useState("ARRR_Skybox");
  const [copied, setCopied] = useState(false);
  const [up, setUp] = useState<Partial<Record<FaceId, FaceUpload>>>({});
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const script = luauScript(ids, name, atmosphere);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const hasKey = Boolean(roblox.apiKey && roblox.creatorId);
  const mark = (face: FaceId, v: FaceUpload) => alive.current && setUp((p) => ({ ...p, [face]: v }));
  const errText = (e: unknown) => (e instanceof ApiError ? e.message : String(e));

  /** Decal → Texture ID; dicoba berkala karena Roblox butuh waktu memproses gambar */
  const resolveTexture = async (face: FaceId, decalId: string, tries = 20) => {
    mark(face, { status: "texture", decalId });
    for (let i = 0; i < tries && alive.current; i++) {
      const { imageId } = await fetchTextureId(roblox.apiKey, decalId);
      if (imageId) {
        if (alive.current) setIds((p) => ({ ...p, [face]: imageId }));
        mark(face, { status: "done", decalId });
        return true;
      }
      await sleep(3000);
    }
    mark(face, { status: "pending", decalId });
    return false;
  };

  const uploadAll = async () => {
    if (!faces || !hasKey) return;
    setBusy(true);
    let ready = 0;
    let failed = 0;
    // Berurutan (bukan paralel) supaya tidak kena rate limit Roblox
    for (const face of FACES) {
      if (!alive.current) return;
      try {
        mark(face, { status: "uploading" });
        let res = await uploadDecal({
          apiKey: roblox.apiKey,
          creatorType: roblox.creatorType,
          creatorId: roblox.creatorId,
          displayName: `${name.trim() || "Skybox"} ${FACE_PROP[face].replace("Skybox", "")}`.slice(0, 50),
          image: await faceDataUrl(faces[face].blob),
        });
        mark(face, { status: "processing" });
        for (let i = 0; !res.assetId && res.operationId && i < 30 && alive.current; i++) {
          await sleep(2000);
          res = await checkOperation(roblox.apiKey, res.operationId);
        }
        if (!res.assetId) throw new Error("timeout");
        if (await resolveTexture(face, res.assetId)) ready++;
      } catch (e) {
        failed++;
        mark(face, { status: "error", error: errText(e) });
        // Kesalahan key/scope berlaku untuk semua sisi → hentikan, jangan buang kuota upload
        if (e instanceof ApiError && (e.status === 400 || e.status === 401 || /scope|API key/i.test(e.message))) {
          toast(e.message, "err");
          break;
        }
      }
    }
    if (!alive.current) return;
    setBusy(false);
    if (ready === 6) toast(s.uploadDone, "ok");
    else if (!failed) toast(s.uploadPartial, "info");
  };

  const retryPending = async () => {
    setBusy(true);
    for (const face of FACES) {
      const u = up[face];
      if (u?.status === "pending" && u.decalId) await resolveTexture(face, u.decalId, 6).catch(() => mark(face, { status: "pending", decalId: u.decalId }));
    }
    if (alive.current) setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast(s.copied, "ok");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* izin clipboard ditolak — teks tetap bisa diseleksi manual */
    }
  };

  const downloadRbxmx = () => saveBlob(new Blob([skyRbxmx(ids, name, atmosphere)], { type: "application/xml" }), `${(name.trim() || "ARRR_Skybox").replace(/[^\w-]+/g, "_")}.rbxmx`);

  const uploadedCount = FACES.filter((face) => up[face]?.status === "done").length;
  const hasPending = FACES.some((face) => up[face]?.status === "pending");

  return (
    <CardBox>
      <CardHeader title={s.install} />

      {/* Upload otomatis */}
      <div className="flex flex-col gap-4 border-b border-[var(--hairline)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", hasKey ? "bg-ok" : "bg-fg-3")} />
              {s.autoUpload}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-fg-2">{s.autoUploadSub}</p>
          </div>
          {hasKey && (
            <span className="rounded-full bg-fg/[0.07] px-3 py-1 text-[12.5px] font-medium tabular-nums text-fg-2">
              {f(s.uploadAs, { type: roblox.creatorType === "group" ? s.creatorGroup : s.creatorUser, id: roblox.creatorId })}
            </span>
          )}
        </div>

        {!hasKey ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded bg-fg/[0.05] px-4 py-3">
            <p className="text-[13.5px] text-fg-2">{s.needKey}</p>
            <Link href="/settings" className="inline-flex h-9 items-center gap-2 rounded-full bg-fg/[0.1] px-4 text-[13.5px] font-semibold hover:bg-fg/[0.15]">
              <Settings width={16} height={16} /> {s.openSettings}
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {FACES.map((face) => {
                const st = up[face]?.status ?? "idle";
                return (
                  <li key={face} title={up[face]?.error} className="flex flex-col gap-0.5 rounded-s bg-fg/[0.05] px-3 py-2.5">
                    <span className="font-mono text-[12px] text-fg-3">{FACE_PROP[face].replace("Skybox", "")}</span>
                    <span className={cn("truncate text-[12.5px] font-semibold", TONE[st])}>{s.faceStatus[st]}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={<Upload width={18} height={18} />} loading={busy} disabled={!faces || busy} onClick={() => void uploadAll()}>
                {busy ? f(s.uploadingN, { n: Math.min(6, uploadedCount + 1) }) : s.uploadAll}
              </Button>
              {hasPending && !busy && (
                <Button variant="tonal" icon={<Refresh width={18} height={18} />} onClick={() => void retryPending()}>
                  {s.retryTexture}
                </Button>
              )}
            </div>
            <p className="text-[12.5px] leading-relaxed text-fg-3">{!faces ? s.needResult : stale ? s.staleUpload : s.scopeNote}</p>
          </>
        )}
      </div>

      {/* ID + script + .rbxmx */}
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-5">
          <p className="caps text-fg-3">{s.manualTitle}</p>
          <ol className="flex flex-col gap-3">
            {s.installSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-fg-2">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-fg/[0.08] text-[12px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Field label={s.skyName}>
            {({ id }) => <input id={id} className={inputClass} value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FACES.map((face) => (
              <Field key={face} label={f(s.assetId, { name: FACE_PROP[face].replace("Skybox", "") })}>
                {({ id }) => (
                  <input
                    id={id}
                    inputMode="numeric"
                    placeholder="0"
                    className={`${inputClass} h-11 font-mono text-[14px]`}
                    value={ids[face] ?? ""}
                    onChange={(e) => setIds((p) => ({ ...p, [face]: parseAssetId(e.target.value) || e.target.value.replace(/\D/g, "") }))}
                  />
                )}
              </Field>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <pre className="max-h-[320px] min-h-[220px] flex-1 overflow-auto rounded bg-fg/[0.06] p-4 font-mono text-[12.5px] leading-relaxed text-fg-2">
            <code>{script}</code>
          </pre>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="tonal" className="w-full" icon={copied ? <Check width={18} height={18} /> : <Copy width={18} height={18} />} onClick={() => void copy()}>
              {s.copyScript}
            </Button>
            <Button variant="ghost" className="w-full" icon={<Download width={18} height={18} />} onClick={downloadRbxmx}>
              {s.downloadRbxmx}
            </Button>
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-3">{s.rbxmxHint}</p>
        </div>
      </div>
    </CardBox>
  );
}

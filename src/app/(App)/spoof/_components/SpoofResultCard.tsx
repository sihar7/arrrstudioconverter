"use client";

import type { ReactNode } from "react";
import { Copy, Download, OpenNewWindow, Upload } from "iconoir-react";
import { cn, formatBytes } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { robloxCreatorUrl } from "@/Url/Url";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/buttonStyles";
import { fileUrl } from "@/app/(App)/converter/_service/converter.service";
import { SfSpoof } from "@/components/icons/SfIcons";
import type { SpoofRecord } from "@/type/spoof";

/**
 * Kartu hasil spoof (acuan: kartu "Animation Download Ready"): status + lama proses, detail aset sumber
 * (nama, pembuat, ID, ukuran), ID baru, cara impor manual di Studio, unduh file & upload otomatis.
 */
export default function SpoofResultCard({ rec, onUploadNow, uploading }: { rec: SpoofRecord; onUploadNow: () => void; uploading: boolean }) {
  const { t, f, lang } = useT();
  const S = t.spoof;
  const toast = useToast();
  const kindWord = rec.kind === "animation" ? S.wordAnimation : S.wordAudio;
  const processing = !rec.assetId && Boolean(rec.operationId);
  const sec = rec.durationMs != null ? Math.max(1, Math.round(rec.durationMs / 1000)) : null;

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(
      () => toast(S.copied, "ok"),
      () => toast(text),
    );
  };

  const status = rec.assetId ? (
    <Badge tone="ok">{S.stUploaded}</Badge>
  ) : processing ? (
    <Badge tone="warn">{S.stProcessing}</Badge>
  ) : rec.error ? (
    <Badge tone="err">{S.stFailed}</Badge>
  ) : (
    <Badge>{S.stFileOnly}</Badge>
  );

  const rows: { label: string; value: ReactNode; mono?: boolean; copyText?: string }[] = [
    { label: f(S.fName, { kind: kindWord }), value: rec.name },
    {
      label: f(S.fCreator, { kind: kindWord }),
      value: rec.sourceCreator ? (
        <a
          href={robloxCreatorUrl(rec.sourceCreator.type, rec.sourceCreator.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 hover:underline"
        >
          <span className="truncate">{rec.sourceCreator.name ?? rec.sourceCreator.id}</span>
          {rec.sourceCreator.type === "group" && <span className="rounded-[5px] bg-fg/[0.08] px-1.5 text-[11px] font-semibold text-fg-2">{S.group}</span>}
          <OpenNewWindow width={12} height={12} className="shrink-0 text-fg-3" aria-hidden="true" />
        </a>
      ) : (
        <span className="text-fg-3">{S.unknown}</span>
      ),
    },
    { label: f(S.fId, { kind: kindWord }), value: rec.sourceId, mono: true, copyText: rec.sourceId },
    ...(rec.sizeBytes != null ? [{ label: f(S.fSize, { kind: kindWord }), value: formatBytes(rec.sizeBytes), mono: true }] : []),
    ...(rec.assetId ? [{ label: S.fNewId, value: rec.assetId, mono: true, copyText: rec.assetId }] : []),
  ];

  const guide = rec.assetId ? S.guideDone : rec.kind === "animation" ? S.guideAnimation : S.guideAudio;
  const canUpload = !rec.assetId && !processing;

  return (
    <article className="rise border-b border-[var(--hairline)] px-5 py-5 last:border-b-0 desk:px-4 desk:py-4">
      <header className="flex items-start gap-3.5">
        <div className="forged-tile grid size-11 shrink-0 place-items-center rounded text-fg desk:size-9">
          <SfSpoof size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="font-display text-[16px] font-semibold tracking-[-0.01em] desk:text-[14px]">
              {rec.kind === "animation" ? S.readyAnimation : S.readyAudio}
            </h3>
            {status}
          </div>
          <p className="mt-0.5 text-[13px] text-fg-3 desk:text-[12px]">
            {sec != null && <>{f(S.completedIn, { n: sec })} · </>}
            {new Date(rec.createdAt).toLocaleString(lang === "id" ? "id-ID" : "en-US", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
      </header>

      <dl className="mt-4 grid gap-x-6 gap-y-3 rounded bg-fg/[0.035] px-4 py-3.5 sm:grid-cols-2 desk:mt-3 desk:py-3">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <dt className="text-[12px] font-medium text-fg-3 desk:text-[11px]">{r.label}</dt>
            <dd className={cn("mt-0.5 flex min-w-0 items-center gap-1.5 text-[14px] font-medium text-fg desk:text-[13px]", r.mono && "font-mono tabular-nums")}>
              <span className="min-w-0 truncate">{r.value}</span>
              {r.copyText && (
                <button
                  type="button"
                  onClick={() => copy(r.copyText!)}
                  aria-label={`${S.copy} ${r.label}`}
                  title={S.copy}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-[7px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-95"
                >
                  <Copy width={14} height={14} aria-hidden="true" />
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {rec.error && !rec.assetId && <p className="mt-3 text-[13px] leading-relaxed text-err">{f(S.uploadFailed, { msg: rec.error })}</p>}
      {rec.permission && (
        <p className={cn("mt-3 text-[13px]", rec.permission.status === "failed" ? "text-warn" : "text-fg-2")}>
          {rec.permission.status === "failed"
            ? f(S.permFailed, { msg: rec.permission.message ?? "" })
            : rec.permission.status === "granted"
              ? f(S.permGranted, { mode: rec.permission.mode === "place" ? `place ${rec.permission.placeId}` : S.permPublic })
              : S.permPending}
        </p>
      )}

      <p className="mt-3 text-[13.5px] leading-relaxed text-fg-2 desk:text-[12.5px]">{guide}</p>

      <div className="mt-4 flex flex-wrap gap-2 desk:mt-3">
        {rec.fileId && (
          <a href={fileUrl(rec.fileId, true)} download className={buttonClass("tonal", "sm")}>
            <Download width={15} height={15} aria-hidden="true" />
            {S.download}
          </a>
        )}
        {canUpload && (
          <Button size="sm" variant="primary" loading={uploading} icon={<Upload width={15} height={15} aria-hidden="true" />} onClick={onUploadNow}>
            {S.autoNow}
          </Button>
        )}
        {rec.assetId && (
          <Button size="sm" variant="primary" icon={<Copy width={15} height={15} aria-hidden="true" />} onClick={() => copy(rec.assetId!)}>
            {S.copyNew}
          </Button>
        )}
      </div>
    </article>
  );
}

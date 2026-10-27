"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Copy, Download } from "iconoir-react";
import { copyText } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import { EXPORT_FORMATS, buildExport, downloadText, type ExportFields, type ExportFormat, type ExportRow } from "@/lib/assetExport";

const PREVIEW_ROWS = 8;

interface Props {
  open: boolean;
  onClose: () => void;
  shown: ExportRow[];
  selected: ExportRow[];
  /** Masih ada halaman inventory yang belum dimuat (Audio saya) */
  partial?: boolean;
  /** Tambah pilihan isi "Nama + ID + Cover" (Riwayat), sekaligus jadi bawaan */
  withCover?: boolean;
  /** Awalan nama file unduhan */
  fileBase?: string;
}

/** Ekspor asset ID — pilih data (daftar / terpilih), isi (nama + ID [+ cover] / ID saja), format (TXT/CSV/JSON/Lua) */
export default function ExportDialog({ open, onClose, shown, selected, partial = false, withCover = false, fileBase = "roblox-audio" }: Props) {
  const { t, f } = useT();
  const L = t.library;
  const toast = useToast();
  const [scope, setScope] = useState<"shown" | "selected">("shown");
  const [fields, setFields] = useState<ExportFields>(withCover ? "full" : "both");
  const [format, setFormat] = useState<ExportFormat>("csv");

  // Tidak ada yang dipilih → otomatis pakai daftar saat ini
  const useSel = scope === "selected" && selected.length > 0;
  const list = useSel ? selected : shown;
  const text = useMemo(() => buildExport(list, format, fields, L.exportUntitled), [list, format, fields, L.exportUntitled]);
  const lines = text.split("\n");
  const preview = lines.slice(0, PREVIEW_ROWS).join("\n");

  const download = () => {
    downloadText(text, format, `${fileBase}-${list.length}-${new Date().toISOString().slice(0, 10)}`);
    onClose();
  };
  const copy = async () => {
    if (await copyText(text)) toast(t.toast.copied, "ok");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={L.exportTitle}
      sub={L.exportSub}
      footer={
        <>
          <Button variant="ghost" icon={<Copy width={16} height={16} />} disabled={!list.length} onClick={copy}>
            {L.exportCopy}
          </Button>
          <Button variant="primary" icon={<Download width={16} height={16} />} disabled={!list.length} onClick={download}>
            {f(L.exportDownload, { ext: format.toUpperCase() })}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Row label={L.exportScope}>
          <Segmented
            label={L.exportScope}
            value={useSel ? "selected" : "shown"}
            onChange={setScope}
            options={[
              { value: "shown", label: `${L.scopeShown} · ${shown.length}` },
              { value: "selected", label: `${L.scopeSelected} · ${selected.length}`, disabled: !selected.length },
            ]}
          />
        </Row>
        <Row label={L.exportFields}>
          <Segmented
            label={L.exportFields}
            value={fields}
            onChange={setFields}
            options={[
              ...(withCover ? [{ value: "full" as const, label: L.fieldsFull }] : []),
              { value: "both", label: L.fieldsBoth },
              { value: "id", label: L.fieldsId },
            ]}
          />
        </Row>
        <Row label={L.exportFormat}>
          <Segmented label={L.exportFormat} value={format} onChange={setFormat} options={EXPORT_FORMATS.map((v) => ({ value: v, label: v }))} />
        </Row>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[12.5px] font-semibold text-fg-2">{L.exportPreview}</span>
            <span className="font-mono text-[12px] text-fg-3">{f(L.exportCount, { n: list.length })}</span>
          </div>
          <pre className="thin-scroll max-h-56 overflow-auto rounded-s border border-line bg-bg p-3 font-mono text-[12px] leading-relaxed text-fg-2">
            {preview}
            {lines.length > PREVIEW_ROWS && `\n${f(L.exportMore, { n: lines.length - PREVIEW_ROWS })}`}
          </pre>
        </div>

        {partial && <p className="rounded-s bg-warn/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-warn">{L.exportHint}</p>}
        <p className="text-[12.5px] leading-relaxed text-fg-3">{L.exportNote}</p>
      </div>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <span className="text-[12.5px] font-semibold text-fg-2">{label}</span>
      {children}
    </div>
  );
}

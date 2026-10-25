"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/store/hooks";
import { shortName } from "@/lib/shortName";
import { useT } from "@/hooks/useT";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import SourceCard from "./SourceCard";
import QueueCard from "./QueueCard";
import SettingsPanel from "./SettingsPanel";
import StepGuide, { STEP_TARGETS } from "./StepGuide";
import { useQueueRunner } from "../_hooks/useQueueRunner";
import { useAudioPreview } from "../_hooks/useAudioPreview";
import { useRobloxUpload } from "../_hooks/useRobloxUpload";

// Dialog berat di-load saat dibutuhkan saja (lazy)
const RobloxUploadDialog = dynamic(() => import("@/components/roblox/RobloxUploadDialog"), {
  ssr: false,
  loading: () => <PageLoader variant="inline" />,
});
const BulkUploadDialog = dynamic(() => import("@/components/roblox/BulkUploadDialog"), {
  ssr: false,
  loading: () => <PageLoader variant="inline" />,
});
const GuestGate = dynamic(() => import("@/components/shared/GuestGate"), { ssr: false });

export default function ConverterScreen() {
  const { t } = useT();
  const [gate, setGate] = useState(false);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const items = useAppSelector((s) => s.converter.items);
  const uploadItem = items.find((i) => i.key === uploadKey) ?? null;

  const preview = useAudioPreview();
  const roblox = useRobloxUpload();
  useQueueRunner({ onGuestLimit: () => setGate(true), onDone: roblox.autoUpload });

  const bulkItems = items.filter(roblox.uploadable);
  const uploadableKeys = bulkItems.map((i) => i.key);
  // Pilihan yang sudah tidak bisa diupload (terhapus / sedang upload) otomatis gugur
  const selection = picked.filter((k) => uploadableKeys.includes(k));
  const toggleSelect = (key: string) =>
    setPicked((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s.filter((k) => uploadableKeys.includes(k)), key]));
  const selectAll = () => setPicked([...selection, ...uploadableKeys.filter((k) => !selection.includes(k))]);

  const openBulk = () => {
    const keys = selection.length ? selection : uploadableKeys;
    if (!keys.length) return;
    // Belum login / belum ada API key → dialog tunggal yang menjelaskan langkahnya
    const first = bulkItems.find((i) => i.key === keys[0])!;
    if (roblox.blockReason(first)) setUploadKey(first.key);
    else setBulk(keys);
  };
  const bulkEntries = (bulk ?? []).flatMap((k) => bulkItems.filter((i) => i.key === k));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t.converter.eyebrow} title={t.converter.title} sub={t.converter.sub} actions={<StepGuide />} />

      {/* Mobile: sumber → pengaturan → antrean. Desktop: pengaturan di kolom kanan (sticky). */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr]">
        <div id={STEP_TARGETS[0]} className="min-w-0 scroll-mt-28 lg:col-start-1">
          <SourceCard />
        </div>
        <div id={STEP_TARGETS[1]} className="min-w-0 scroll-mt-28 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <SettingsPanel />
        </div>
        <div id={STEP_TARGETS[2]} className="min-w-0 scroll-mt-28 lg:col-start-1">
          <QueueCard
            playing={preview.playing}
            onTogglePlay={preview.toggle}
            onUpload={(item) => setUploadKey(item.key)}
            uploadableKeys={uploadableKeys}
            selection={selection}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onClearSelection={() => setPicked([])}
            onUploadMany={openBulk}
            blockReason={roblox.blockReason}
          />
        </div>
      </div>

      {uploadItem && (
        <RobloxUploadDialog
          key={uploadItem.key}
          title={uploadItem.title}
          block={roblox.blockReason(uploadItem)}
          initial={roblox.defaultForm(uploadItem)}
          onClose={() => setUploadKey(null)}
          onSubmit={(form) => roblox.upload(uploadItem, form)}
        />
      )}
      {bulkEntries.length > 0 && (
        <BulkUploadDialog
          entries={bulkEntries.map((i) => ({ key: i.key, title: i.title, thumbnail: i.thumbnail, displayName: shortName(i.title) }))}
          initial={roblox.defaultForm(bulkEntries[0])}
          onClose={() => setBulk(null)}
          onSubmit={(chosen) => {
            const byKey = new Map(bulkEntries.map((i) => [i.key, i]));
            setPicked([]);
            void roblox.uploadMany(chosen.flatMap((p) => (byKey.has(p.key) ? [{ item: byKey.get(p.key)!, form: p.form }] : [])));
          }}
        />
      )}
      {gate && <GuestGate open onClose={() => setGate(false)} />}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { enqueue } from "@/store/slices/converterSlice";
import { useMeQuery } from "@/store/api/baseApi";
import { shortName } from "@/lib/shortName";
import { PLANS } from "@/lib/schemas/plans";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import SourceCard from "./SourceCard";
import QueueCard from "./QueueCard";
import SettingsPanel from "./SettingsPanel";
import StatsBar from "./StatsBar";
import StepGuide, { STEP_TARGETS } from "./StepGuide";
import { useAddSource } from "../_hooks/useAddSource";
import { useQueueRunner } from "../_hooks/useQueueRunner";
import { useAudioPreview } from "../_hooks/useAudioPreview";
import { useRobloxUpload } from "../_hooks/useRobloxUpload";
import { useShortcuts } from "../_hooks/useShortcuts";
import { useBatchSignals } from "../_hooks/useBatchSignals";

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
const ShortcutsDialog = dynamic(() => import("./ShortcutsDialog"), { ssr: false });

export default function ConverterScreen() {
  const { t, f } = useT();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const toast = useToast();
  const { data: me } = useMeQuery();
  const [gate, setGate] = useState(false);
  const [help, setHelp] = useState(false);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const items = useAppSelector((s) => s.converter.items);
  const uploadItem = items.find((i) => i.key === uploadKey) ?? null;

  const src = useAddSource();
  const preview = useAudioPreview();
  const roblox = useRobloxUpload();
  const signals = useBatchSignals();
  useQueueRunner({ onGuestLimit: () => setGate(true), onDone: roblox.autoUpload });

  const bulkItems = items.filter(roblox.uploadable);
  const uploadableKeys = bulkItems.map((i) => i.key);
  // Pilihan yang sudah tidak bisa diupload (terhapus / sedang upload) otomatis gugur
  const selection = picked.filter((k) => uploadableKeys.includes(k));
  const toggleSelect = (key: string) =>
    setPicked((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s.filter((k) => uploadableKeys.includes(k)), key]));
  const selectAll = () => setPicked([...selection, ...uploadableKeys.filter((k) => !selection.includes(k))]);

  const openBulk = () => {
    let keys = selection.length ? selection : uploadableKeys;
    if (!keys.length) return;
    // Upload massal per plan: 0 = terkunci (satu item tetap boleh lewat dialog tunggal), n = maks n, null = tanpa batas
    const max = PLANS[me?.plan?.id ?? "free"].bulkRoblox;
    if (keys.length > 1 && max === 0) {
      toast(t.plan.bulkLocked, "info");
      router.push("/pricing");
      return;
    }
    if (max != null && max > 0 && keys.length > max) {
      toast(f(t.plan.bulkLimit, { n: max }), "info");
      keys = keys.slice(0, max);
    }
    // Belum login / belum ada API key → dialog tunggal yang menjelaskan langkahnya
    const first = bulkItems.find((i) => i.key === keys[0])!;
    if (roblox.blockReason(first)) setUploadKey(first.key);
    else setBulk(keys);
  };
  const bulkEntries = (bulk ?? []).flatMap((k) => bulkItems.filter((i) => i.key === k));

  useShortcuts({
    onFocusInput: () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    onPasteLinks: (text) => void src.submit(text),
    onConvertAll: () => dispatch(enqueue()),
    onEscape: () => setPicked([]),
    onHelp: () => setHelp(true),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.converter.eyebrow} title={t.converter.title} sub={t.converter.sub} actions={<StepGuide />} />

      <StatsBar />

      {/* Mobile: sumber → pengaturan → antrean. Desktop: pengaturan di kolom kanan (sticky). */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:grid-rows-[auto_1fr]">
        <div id={STEP_TARGETS[0]} className="min-w-0 scroll-mt-28 lg:col-start-1">
          <SourceCard ref={inputRef} src={src} />
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
            onShowShortcuts={() => setHelp(true)}
            notify={{ on: signals.notify, supported: signals.notifySupported, toggle: () => void signals.toggleNotify() }}
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
      {help && <ShortcutsDialog open onClose={() => setHelp(false)} />}
      {gate && <GuestGate open onClose={() => setGate(false)} />}
    </div>
  );
}

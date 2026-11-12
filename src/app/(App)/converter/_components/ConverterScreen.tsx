"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "iconoir-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { enqueue, isRunning } from "@/store/slices/converterSlice";
import { useMeQuery } from "@/store/api/baseApi";
import { shortName } from "@/lib/shortName";
import { usePlans } from "@/hooks/usePlans";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import SourceCard from "./SourceCard";
import QueueCard from "./QueueCard";
import SettingsPanel from "./SettingsPanel";
import StatsBar from "./StatsBar";
import StepGuide, { STEP_TARGETS } from "./StepGuide";
import ProductTour from "@/components/shared/ProductTour";
import Button from "@/components/ui/Button";
import { useAddSource } from "../_hooks/useAddSource";
import { useQueueRunner } from "../_hooks/useQueueRunner";
import { useAudioPreview } from "../_hooks/useAudioPreview";
import { useRobloxUpload } from "../_hooks/useRobloxUpload";
import { useShortcuts } from "../_hooks/useShortcuts";
import { useBatchSignals } from "../_hooks/useBatchSignals";
import { useBatchUpload } from "../_hooks/useBatchUpload";
import BatchCard from "./BatchCard";

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
const TrimDialog = dynamic(() => import("./TrimDialog"), { ssr: false });
const ImportDialog = dynamic(() => import("./ImportDialog"), { ssr: false });

const TOUR_KEY = "arrc.tour.converter.v1";

export default function ConverterScreen() {
  const { t, f } = useT();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const toast = useToast();
  const { data: me } = useMeQuery();
  const { plans } = usePlans();
  const [gate, setGate] = useState(false);
  const [help, setHelp] = useState(false);
  const [tour, setTour] = useState(false);
  // Impor file: null = tertutup · { file } = dibuka (file opsional dari drag & drop)
  const [importer, setImporter] = useState<{ file: File | null } | null>(null);
  const robloxSettings = useAppSelector((s) => s.roblox);

  // Tur pertama kali: per perangkat (localStorage boleh gagal → tur tetap bisa dibuka manual)
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(TOUR_KEY) === "1";
    } catch {
      /* storage diblokir */
    }
    if (seen) return;
    const id = window.setTimeout(() => setTour(true), 900);
    return () => window.clearTimeout(id);
  }, []);
  const closeTour = () => {
    setTour(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* storage diblokir */
    }
  };
  const store = useAppStore();
  // Pangkas: askKeys = lagu yang baru selesai (dialog "mau dipangkas?"; auto-upload menunggu jawabannya) · trimKey = satu lagu dari tombol gunting
  const [askKeys, setAskKeys] = useState<string[]>([]);
  const [trimKey, setTrimKey] = useState<string | null>(null);
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
  useBatchUpload(roblox);
  const planLimits = plans[me?.plan?.id ?? "free"];
  const openImport = (file: File | null = null) => {
    // Plan tanpa impor → jelaskan & arahkan ke Harga (server juga menolak lewat PLAN_REQUIRED)
    if (!planLimits.batchImport) {
      toast(t.converter.importer.locked, "info");
      router.push("/pricing");
      return;
    }
    setImporter({ file });
  };
  useQueueRunner({
    // Convert bersamaan = batas plan (Pro 3 · Studio 4 · Ultimate 5); server menegakkannya lagi (BUSY → antrean jeda)
    parallel: plans[me?.plan?.id ?? "free"].parallel,
    onGuestLimit: () => setGate(true),
    onDone: (key) => {
      // Lagu impor: tanpa dialog pangkas (sudah dipangkas otomatis) & upload diatur gelombang batch
      if (store.getState().converter.items.find((i) => i.key === key)?.batch) return;
      if (store.getState().converter.trimAsk) setAskKeys((k) => (k.includes(key) ? k : [...k, key]));
      else roblox.autoUpload(key);
    },
  });
  // Dialog tanya ditutup (dipangkas / dilewati) → lanjutkan auto-upload yang tertahan, memakai file terbaru
  const closeAsk = () => {
    const keys = askKeys;
    setAskKeys([]);
    keys.forEach((k) => roblox.autoUpload(k));
  };

  const bulkItems = items.filter(roblox.uploadable);
  const uploadableKeys = bulkItems.map((i) => i.key);
  // Bisa dipilih (hapus / upload): semua yang tidak sedang diproses atau diupload
  const selectableKeys = items
    .filter((i) => !isRunning(i.status) && i.upload.status !== "uploading" && i.upload.status !== "processing")
    .map((i) => i.key);
  // Pilihan yang sudah tidak bisa dipilih (terhapus / mulai berjalan) otomatis gugur
  const selection = picked.filter((k) => selectableKeys.includes(k));
  const uploadSelection = selection.filter((k) => uploadableKeys.includes(k));
  const toggleSelect = (key: string) =>
    setPicked((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s.filter((k) => selectableKeys.includes(k)), key]));
  const selectAll = () => setPicked([...selection, ...selectableKeys.filter((k) => !selection.includes(k))]);

  const openBulk = () => {
    let keys = selection.length ? uploadSelection : uploadableKeys;
    if (!keys.length) return;
    // Upload massal per plan: 0 = terkunci (satu item tetap boleh lewat dialog tunggal), n = maks n, null = tanpa batas
    const max = plans[me?.plan?.id ?? "free"].bulkRoblox;
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
    // .studio = layout app desktop: area kerja + inspector menempel di tepi kanan jendela (css › KULIT APP DESKTOP)
    <div className="studio flex flex-col gap-6 desk:gap-4">
      <PageHeader
        eyebrow={t.converter.eyebrow}
        title={t.converter.title}
        sub={t.converter.sub}
        actions={
          <div className="flex items-center gap-1 desk:hidden">
            <StepGuide />
            <Button size="sm" variant="ghost" icon={<HelpCircle width={16} height={16} />} onClick={() => setTour(true)}>
              {t.converter.tour.open}
            </Button>
          </div>
        }
      />

      {/* App desktop: ringkasan sudah ada di LCD transport bar & badge sidebar */}
      <div className="desk:hidden">
        <StatsBar />
      </div>

      {/* Mobile: sumber → pengaturan → antrean. Web lebar: pengaturan di kolom kanan (sticky). App desktop: inspector. */}
      <div className="studio-grid grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:grid-rows-[auto_1fr]">
        <div id={STEP_TARGETS[0]} className="min-w-0 scroll-mt-28 lg:col-start-1">
          <SourceCard ref={inputRef} src={src} onImport={openImport} importLocked={!planLimits.batchImport} />
        </div>
        {/* App desktop: inspector — panel penuh di tepi kanan, scroll sendiri di antara toolbar & transport bar */}
        <div id={STEP_TARGETS[1]} className="inspector thin-scroll min-w-0 scroll-mt-28 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <SettingsPanel />
        </div>
        <div id={STEP_TARGETS[2]} className="flex min-w-0 scroll-mt-28 flex-col gap-4 lg:col-start-1">
          <BatchCard />
          <QueueCard
            playing={preview.playing}
            onTogglePlay={preview.toggle}
            onUpload={(item) => setUploadKey(item.key)}
            onTrim={(item) => setTrimKey(item.key)}
            uploadableKeys={uploadableKeys}
            selectableKeys={selectableKeys}
            selection={selection}
            uploadSelection={uploadSelection}
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

      {/* Dipasang hanya saat terbuka → selalu mulai dari langkah 1 */}
      {tour && (
        <ProductTour
          open
          onClose={closeTour}
          steps={[...STEP_TARGETS, "step-roblox"].map((target, n) => ({ target, ...t.converter.tour.steps[n] }))}
          labels={{
            next: t.converter.tour.next,
            back: t.converter.tour.back,
            done: t.converter.tour.done,
            skip: t.converter.tour.skip,
            counter: (i, n) => f(t.converter.tour.counter, { i, n }),
          }}
        />
      )}

      {uploadItem && (
        <RobloxUploadDialog
          key={uploadItem.key}
          title={uploadItem.title}
          cover={uploadItem.cover ?? uploadItem.thumbnail}
          artist={uploadItem.artist}
          videoId={uploadItem.videoId}
          block={roblox.blockReason(uploadItem)}
          initial={roblox.defaultForm(uploadItem)}
          onClose={() => setUploadKey(null)}
          onSubmit={(form) => roblox.upload(uploadItem, form)}
        />
      )}
      {bulkEntries.length > 0 && (
        <BulkUploadDialog
          entries={bulkEntries.map((i) => ({ key: i.key, title: i.title, thumbnail: i.thumbnail, displayName: shortName(i.title) }))}
          // Deskripsi kosong = tiap audio memakai artisnya sendiri (lihat onSubmit)
          initial={{ ...roblox.defaultForm(bulkEntries[0]), description: "" }}
          onClose={() => setBulk(null)}
          onSubmit={(chosen) => {
            const byKey = new Map(bulkEntries.map((i) => [i.key, i]));
            setPicked([]);
            void roblox.uploadMany(
              chosen.flatMap((p) => {
                const item = byKey.get(p.key);
                if (!item) return [];
                return [{ item, form: p.form.description.trim() ? p.form : { ...p.form, description: roblox.defaultForm(item).description } }];
              }),
            );
          }}
        />
      )}
      {trimKey ? (
        <TrimDialog key={trimKey} keys={[trimKey]} mode="edit" onClose={() => setTrimKey(null)} />
      ) : askKeys.length > 0 && !tour ? (
        <TrimDialog keys={askKeys} mode="ask" onClose={closeAsk} />
      ) : null}
      {importer && (
        <ImportDialog
          limit={planLimits.batchImport}
          bulkMax={planLimits.bulkRoblox}
          canUpload={Boolean(me?.user && robloxSettings.apiKey && robloxSettings.creatorId)}
          initialFile={importer.file}
          onClose={() => setImporter(null)}
        />
      )}
      {help && <ShortcutsDialog open onClose={() => setHelp(false)} />}
      {gate && <GuestGate open onClose={() => setGate(false)} />}
    </div>
  );
}

import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_OPTIONS, PRESETS, type AudioOptions, type PresetId } from "@/lib/schemas/convert.schema";
import type { JobResult, PublicJob, VideoInfo } from "@/type/converter";
import type { PermissionMode } from "@/type/history";

// Antrean converter di klien. Job berjalan di server; item menyimpan jobId untuk polling.

export type ItemStatus = "idle" | "pending" | "queued" | "downloading" | "processing" | "done" | "error";

export interface UploadState {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  assetId: string | null;
  operationId: string | null;
  error: string | null;
}

/** Upload cover album sebagai Decal (berjalan bersama upload audio) */
export interface DecalState {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  decalId: string | null;
  /** ID gambar di balik decal — yang dipakai ImageLabel/Texture; null = Roblox masih memproses */
  imageId: string | null;
  error: string | null;
}

/** Satu lagu dari video album (khusus admin): dipotong start–end, judul tetap */
export interface Clip {
  start: number;
  /** null = sampai akhir video */
  end: number | null;
  /** urutan lagu (1-based) & jumlah lagu di album */
  index: number;
  total: number;
}

/** Item baru untuk antrean: info video, opsional potongan lagu album */
export type QueueInput = VideoInfo & { clip?: Clip };

export interface QueueItem {
  key: string;
  videoId: string;
  clip: Clip | null;
  title: string;
  author: string;
  thumbnail: string;
  duration: number | null;
  /** Dari katalog musik / tebakan judul; null = tidak diketahui */
  artist: string | null;
  album: string | null;
  /** URL cover album kotak; null = pakai thumbnail video */
  cover: string | null;
  metaReady: boolean;
  status: ItemStatus;
  progress: number;
  jobId: string | null;
  error: string | null;
  result: JobResult | null;
  options: AudioOptions | null;
  autoUpload: boolean;
  upload: UploadState;
  decal: DecalState;
}

/** Preset buatan user (disimpan per perangkat) */
export interface CustomPreset {
  id: string;
  name: string;
  options: AudioOptions;
}

export interface ConverterState {
  options: AudioOptions;
  /** PresetId bawaan, id preset user ("u:xxxx"), atau "custom" (diubah manual) */
  preset: PresetId | "custom" | `u:${string}`;
  autoUpload: boolean;
  autoPermission: PermissionMode;
  /** Langsung convert begitu link ditambahkan */
  autoConvert: boolean;
  customPresets: CustomPreset[];
  items: QueueItem[];
}

const emptyUpload: UploadState = { status: "idle", assetId: null, operationId: null, error: null };
const emptyDecal: DecalState = { status: "idle", decalId: null, imageId: null, error: null };

const initialState: ConverterState = {
  options: DEFAULT_OPTIONS,
  preset: "normal",
  autoUpload: false,
  autoPermission: "none",
  autoConvert: false,
  customPresets: [],
  items: [],
};

export const MAX_CUSTOM_PRESETS = 8;

const RUNNING: ItemStatus[] = ["pending", "queued", "downloading", "processing"];
export const isRunning = (s: ItemStatus) => RUNNING.includes(s);

const find = (s: ConverterState, key: string) => s.items.find((i) => i.key === key);

const converterSlice = createSlice({
  name: "converter",
  initialState,
  reducers: {
    setOptions(state, action: PayloadAction<Partial<AudioOptions>>) {
      state.options = { ...state.options, ...action.payload };
      // Preset yang sudah dipilih tetap terpilih walau diatur manual (sampai Reset); Normal + ubahan = Kustom
      if (state.preset === "normal") state.preset = "custom";
    },
    /** Penyesuaian otomatis ke batas plan — bukan ubahan user, jadi label preset tetap */
    fitToPlan(state, action: PayloadAction<AudioOptions>) {
      state.options = action.payload;
    },
    applyPreset(state, action: PayloadAction<PresetId>) {
      // Preset hanya mengganti nilai miliknya sendiri; ubahan manual (speed, EQ, format, trim, …) tetap sampai Reset.
      // Nilai preset sebelumnya yang belum diubah manual dilepas dulu → ganti Nightcore → Slowed tidak menumpuk.
      const prev: Partial<AudioOptions> = state.preset in PRESETS ? PRESETS[state.preset as PresetId] : {};
      const next: Record<string, unknown> = { ...state.options };
      for (const [k, v] of Object.entries(prev)) {
        if (next[k] === v) next[k] = DEFAULT_OPTIONS[k as keyof AudioOptions];
      }
      state.options = { ...(next as AudioOptions), ...PRESETS[action.payload] };
      state.preset = action.payload;
    },
    resetOptions(state) {
      state.options = DEFAULT_OPTIONS;
      state.preset = "normal";
    },
    setAutoUpload(state, action: PayloadAction<{ enabled?: boolean; permission?: PermissionMode }>) {
      if (action.payload.enabled !== undefined) state.autoUpload = action.payload.enabled;
      if (action.payload.permission !== undefined) state.autoPermission = action.payload.permission;
    },
    setAutoConvert(state, action: PayloadAction<boolean>) {
      state.autoConvert = action.payload;
    },
    savePreset(state, action: PayloadAction<string>) {
      const name = action.payload.trim().slice(0, 24);
      if (!name) return;
      // Nama sama → timpa (bukan duplikat)
      const same = state.customPresets.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (same) {
        same.options = state.options;
        state.preset = `u:${same.id}`;
        return;
      }
      const id = nanoid(6);
      state.customPresets = [...state.customPresets, { id, name, options: state.options }].slice(-MAX_CUSTOM_PRESETS);
      state.preset = `u:${id}`;
    },
    applyCustomPreset(state, action: PayloadAction<string>) {
      const p = state.customPresets.find((c) => c.id === action.payload);
      if (!p) return;
      state.options = { ...DEFAULT_OPTIONS, ...p.options };
      state.preset = `u:${p.id}`;
    },
    deletePreset(state, action: PayloadAction<string>) {
      state.customPresets = state.customPresets.filter((p) => p.id !== action.payload);
      if (state.preset === `u:${action.payload}`) state.preset = "custom";
    },
    hydrateConverter(
      state,
      action: PayloadAction<Partial<Pick<ConverterState, "options" | "preset" | "autoUpload" | "autoPermission" | "autoConvert" | "customPresets">>>,
    ) {
      Object.assign(state, action.payload);
      state.options = { ...DEFAULT_OPTIONS, ...state.options };
      state.customPresets = Array.isArray(state.customPresets) ? state.customPresets : [];
    },

    addItems(state, action: PayloadAction<QueueInput[]>) {
      for (const v of action.payload) {
        // Duplikat = video sama DAN potongan sama (lagu-lagu dari satu video album bukan duplikat)
        const dup = state.items.find(
          (i) => i.videoId === v.videoId && (i.clip?.start ?? null) === (v.clip?.start ?? null) && i.status !== "done" && i.status !== "error",
        );
        if (dup) continue;
        state.items.push({
          key: nanoid(10),
          videoId: v.videoId,
          clip: v.clip ?? null,
          title: v.title,
          author: v.author,
          thumbnail: v.thumbnail,
          duration: v.duration,
          artist: null,
          album: null,
          cover: null,
          metaReady: false,
          // Auto-convert: langsung masuk antrean server dengan opsi saat ini
          status: state.autoConvert ? "pending" : "idle",
          progress: 0,
          jobId: null,
          error: null,
          result: null,
          options: state.autoConvert ? state.options : null,
          autoUpload: state.autoConvert && state.autoUpload,
          upload: emptyUpload,
          decal: emptyDecal,
        });
      }
    },
    /** Tandai item siap dikirim ke server dengan opsi saat ini */
    enqueue(state, action: PayloadAction<string[] | undefined>) {
      const keys = action.payload;
      for (const item of state.items) {
        if (keys ? !keys.includes(item.key) : item.status !== "idle" && item.status !== "error") continue;
        if (isRunning(item.status)) continue;
        Object.assign(item, {
          status: "pending",
          progress: 0,
          jobId: null,
          error: null,
          result: null,
          options: state.options,
          autoUpload: state.autoUpload,
          upload: emptyUpload,
          decal: emptyDecal,
        });
      }
    },
    jobUpdated(state, action: PayloadAction<{ key: string; job: PublicJob }>) {
      const item = find(state, action.payload.key);
      if (!item) return;
      const { job } = action.payload;
      item.jobId = job.id;
      item.status = job.status;
      item.progress = job.progress;
      item.error = job.error;
      item.result = job.result;
      if (job.title && job.title !== job.videoId) item.title = job.title;
    },
    itemFailed(state, action: PayloadAction<{ key: string; error: string; reset?: boolean }>) {
      const item = find(state, action.payload.key);
      if (!item) return;
      item.status = action.payload.reset ? "idle" : "error";
      item.error = action.payload.reset ? null : action.payload.error;
      item.progress = 0;
      item.jobId = null;
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.key !== action.payload);
    },
    /** Pindahkan item satu langkah ke atas/bawah (urutan proses & unduhan) */
    moveItem(state, action: PayloadAction<{ key: string; dir: -1 | 1 }>) {
      const i = state.items.findIndex((it) => it.key === action.payload.key);
      const j = i + action.payload.dir;
      if (i < 0 || j < 0 || j >= state.items.length) return;
      [state.items[i], state.items[j]] = [state.items[j], state.items[i]];
    },
    removeMany(state, action: PayloadAction<string[]>) {
      const drop = new Set(action.payload);
      state.items = state.items.filter((i) => !drop.has(i.key) || isRunning(i.status));
    },
    clearFinished(state) {
      state.items = state.items.filter((i) => i.status !== "done" && i.status !== "error");
    },
    uploadUpdated(state, action: PayloadAction<{ key: string; upload: Partial<UploadState> }>) {
      const item = find(state, action.payload.key);
      if (item) item.upload = { ...item.upload, ...action.payload.upload };
    },
    decalUpdated(state, action: PayloadAction<{ key: string; decal: Partial<DecalState> }>) {
      const item = find(state, action.payload.key);
      if (item) item.decal = { ...item.decal, ...action.payload.decal };
    },
    /** Metadata lagu berlaku untuk semua item dengan video yang sama */
    metaResolved(state, action: PayloadAction<{ videoId: string; artist: string | null; album: string | null; cover: string | null }>) {
      const { videoId, ...meta } = action.payload;
      for (const item of state.items) if (item.videoId === videoId) Object.assign(item, meta, { metaReady: true });
    },
    consumeAutoUpload(state, action: PayloadAction<string>) {
      const item = find(state, action.payload);
      if (item) item.autoUpload = false;
    },
  },
});

export const {
  setOptions,
  fitToPlan,
  applyPreset,
  resetOptions,
  setAutoUpload,
  setAutoConvert,
  savePreset,
  applyCustomPreset,
  deletePreset,
  hydrateConverter,
  addItems,
  enqueue,
  jobUpdated,
  itemFailed,
  removeItem,
  moveItem,
  removeMany,
  clearFinished,
  uploadUpdated,
  decalUpdated,
  metaResolved,
  consumeAutoUpload,
} = converterSlice.actions;
export default converterSlice.reducer;

"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { ApiError } from "@/lib/utils";

/** Pesan error yang ramah; 401 ditangani terpisah (redirect ke login) */
export function errorText(e: unknown) {
  if (e instanceof ApiError) {
    if (e.code === "NETWORK") return "Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.";
    return e.message;
  }
  return "Terjadi kesalahan";
}

/** Sesi admin habis → kembali ke halaman login */
export function useAuthGuard() {
  const router = useRouter();
  return useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/admin/login");
        return true;
      }
      return false;
    },
    [router],
  );
}

/**
 * Muat data admin. pollMs > 0 → refresh berkala hanya saat tab browser terlihat.
 * Respons lama yang datang setelah request baru dibuang (tanpa race).
 */
export function useAdminData<T>(loader: () => Promise<T>, deps: DependencyList, pollMs = 0) {
  const guard = useAuthGuard();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  // setState hanya setelah await → aman dipanggil dari effect
  const load = useCallback(async () => {
    const id = ++seq.current;
    try {
      const next = await loaderRef.current();
      if (id !== seq.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (id !== seq.current || guard(e)) return;
      setError(errorText(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [guard]);

  /** Muat ulang manual (tombol) — tampilkan indikator loading */
  const reload = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, pollMs);
    return () => clearInterval(t);
  }, [pollMs, load]);

  // Batalkan respons yang masih terbang saat unmount
  useEffect(() => () => void ++seq.current, []);

  return { data, error, loading, reload };
}

interface ConfirmReq {
  title: string;
  message: string;
  action: string;
}

/** Konfirmasi aksi admin dengan judul & label tombol sesuai aksinya */
export function useAdminConfirm() {
  const [req, setReq] = useState<ConfirmReq | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((r: ConfirmReq) => {
    setReq(r);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setReq(null);
  };

  const dialog = (
    <Dialog
      open={req != null}
      onClose={() => close(false)}
      title={req?.title ?? ""}
      width="max-w-[440px]"
      footer={
        <>
          <Button variant="subtle" onClick={() => close(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={() => close(true)}>
            {req?.action}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-fg-2">{req?.message}</p>
    </Dialog>
  );

  return [confirm, dialog] as const;
}

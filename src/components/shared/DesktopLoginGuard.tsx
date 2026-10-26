"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMeQuery } from "@/store/api/baseApi";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";

/**
 * Khusus app desktop: tanpa landing ("/" → Converter) dan belum login → langsung ke halaman login.
 * Baru di-mount setelah hydrate & hanya di app desktop — query sesi tidak ikut prerender (Cache Components)
 * dan tidak mengubah HTML awal di browser biasa.
 */
export default function DesktopLoginGuard() {
  const hydrated = useHydrated();
  return hydrated && getDesktop() ? <Guard /> : null;
}

function Guard() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me, isLoading } = useMeQuery();

  // Penanda kulit app desktop untuk varian CSS `desk:` (cadangan — normalnya sudah dipasang skrip head)
  useEffect(() => {
    document.documentElement.dataset.shell = "desktop";
  }, []);

  useEffect(() => {
    if (pathname === "/") {
      router.replace("/converter");
      return;
    }
    if (isLoading || !me || pathname.startsWith("/login") || pathname.startsWith("/admin")) return;
    if (!me.user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me, isLoading, pathname, router]);

  return null;
}

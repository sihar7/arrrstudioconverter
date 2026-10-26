"use client";

import { useEffect, type ReactNode } from "react";
import StoreProvider from "@/store/StoreProvider";
import { useAppSelector } from "@/store/hooks";
import Toaster from "@/components/shared/Toaster";
import TopLoader from "@/components/shared/TopLoader";
import CookieConsent from "@/components/shared/CookieConsent";
import DesktopLoginGuard from "@/components/shared/DesktopLoginGuard";

/** Terapkan tema & bahasa ke <html> setiap preferensi berubah */
function HtmlSync() {
  const { theme, lang, hydrated } = useAppSelector((s) => s.preferences);
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
  }, [theme, lang, hydrated]);
  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <HtmlSync />
      <DesktopLoginGuard />
      <TopLoader />
      {children}
      <Toaster />
      <CookieConsent />
    </StoreProvider>
  );
}

import type { ReactNode } from "react";
import type { Metadata } from "next";

// Panel admin: tidak diindeks & tidak di-cache. Header/footer app sengaja tidak dipakai.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}

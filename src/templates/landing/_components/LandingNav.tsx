"use client";

import Header from "@/app/(App)/layout/header/Header";

// Landing memakai navbar yang SAMA dengan halaman app (mode overlay di atas hero)
export default function LandingNav() {
  return <Header overlay />;
}

"use client";

import { useT } from "@/hooks/useT";
import PageHeader from "@/components/shared/PageHeader";
import RobloxCard from "./RobloxCard";
import { AccountCard, AppearanceCard, DefaultsCard } from "./PreferencesCards";
import DesktopStorageCard from "./DesktopStorageCard";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";
import { useMeQuery } from "@/store/api/baseApi";
import ConnectorCard from "./ConnectorCard";
import AliceMemoryCard from "./AliceMemoryCard";
import AliceProfileCard from "./AliceProfileCard";

export default function SettingsScreen() {
  const { t } = useT();
  // App desktop versi baru: kartu folder penyimpanan (app lama belum punya API-nya)
  const desktop = useHydrated() ? getDesktop() : undefined;
  // Konektor Claude & status chat Alice: admin di app desktop saja
  const { data: me } = useMeQuery();
  const admin = Boolean(desktop && me?.user?.isAdmin);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t.settings.eyebrow} title={t.settings.title} sub={t.settings.sub} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <RobloxCard />
        <div className="flex flex-col gap-6">
          {admin && <AliceProfileCard />}
          {admin && <ConnectorCard />}
          {admin && <AliceMemoryCard />}
          {desktop?.getSaveSettings && <DesktopStorageCard desktop={desktop} />}
          <DefaultsCard />
          <AppearanceCard />
          <AccountCard />
        </div>
      </div>
    </div>
  );
}

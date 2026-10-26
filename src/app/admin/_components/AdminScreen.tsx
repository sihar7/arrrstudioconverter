"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "iconoir-react";
import { LogoMark } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/PrefToggles";
import PageLoader from "@/components/shared/PageLoader";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import { useToast } from "@/hooks/useToast";
import type { AdminMe } from "@/type/admin";
import { adminLogout, adminMe } from "../_service/admin.service";
import { useAuthGuard } from "../_hooks/useAdmin";
import OverviewTab from "./OverviewTab";
import UsersTab from "./UsersTab";
import JobsTab from "./JobsTab";
import FilesTab from "./FilesTab";
import AuditTab from "./AuditTab";

const TABS = [
  { value: "overview", label: "Utama", title: "Ikhtisar" },
  { value: "users", label: "User", title: "User" },
  { value: "jobs", label: "Job", title: "Job konversi" },
  { value: "files", label: "File", title: "File hasil" },
  { value: "audit", label: "Audit", title: "Log audit" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const tabFromHash = (): Tab => {
  const h = window.location.hash.slice(1);
  return TABS.some((t) => t.value === h) ? (h as Tab) : "overview";
};

export default function AdminScreen() {
  const router = useRouter();
  const guard = useAuthGuard();
  const toast = useToast();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let alive = true;
    adminMe()
      .then((m) => alive && setMe(m))
      .catch((e) => {
        if (alive && !guard(e)) router.replace("/admin/login");
      });
    return () => {
      alive = false;
    };
  }, [guard, router]);

  // Tab aktif disimpan di hash → bisa di-refresh / dibagikan
  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Sesi admin berakhir sendiri → keluar otomatis
  useEffect(() => {
    if (!me) return;
    const ms = me.expiresAt - Date.now();
    if (ms > 2 ** 31 - 1) return;
    const t = setTimeout(() => router.replace("/admin/login"), Math.max(0, ms));
    return () => clearTimeout(t);
  }, [me, router]);

  const changeTab = (v: Tab) => {
    setTab(v);
    history.replaceState(null, "", `#${v}`);
  };

  const logout = async () => {
    setLeaving(true);
    try {
      await adminLogout();
    } catch {
      toast("Gagal keluar di server — cookie tetap dihapus saat sesi berakhir", "err");
    }
    router.replace("/admin/login");
  };

  if (!me) return <PageLoader />;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[var(--wrap)] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark />
            <span className="caps truncate text-[11px] text-fg">
              Admin <span className="normal-case tracking-normal text-fg-3">@{me.username}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" variant="ghost" loading={leaving} onClick={logout} icon={<LogOut aria-hidden="true" />}>
              <span className="max-[479px]:sr-only">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[var(--wrap)] flex-1 px-4 pb-16 pt-8 outline-none sm:px-8 sm:pt-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Panel admin</p>
            <h1 className="mt-3 font-display text-[clamp(30px,4vw,44px)] font-bold leading-none tracking-[-0.035em]">
              {TABS.find((t) => t.value === tab)?.title}
            </h1>
          </div>
          <Segmented label="Bagian admin" value={tab} options={TABS.map(({ value, label }) => ({ value, label }))} onChange={changeTab} className="w-full sm:w-[460px]" />
        </div>
        <hr className="engrave mt-8" />

        <div className="mt-8" key={tab}>
          {tab === "overview" && <OverviewTab />}
          {tab === "users" && <UsersTab />}
          {tab === "jobs" && <JobsTab />}
          {tab === "files" && <FilesTab />}
          {tab === "audit" && <AuditTab />}
        </div>
      </main>
    </div>
  );
}

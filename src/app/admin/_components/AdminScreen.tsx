"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import { Activity, Cart, ClockRotateRight, Folder, Group, HomeSimple, LogOut, Menu, Server, ShieldCheck, Xmark } from "iconoir-react";
import { LogoMark } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/PrefToggles";
import PageLoader from "@/components/shared/PageLoader";
import IconButton from "@/components/ui/IconButton";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import type { AdminMe } from "@/type/admin";
import { adminLogout, adminMe, getOrders } from "../_service/admin.service";
import { useAuthGuard } from "../_hooks/useAdmin";
import { useAdminEvents } from "../_hooks/useAdminEvents";
import NotificationBell from "./NotificationBell";
import OverviewTab from "./OverviewTab";
import OrdersTab from "./OrdersTab";
import UsersTab from "./UsersTab";
import JobsTab from "./JobsTab";
import FilesTab from "./FilesTab";
import SystemCard from "./SystemCard";
import AuditTab from "./AuditTab";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type Tab = "overview" | "orders" | "users" | "jobs" | "files" | "system" | "audit";
interface NavEntry {
  value: Tab;
  label: string;
  title: string;
  sub: string;
  icon: Icon;
}

// Navigasi dikelompokkan per peran: ringkasan · bisnis · operasional · keamanan
const GROUPS: { label: string; items: NavEntry[] }[] = [
  { label: "Ringkasan", items: [{ value: "overview", label: "Dashboard", title: "Dashboard", sub: "Pendapatan, pelanggan & aktivitas", icon: HomeSimple }] },
  {
    label: "Bisnis",
    items: [
      { value: "orders", label: "Order", title: "Order & pembayaran", sub: "Konfirmasi pembayaran QRIS", icon: Cart },
      { value: "users", label: "User & plan", title: "User & plan", sub: "Akun Discord, plan & moderasi", icon: Group },
    ],
  },
  {
    label: "Operasional",
    items: [
      { value: "jobs", label: "Job", title: "Job konversi", sub: "Antrean & status konversi", icon: Activity },
      { value: "files", label: "File", title: "File hasil", sub: "File siap unduh di storage", icon: Folder },
      { value: "system", label: "Sistem", title: "Kesehatan sistem", sub: "Database, storage, tools & janitor", icon: Server },
    ],
  },
  { label: "Keamanan", items: [{ value: "audit", label: "Log audit", title: "Log audit", sub: "Jejak semua aksi admin", icon: ShieldCheck }] },
];

const ITEMS = GROUPS.flatMap((g) => g.items);

const tabFromHash = (): Tab => {
  const h = window.location.hash.slice(1);
  return ITEMS.some((t) => t.value === h) ? (h as Tab) : "overview";
};

const remaining = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)}j ${m % 60}m` : `${m}m`;
};

export default function AdminScreen() {
  const router = useRouter();
  const guard = useAuthGuard();
  const toast = useToast();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [leaving, setLeaving] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [pending, setPending] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const drawerRef = useRef<HTMLDialogElement>(null);

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

  // Sesi admin berakhir sendiri → keluar otomatis; sisa sesi di sidebar diperbarui tiap menit
  useEffect(() => {
    if (!me) return;
    const ms = me.expiresAt - Date.now();
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    const out = ms > 2 ** 31 - 1 ? null : setTimeout(() => router.replace("/admin/login"), Math.max(0, ms));
    return () => {
      clearInterval(tick);
      if (out) clearTimeout(out);
    };
  }, [me, router]);

  // Badge: order yang menunggu dicek admin (diperbarui berkala selama tab browser terlihat)
  const loadPending = useCallback(() => {
    getOrders("confirming")
      .then((r) => setPending(r.items.length))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!me) return;
    loadPending();
    const t = setInterval(() => document.visibilityState === "visible" && loadPending(), 30_000);
    return () => clearInterval(t);
  }, [me, loadPending]);

  // Realtime: event order → toast + badge diperbarui; polling 30 dtk di atas tetap jadi cadangan
  const [unread, setUnread] = useState(0);
  const live = useAdminEvents((e) => {
    setUnread((n) => n + 1);
    loadPending();
    if (e.type === "order.confirming" || e.type === "order.proof" || e.type === "order.created") toast(`${e.title} — ${e.body}`, "info");
  }, me != null);

  // Judul tab browser menampilkan jumlah order yang perlu dicek
  useEffect(() => {
    const base = "Admin";
    const title = ITEMS.find((i) => i.value === tab)?.title ?? "Dashboard";
    document.title = pending > 0 ? `(${pending}) Order perlu dicek · ${base}` : `${title} · ${base}`;
  }, [pending, tab]);

  useEffect(() => {
    const d = drawerRef.current;
    if (!d) return;
    if (drawer && !d.open) d.showModal();
    if (!drawer && d.open) d.close();
  }, [drawer]);

  const changeTab = (v: Tab) => {
    setTab(v);
    setDrawer(false);
    history.replaceState(null, "", `#${v}`);
    document.getElementById("main")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
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

  const current = ITEMS.find((i) => i.value === tab) ?? ITEMS[0];
  const group = GROUPS.find((g) => g.items.some((i) => i.value === tab));

  const nav = (
    <nav aria-label="Bagian admin" className="flex flex-col gap-6">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="caps px-3 pb-2 text-[10px] text-fg-3">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ value, label, icon: Ico }) => {
              const active = value === tab;
              const badge = value === "orders" && pending > 0 ? pending : 0;
              return (
                <li key={value}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => changeTab(value)}
                    className={cn(
                      "state-layer group relative flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-s px-3 text-left text-[14px] transition-colors duration-200",
                      active ? "bg-raised font-semibold text-fg" : "text-fg-2 hover:bg-hover/60 hover:text-fg",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-y-2.5 left-0 w-0.5 origin-center rounded-full bg-accent transition-transform duration-300 ease-[var(--ease)]",
                        active ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <Ico width={18} height={18} strokeWidth={active ? 1.9 : 1.6} aria-hidden="true" className="shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {badge > 0 && (
                      <span className="min-w-5 rounded-full bg-warn px-1.5 text-center font-mono text-[11px] font-semibold leading-5 text-bg">
                        {badge}
                        <span className="sr-only"> menunggu konfirmasi</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="flex items-center gap-3 rounded-s border border-line/60 bg-bg/40 p-3">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-s bg-tonal font-display text-[14px] font-bold text-on-tonal">
        {me.username.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold">@{me.username}</p>
        <p className="flex items-center gap-1 text-[12px] text-fg-3">
          <ClockRotateRight width={12} height={12} aria-hidden="true" />
          Sesi {remaining(me.expiresAt - now)}
        </p>
      </div>
      <IconButton label="Keluar" size="sm" loading={leaving} icon={<LogOut width={16} height={16} />} onClick={logout} />
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line/70 bg-surface/60 lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-line/70 px-5">
          <LogoMark />
          <div className="min-w-0 leading-tight">
            <p className="caps text-[11px] text-fg">Admin console</p>
            <p className="text-[11.5px] text-fg-3">ARR Studio Converter</p>
          </div>
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto px-3 py-6">{nav}</div>
        <div className="flex flex-col gap-3 border-t border-line/70 p-3">
          <div className="flex items-center justify-between px-2">
            <span className="caps text-[10px] text-fg-3">Tema</span>
            <ThemeToggle />
          </div>
          {account}
        </div>
      </aside>

      {/* Drawer HP / tablet */}
      <dialog
        ref={drawerRef}
        aria-label="Navigasi admin"
        onClose={() => setDrawer(false)}
        onClick={(e) => e.target === e.currentTarget && setDrawer(false)}
        className="m-0 h-dvh max-h-none w-[min(300px,86vw)] max-w-none border-r border-line/70 bg-surface p-0 text-fg backdrop:bg-[var(--scrim)] open:flex open:flex-col open:animate-[drawer-in_.35s_var(--ease)] lg:hidden"
      >
        <div className="flex h-16 items-center justify-between border-b border-line/70 pl-5 pr-2">
          <div className="flex items-center gap-3">
            <LogoMark />
            <p className="caps text-[11px] text-fg">Admin console</p>
          </div>
          <IconButton label="Tutup menu" icon={<Xmark width={20} height={20} />} onClick={() => setDrawer(false)} />
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto px-3 py-6">{nav}</div>
        <div className="border-t border-line/70 p-3">{account}</div>
      </dialog>

      <div className="flex min-w-0 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-line/70 bg-[var(--glass)] backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-8">
            <IconButton label="Buka menu" aria-haspopup="dialog" aria-expanded={drawer} icon={<Menu width={20} height={20} />} onClick={() => setDrawer(true)} className="-ml-2 lg:hidden" />
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-2 text-[13px]">
                <li className="hidden text-fg-3 sm:block">Admin</li>
                <li aria-hidden="true" className="hidden text-fg-3 sm:block">/</li>
                {group && group.label !== "Ringkasan" && (
                  <>
                    <li className="hidden text-fg-3 sm:block">{group.label}</li>
                    <li aria-hidden="true" className="hidden text-fg-3 sm:block">/</li>
                  </>
                )}
                <li aria-current="page" className="truncate font-semibold text-fg">
                  {current.label}
                </li>
              </ol>
            </nav>
            {pending > 0 && tab !== "orders" && (
              <button
                type="button"
                onClick={() => changeTab("orders")}
                className="state-layer hidden min-h-9 cursor-pointer items-center gap-2 rounded-s bg-warn/12 px-3 text-[12.5px] font-semibold text-warn transition-colors hover:bg-warn/20 sm:inline-flex"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
                {pending} order perlu dicek
              </button>
            )}
            <NotificationBell
              state={live.state}
              events={live.events}
              unread={unread}
              sound={live.sound}
              onSound={live.setSound}
              permission={live.permission}
              onRequestDesktop={() => void live.requestDesktop()}
              onOpen={() => setUnread(0)}
              onOpenOrder={() => changeTab("orders")}
              onClear={live.clear}
            />
            <span className="lg:hidden">
              <ThemeToggle />
            </span>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1520px] flex-1 px-4 pb-16 pt-8 outline-none sm:px-8 sm:pt-10">
          <div className="mb-8">
            <h1 className="font-display text-[clamp(26px,3.2vw,36px)] font-bold leading-[1.05] tracking-[-0.03em]">{current.title}</h1>
            <p className="mt-2 text-[14px] text-fg-2">{current.sub}</p>
          </div>

          <div key={tab} className="fade-swap">
            {tab === "overview" && <OverviewTab onOpen={changeTab} />}
            {tab === "orders" && <OrdersTab onChanged={loadPending} />}
            {tab === "users" && <UsersTab />}
            {tab === "jobs" && <JobsTab />}
            {tab === "files" && <FilesTab />}
            {tab === "system" && <SystemCard />}
            {tab === "audit" && <AuditTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

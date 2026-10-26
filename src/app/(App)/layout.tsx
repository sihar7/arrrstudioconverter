import Header from "./layout/header/Header";
import Footer from "./layout/footer/Footer";
import DesktopBridge from "@/components/shared/DesktopBridge";
import DesktopShell from "./layout/desktop/DesktopShell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DesktopShell />
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[var(--wrap)] flex-1 px-4 pb-16 pt-8 outline-none sm:px-8 sm:pt-14 desk:pt-[calc(var(--bar-h)+32px)] desk:pb-[calc(var(--dock-h)+40px)]">
        {children}
      </main>
      <Footer withTabBar />
      <DesktopBridge />
    </div>
  );
}

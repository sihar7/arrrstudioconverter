import Header from "./layout/header/Header";
import Footer from "./layout/footer/Footer";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[var(--wrap)] flex-1 px-4 pb-16 pt-8 outline-none sm:px-8 sm:pt-14">
        {children}
      </main>
      <Footer withTabBar />
    </div>
  );
}

"use client";

import Footer from "@/app/(App)/layout/footer/Footer";
import { useReveal } from "./_hooks/useReveal";
import LandingNav from "./_components/LandingNav";
import Hero from "./_components/Hero";
import DesktopSection from "./_components/DesktopSection";
import { Compare, CtaBand, Faq, Features, Numbers, Philosophy, Steps } from "./_components/Sections";

export default function LandingPage() {
  useReveal();
  return (
    <>
      <LandingNav />
      <main id="main">
        <Hero />
        <Numbers />
        <Features />
        <Philosophy />
        <Steps />
        <Compare />
        <DesktopSection />
        <Faq />
        <CtaBand />
      </main>
      <Footer withTabBar />
    </>
  );
}

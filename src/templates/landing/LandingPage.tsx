"use client";

import Footer from "@/app/(App)/layout/footer/Footer";
import { useReveal } from "./_hooks/useReveal";
import LandingNav from "./_components/LandingNav";
import Hero from "./_components/Hero";
import { Compare, CtaBand, Faq, Features, Numbers, Obfuscator, Philosophy, Showcase, Steps } from "./_components/Sections";

export default function LandingPage() {
  useReveal();
  return (
    <>
      <LandingNav />
      <main id="main">
        <Hero />
        <Numbers />
        <Showcase />
        <Features />
        <Philosophy />
        <Steps />
        <Obfuscator />
        <Compare />
        <Faq />
        <CtaBand />
      </main>
      <Footer withTabBar />
    </>
  );
}

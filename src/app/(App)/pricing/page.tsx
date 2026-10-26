import type { Metadata } from "next";
import PricingScreen from "./_components/PricingScreen";

export const metadata: Metadata = { title: "Harga" };

export default function PricingPage() {
  return <PricingScreen />;
}

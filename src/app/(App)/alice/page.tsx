import type { Metadata } from "next";
import AliceScreen from "./_components/AliceScreen";

export const metadata: Metadata = { title: "Alice", robots: { index: false } };

export default function AlicePage() {
  return <AliceScreen />;
}

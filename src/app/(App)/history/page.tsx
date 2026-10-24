import type { Metadata } from "next";
import HistoryScreen from "./_components/HistoryScreen";

export const metadata: Metadata = { title: "Riwayat" };

export default function HistoryPage() {
  return <HistoryScreen />;
}

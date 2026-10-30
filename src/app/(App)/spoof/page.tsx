import type { Metadata } from "next";
import SpoofGate from "./_components/SpoofGate";

export const metadata: Metadata = {
  title: "Spoof Animasi & Audio Roblox",
  description: "Unduh animasi atau audio Roblox milikmu / grupmu lalu upload ulang otomatis jadi ID baru.",
};

export default function SpoofPage() {
  return <SpoofGate />;
}

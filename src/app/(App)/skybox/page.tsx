import type { Metadata } from "next";
import SkyboxGate from "./_components/SkyboxGate";

export const metadata: Metadata = {
  title: "Skybox Converter",
  description: "Ubah panorama 360° jadi 6 sisi skybox Roblox dengan preview 3D langsung — gratis, diproses di perangkatmu.",
};

export default function SkyboxPage() {
  return <SkyboxGate />;
}

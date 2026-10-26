import type { Metadata } from "next";
import UpscaleGate from "./_components/UpscaleGate";

export const metadata: Metadata = {
  title: "Upscale gambar",
  description: "Perbesar gambar 2× atau 4× dengan AI Real-ESRGAN — tetap tajam, diproses di perangkatmu.",
};

export default function UpscalePage() {
  return <UpscaleGate />;
}

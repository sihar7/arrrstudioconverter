import type { Metadata } from "next";
import RemoveBgGate from "./_components/RemoveBgGate";

export const metadata: Metadata = {
  title: "Hapus background",
  description: "Hapus background foto otomatis dengan AI — diproses di perangkatmu, hasil PNG transparan.",
};

export default function RemoveBgPage() {
  return <RemoveBgGate />;
}

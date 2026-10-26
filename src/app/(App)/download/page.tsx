import type { Metadata } from "next";
import DownloadScreen from "./_components/DownloadScreen";

export const metadata: Metadata = {
  title: "Aplikasi desktop",
  description: "Download ARRR Studio Converter untuk Windows & macOS — hasil convert langsung ke folder, notifikasi, dan update otomatis.",
};

export default function DownloadPage() {
  return <DownloadScreen />;
}

import type { Metadata } from "next";
import UploadGate from "./_components/UploadGate";

export const metadata: Metadata = {
  title: "Upload Audio ke Roblox",
  description: "Upload file MP3, OGG, WAV, atau FLAC dari perangkatmu ke Roblox — satu per satu atau sekaligus.",
};

export default function UploadPage() {
  return <UploadGate />;
}

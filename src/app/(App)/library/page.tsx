import type { Metadata } from "next";
import LibraryScreen from "./_components/LibraryScreen";

export const metadata: Metadata = { title: "Audio saya" };

export default function LibraryPage() {
  return <LibraryScreen />;
}

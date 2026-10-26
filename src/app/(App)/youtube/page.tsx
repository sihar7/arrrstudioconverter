import type { Metadata } from "next";
import YoutubeScreen from "./_components/YoutubeScreen";

export const metadata: Metadata = {
  title: "YouTube",
  description: "Jelajahi YouTube di app desktop ARRR Studio dan kirim lagu ke antrean converter sekali klik.",
};

export default function YoutubePage() {
  return <YoutubeScreen />;
}

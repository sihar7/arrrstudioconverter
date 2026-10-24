import type { Metadata, Viewport } from "next";
import { Google_Sans_Code, Google_Sans_Flex } from "next/font/google";
import Providers from "@/context/Providers";
import "@/css/globals.css";

// Google Sans Flex variable: axis wdth dipakai judul lebar (.font-display), opsz untuk teks kecil
const sans = Google_Sans_Flex({ subsets: ["latin"], axes: ["wdth", "opsz"], variable: "--font-gsans", display: "swap" });
const mono = Google_Sans_Code({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-gcode", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ARRR Studio Converter — YouTube ke Roblox Audio", template: "%s · ARRR Studio Converter" },
  description:
    "Convert YouTube ke MP3/OGG/WAV/FLAC, atur kecepatan, nada & efek, lalu upload langsung ke Roblox lengkap dengan izin place.",
  applicationName: "ARRR Studio Converter",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0e10" },
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Pasang tema sebelum paint (tanpa kedip). Default gelap.
const themeScript = `try{var t=localStorage.getItem('arrc_theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

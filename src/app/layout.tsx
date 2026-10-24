import type { Metadata, Viewport } from "next";
import { Google_Sans_Code, Google_Sans_Flex } from "next/font/google";
import Providers from "@/context/Providers";
import "@/css/globals.css";

// Google Sans Flex variable: axis wdth dipakai judul lebar (.font-display), opsz untuk teks kecil
const sans = Google_Sans_Flex({ subsets: ["latin"], axes: ["wdth", "opsz"], variable: "--font-gsans", display: "swap" });
const mono = Google_Sans_Code({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-gcode", display: "swap" });

const siteUrl =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
const title = "ARRR Studio Converter — YouTube ke Roblox Audio";
const description =
  "Convert YouTube ke MP3/OGG/WAV/FLAC, atur kecepatan, nada & efek, lalu upload langsung ke Roblox lengkap dengan izin place.";

// og:image diisi otomatis dari app/opengraph-image.tsx; metadataBase membuat URL-nya absolut (wajib untuk Discord/WA)
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s · ARRR Studio Converter" },
  description,
  applicationName: "ARRR Studio Converter",
  openGraph: {
    type: "website",
    siteName: "ARRR Studio Converter",
    title,
    description,
    url: "/",
    locale: "id_ID",
  },
  twitter: { card: "summary_large_image", title, description },
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

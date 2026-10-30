import type { Metadata, Viewport } from "next";
import Providers from "@/context/Providers";
import Url from "@/Url/Url";
import localFont from "next/font/local";
import "@/css/globals.css";

// Font dibundel sendiri (WOFF2 subset latin, ±105 KB total, tanpa request ke Google) — sama dengan app mobile:
// Sora = judul display · Inter Tight = isi · IBM Plex Mono = label/tombol (gaya referensi). Dipakai lewat token di globals.css.
const sora = localFont({ src: "./fonts/Sora.woff2", variable: "--font-sora", weight: "100 800", display: "swap" });
const interTight = localFont({ src: "./fonts/InterTight.woff2", variable: "--font-inter-tight", weight: "100 900", display: "swap" });
const plexMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-400.woff2", weight: "400" },
    { path: "./fonts/IBMPlexMono-500.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

// VERCEL_PROJECT_PRODUCTION_URL otomatis = custom domain produksi (bypass.arrrstudio.com) begitu domain itu aktif
const siteUrl =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
const title = "ARRR Studio Converter — YouTube ke Roblox Audio";
const description =
  "Convert YouTube ke MP3/OGG/WAV/FLAC, atur kecepatan, nada & efek, lalu upload langsung ke Roblox lengkap dengan izin place.";

// og:image diisi otomatis dari app/opengraph-image.tsx; metadataBase membuat URL-nya absolut (wajib untuk Discord/WA).
// URL metadata (og:image, og:url) tidak diberi basePath oleh Next → basePath dipasang di metadataBase
export const metadata: Metadata = {
  metadataBase: new URL(`${new URL(siteUrl).origin}${Url.basePath}`),
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
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Pasang tema sebelum paint (tanpa kedip). Default gelap.
// App desktop (bridge preload sudah ada sebelum skrip ini jalan): kulit aplikasi + title bar sendiri.
const themeScript = `try{var h=document.documentElement,t=localStorage.getItem('arrc_theme');h.dataset.theme=t==='light'?'light':'dark';var d=window.arrDesktop;if(d){h.dataset.shell='desktop';if(d.titleBar)h.dataset.titlebar=d.platform;if(localStorage.getItem('arrc_side')==='rail'||innerWidth<1100)h.dataset.side='rail'}}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="dark" className={`${sora.variable} ${interTight.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

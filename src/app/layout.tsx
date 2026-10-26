import type { Metadata, Viewport } from "next";
import Providers from "@/context/Providers";
import "@/css/globals.css";

// Tanpa web font: pakai font sistem (SF Pro di iPhone/Mac, Segoe UI Variable di Windows, Roboto di Android)
// → nol request font (sebelumnya ±600 KB) dan rasa native ala iOS. Stack ada di globals.css.

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
// App desktop (bridge preload sudah ada sebelum skrip ini jalan): kulit aplikasi + title bar sendiri.
const themeScript = `try{var h=document.documentElement,t=localStorage.getItem('arrc_theme');h.dataset.theme=t==='light'?'light':'dark';var d=window.arrDesktop;if(d){h.dataset.shell='desktop';if(d.titleBar)h.dataset.titlebar=d.platform}}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

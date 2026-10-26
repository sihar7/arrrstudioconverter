"use client";

import WebYoutube from "./WebYoutube";

/**
 * YouTube versi ARRR (sama di web & app desktop): pencarian sendiri + pemutar embed + "Tambah ke antrean".
 * Sengaja tidak menanam YouTube asli di app desktop — tampilan custom ini yang dipakai di semua platform.
 */
export default function YoutubeScreen() {
  return <WebYoutube />;
}

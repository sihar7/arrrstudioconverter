/**
 * Judul dua nada ala referensi: bagian pertama terang, sisanya abu (.tone-2).
 * Titik potong: tanda baca pertama (", " ". " " — ") bila ada; selain itu separuh kata pertama (≥ 4 kata).
 * Judul pendek (< 4 kata, tanpa tanda baca) tampil satu nada.
 */
export function splitTitle(title: string): [string, string] {
  const m = title.match(/^(.+?[,.—:])\s+(.+)$/);
  if (m && m[1].length >= 3) return [m[1], m[2]];
  const words = title.trim().split(/\s+/);
  if (words.length < 4) return [title, ""];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

export default function TwoTone({ text }: { text: string }) {
  const [lead, rest] = splitTitle(text);
  return (
    <>
      {lead}
      {rest && <span className="tone-2"> {rest}</span>}
    </>
  );
}

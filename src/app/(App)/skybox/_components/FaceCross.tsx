"use client";

import type { ReactNode } from "react";
import { FACE_CROSS, FACE_PROP, FACES, type FaceId } from "../_lib/skyMath";

/**
 * Tata letak salib 4×3 untuk 6 sisi (Up di atas Ft, Rt–Ft–Lf–Bk di tengah, Dn di bawah).
 * Isi tiap ubin diserahkan ke pemanggil (gambar hasil / slot pilih file).
 */
export default function FaceCross({ renderTile }: { renderTile: (face: FaceId, prop: string) => ReactNode }) {
  return (
    <div className="grid grid-cols-4 grid-rows-3 gap-1.5 sm:gap-2">
      {FACES.map((f) => (
        <div key={f} style={{ gridColumn: FACE_CROSS[f].col, gridRow: FACE_CROSS[f].row }} className="relative aspect-square min-w-0">
          {renderTile(f, FACE_PROP[f])}
        </div>
      ))}
    </div>
  );
}

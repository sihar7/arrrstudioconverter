import { useId, type ComponentType, type ReactNode } from "react";

/**
 * Ikon menu bergaya SF Symbols (iOS): garis membulat untuk keadaan biasa, versi "fill" untuk aktif —
 * persis perilaku tab bar iOS. Inline SVG (tanpa request & tanpa paket tambahan).
 */
export interface SfIconProps {
  filled?: boolean;
  size?: number;
  className?: string;
  /** Hanya untuk API yang kompatibel dengan ikon iconoir (width/height) */
  width?: number;
  height?: number;
}

export type SfIcon = ComponentType<SfIconProps>;

function Svg({ size = 24, width, height, className, children }: SfIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** waveform — Converter */
export function SfWaveform(p: SfIconProps) {
  return (
    <Svg {...p}>
      <path strokeWidth={p.filled ? 2.6 : 2} d="M4 9.5v5M8 6v12M12 3.5v17M16 7.5v9M20 10v4" />
    </Svg>
  );
}

/** square.stack — Audio saya (pustaka) */
export function SfStack(p: SfIconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 5.4h11M9 2.6h6" />
      <rect x="3.5" y="8.2" width="17" height="13" rx="3.4" fill={p.filled ? "currentColor" : "none"} />
    </Svg>
  );
}

/** clock — Riwayat */
export function SfClock(p: SfIconProps) {
  const id = useId();
  if (!p.filled) {
    return (
      <Svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5.2l3.4 2" />
      </Svg>
    );
  }
  return (
    <Svg {...p}>
      <mask id={id}>
        <rect width="24" height="24" fill="#fff" stroke="none" />
        <path d="M12 7v5.2l3.4 2" stroke="#000" strokeWidth={2} />
      </mask>
      <circle cx="12" cy="12" r="9.6" fill="currentColor" stroke="none" mask={`url(#${id})`} />
    </Svg>
  );
}

/** cube.transparent — Skybox (kubus 6 sisi) */
export function SfCube(p: SfIconProps) {
  return (
    <Svg {...p}>
      <path fill={p.filled ? "currentColor" : "none"} fillOpacity={p.filled ? 0.22 : 0} d="M12 2.8l8 4.5v9.4l-8 4.5-8-4.5V7.3Z" />
      <path d="M4 7.3l8 4.5 8-4.5M12 11.8v9.4" />
    </Svg>
  );
}

/** crown — Harga / paket */
export function SfCrown(p: SfIconProps) {
  return (
    <Svg {...p}>
      <path
        fill={p.filled ? "currentColor" : "none"}
        d="M4 8.6l3.9 3.3L12 5.6l4.1 6.3L20 8.6l-1.5 9a1.2 1.2 0 0 1-1.2 1H6.7a1.2 1.2 0 0 1-1.2-1Z"
      />
    </Svg>
  );
}

/** gearshape — Pengaturan */
export function SfGear(p: SfIconProps) {
  const id = useId();
  const gear =
    "M19.26 10.56L21.2 10.65L21.2 13.35L19.26 13.44L18.15 16.11L19.48 17.56L17.56 19.48L16.11 18.15L13.44 19.26L13.35 21.2L10.65 21.2L10.56 19.26L7.89 18.15L6.44 19.48L4.52 17.56L5.85 16.11L4.74 13.44L2.8 13.35L2.8 10.65L4.74 10.56L5.85 7.89L4.52 6.44L6.44 4.52L7.89 5.85L10.56 4.74L10.65 2.8L13.35 2.8L13.44 4.74L16.11 5.85L17.56 4.52L19.48 6.44L18.15 7.89Z";
  if (!p.filled) {
    return (
      <Svg {...p}>
        <path d={gear} strokeWidth={1.6} />
        <circle cx="12" cy="12" r="3" />
      </Svg>
    );
  }
  return (
    <Svg {...p}>
      <mask id={id}>
        <rect width="24" height="24" fill="#fff" stroke="none" />
        <circle cx="12" cy="12" r="3.1" fill="#000" stroke="none" />
      </mask>
      <path d={gear} fill="currentColor" strokeWidth={1.4} mask={`url(#${id})`} />
    </Svg>
  );
}

/** lock — Obfuscator (admin) */
export function SfLock(p: SfIconProps) {
  const id = useId();
  return (
    <Svg {...p}>
      <path d="M8 10.6V7.6a4 4 0 0 1 8 0v3" />
      {p.filled ? (
        <>
          <mask id={id}>
            <rect width="24" height="24" fill="#fff" stroke="none" />
            <path d="M12 14.4v2.6" stroke="#000" strokeWidth={2.2} />
          </mask>
          <rect x="5" y="10.4" width="14" height="10.6" rx="2.8" fill="currentColor" mask={`url(#${id})`} />
        </>
      ) : (
        <>
          <rect x="5" y="10.4" width="14" height="10.6" rx="2.8" />
          <path d="M12 14.6v2.2" />
        </>
      )}
    </Svg>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Port React dari ARR UI createCard (ARR-UI/src/card.js): markup & kelas identik (.arr-card + __rail/__body/__head/
// __meta/__aside/__title/__text/__foot), jadi skin proyek (css/arr-skin.css, data-variant) berlaku sama.
// interactive → <button> asli (fokus, Enter/Space, disabled) alih-alih div role="button".

interface Props {
  variant: string;
  /** kunci warna → --arr-tone: var(--arr-tone-<tone>) */
  tone?: string;
  meta?: ReactNode[];
  aside?: ReactNode;
  title?: ReactNode;
  text?: ReactNode;
  foot?: ReactNode;
  children?: ReactNode;
  className?: string;
  label?: string;
  /** diisi = kartu jadi tombol */
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  /** tag non-interaktif (default article) */
  as?: "article" | "section" | "div";
}

export default function ArrCard({ variant, tone, meta, aside, title, text, foot, children, className, label, onClick, pressed, disabled, as = "article" }: Props) {
  const style = tone ? ({ "--arr-tone": `var(--arr-tone-${tone})`, "--arr-on-tone": `var(--arr-on-${tone}, var(--arr-surface))` } as CSSProperties) : undefined;
  const body = (
    <>
      <span className="arr-card__rail" aria-hidden="true" />
      <div className="arr-card__body">
        {(meta?.length || aside != null) && (
          <div className="arr-card__head">
            <div className="arr-card__meta">{meta?.map((m, i) => (m == null || m === false ? null : <span key={i}>{m}</span>))}</div>
            {aside != null && <span className="arr-card__aside">{aside}</span>}
          </div>
        )}
        {title != null && <p className="arr-card__title">{title}</p>}
        {text != null && <p className="arr-card__text">{text}</p>}
        {children}
        {foot != null && <div className="arr-card__foot">{foot}</div>}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cn("arr-card", className)} data-variant={variant} data-tone={tone} style={style} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
        {body}
      </button>
    );
  }
  const Tag = as;
  return (
    <Tag className={cn("arr-card", className)} data-variant={variant} data-tone={tone} style={style} aria-label={label}>
      {body}
    </Tag>
  );
}

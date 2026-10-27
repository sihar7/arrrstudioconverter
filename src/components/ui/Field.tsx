import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  // Field iOS: isi abu sistem tanpa garis; fokus = tepi aksen + cincin lembut
  "h-12 w-full min-w-0 rounded border border-transparent bg-fg/[0.06] px-4 text-[15px] text-fg placeholder:text-fg-3 transition-[background-color,border-color,box-shadow] duration-200 hover:bg-fg/[0.08] focus:border-accent/70 focus:bg-transparent focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_18%,transparent)] focus:outline-none aria-[invalid=true]:border-err disabled:opacity-40 desk:h-9 desk:rounded-[8px] desk:px-3 desk:text-[13.5px] desk:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  aside?: ReactNode;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Label terlihat + hint + error yang terhubung via aria-describedby */
export default function Field({ label, hint, error, className, aside, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cn("flex flex-col gap-2 desk:gap-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-fg-2 desk:text-[12px]">
          {label}
        </label>
        {aside}
      </div>
      {children({ id, describedBy: [errId, hintId].filter(Boolean).join(" ") || undefined, invalid: Boolean(error) })}
      {error ? (
        <p id={errId} role="alert" className="text-[13px] text-err">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[13px] leading-relaxed text-fg-3 desk:text-[12px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 resize-y py-3 leading-relaxed desk:h-auto desk:min-h-20 desk:py-2", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClass, "cursor-pointer appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-3"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

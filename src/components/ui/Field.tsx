import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-12 w-full min-w-0 rounded border border-line-2 bg-transparent px-4 text-[15px] text-fg placeholder:text-fg-3 transition-[border-color,box-shadow] duration-150 bg-bg/40 hover:border-fg focus:border-accent focus:shadow-[inset_0_0_0_1px_var(--accent)] focus:outline-none aria-[invalid=true]:border-err disabled:opacity-40";

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
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="caps text-[11px] text-fg-2">
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
        <p id={hintId} className="text-[13px] leading-relaxed text-fg-3">
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
  return <textarea className={cn(inputClass, "h-auto min-h-24 resize-y py-3 leading-relaxed", className)} {...rest} />;
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

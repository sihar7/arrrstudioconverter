"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import Spinner from "./Spinner";

interface Props extends Omit<ComponentProps<"button">, "children"> {
  label: string;
  icon: ReactNode;
  loading?: boolean;
  bordered?: boolean;
  size?: "sm" | "md";
  active?: boolean;
}

/** Tombol ikon — label wajib (aria-label + tooltip native) */
export default function IconButton({ label, icon, loading, bordered, size = "md", active, className, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={cn(
        "state-layer inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-2 ios-press hover:text-fg disabled:pointer-events-none disabled:opacity-40",
        size === "md" ? "size-11" : "size-10",
        bordered && "border border-line-2",
        active && "bg-tonal text-on-tonal",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
    </button>
  );
}

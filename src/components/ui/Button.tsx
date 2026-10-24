"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import Spinner from "./Spinner";
import { buttonClass, type Size, type Variant } from "./buttonStyles";

export { buttonClass };

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export default function Button({
  variant = "ghost",
  size = "md",
  loading,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: Common & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

export function ButtonLink({
  variant = "ghost",
  size = "md",
  icon,
  iconRight,
  className,
  children,
  ...rest
}: Omit<Common, "loading"> & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

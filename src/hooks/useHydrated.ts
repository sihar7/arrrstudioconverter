"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * false selama SSR & hydration (termasuk boundary yang di-hydrate belakangan), true setelahnya.
 * Pakai untuk nilai yang hanya ada di klien (localStorage / sesi) agar tidak hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

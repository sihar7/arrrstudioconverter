"use client";

import { PLANS } from "@/lib/schemas/plans";
import { baseApi } from "@/store/api/baseApi";
import { useHydrated } from "@/hooks/useHydrated";

/** Kuota tamu bawaan (sama dengan GUEST_LIMIT default di server) */
const GUEST_DEFAULT = 3;

/**
 * Batas plan efektif: nilai bawaan (schemas/plans.ts) + pengaturan admin dari server (/api/plans).
 * Selama hydration selalu bawaan (sama dengan HTML server), lalu diganti nilai server.
 */
export function usePlans() {
  const hydrated = useHydrated();
  const { data } = baseApi.usePlansQuery();
  return hydrated && data ? data : { guest: GUEST_DEFAULT, plans: PLANS };
}

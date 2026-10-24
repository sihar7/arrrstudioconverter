"use client";

import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setKeyCheck, updateRoblox } from "@/store/slices/robloxSlice";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { checkApiKey } from "../_service/settings.service";

/** Cek API key ke Roblox; isi User ID otomatis kalau masih kosong */
export function useKeyCheck() {
  const dispatch = useAppDispatch();
  const roblox = useAppSelector((s) => s.roblox);
  const toast = useToast();
  const { t } = useT();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const r = await checkApiKey(roblox.apiKey.trim());
      dispatch(setKeyCheck(r));
      if (r.ownerId && !roblox.creatorId && roblox.creatorType === "user") dispatch(updateRoblox({ creatorId: r.ownerId }));
      if (r.ok) toast(t.toast.keyChecked, "ok");
    } catch (e) {
      dispatch(setKeyCheck(null));
      setError(e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e));
    } finally {
      setChecking(false);
    }
  }, [roblox.apiKey, roblox.creatorId, roblox.creatorType, dispatch, toast, t]);

  return { check, checking, error };
}

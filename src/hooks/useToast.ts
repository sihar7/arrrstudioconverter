"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/store/hooks";
import { pushToast, type ToastKind } from "@/store/slices/toastSlice";

export function useToast() {
  const dispatch = useAppDispatch();
  return useCallback((message: string, kind: ToastKind = "info") => dispatch(pushToast(message, kind)), [dispatch]);
}

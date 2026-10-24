import { apiFetch } from "@/lib/utils";
import type { KeyCheck } from "@/store/slices/robloxSlice";

export function checkApiKey(apiKey: string) {
  return apiFetch<KeyCheck>("/api/roblox/key", { method: "POST", json: { apiKey } });
}

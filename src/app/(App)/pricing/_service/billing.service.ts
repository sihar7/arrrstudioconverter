import { apiFetch } from "@/lib/utils";
import type { BillingMonths, PaidPlanId } from "@/lib/schemas/plans";
import type { UserPlan } from "@/type/auth";
import type { BillingInfo, Order, OrderDetail } from "@/type/billing";

// Langganan plan via QRIS → /api/billing/* (di-proxy ke BE)

export const getBilling = () =>
  apiFetch<{ info: BillingInfo; plan: UserPlan; orders: Order[] }>("/api/billing", { cache: "no-store" });

export const createOrder = (plan: PaidPlanId, months: BillingMonths) =>
  apiFetch<{ order: OrderDetail }>("/api/billing/orders", { method: "POST", json: { plan, months } });

export const getOrder = (id: string) => apiFetch<{ order: OrderDetail }>(`/api/billing/orders/${id}`, { cache: "no-store" });

export const orderAction = (id: string, action: "confirm" | "cancel") =>
  apiFetch<{ order: OrderDetail }>(`/api/billing/orders/${id}`, { method: "POST", json: { action } });

import { Suspense } from "react";
import type { Metadata } from "next";
import PageLoader from "@/components/shared/PageLoader";
import LoginScreen from "./_components/LoginScreen";

export const metadata: Metadata = { title: "Masuk" };

// useSearchParams di LoginScreen → wajib di dalam Suspense (Cache Components)
export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginScreen />
    </Suspense>
  );
}

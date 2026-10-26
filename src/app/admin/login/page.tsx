import type { Metadata } from "next";
import AdminLoginScreen from "./_components/AdminLoginScreen";

export const metadata: Metadata = { title: "Masuk" };

export default function AdminLoginPage() {
  return <AdminLoginScreen />;
}

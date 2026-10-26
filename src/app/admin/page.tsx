import type { Metadata } from "next";
import AdminScreen from "./_components/AdminScreen";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminPage() {
  return <AdminScreen />;
}

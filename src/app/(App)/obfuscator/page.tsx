import type { Metadata } from "next";
import ObfuscatorScreen from "./_components/ObfuscatorScreen";

export const metadata: Metadata = { title: "Obfuscator" };

export default function ObfuscatorPage() {
  return <ObfuscatorScreen />;
}

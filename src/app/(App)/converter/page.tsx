import type { Metadata } from "next";
import ConverterScreen from "./_components/ConverterScreen";

export const metadata: Metadata = { title: "Converter" };

export default function ConverterPage() {
  return <ConverterScreen />;
}

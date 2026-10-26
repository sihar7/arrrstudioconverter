"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

/** Area tarik-lepas + klik untuk memilih file. Bisa dipakai sebagai lapisan penuh atau kotak kecil. */
export default function DropZone({
  onFiles,
  multiple,
  className,
  label,
  children,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={onDrop}
      className={cn(
        "cursor-pointer outline-none transition-[background-color,border-color,scale] duration-200 ease-[var(--ease)] focus-visible:ring-2 focus-visible:ring-accent",
        over && "scale-[0.99] border-accent bg-accent/[0.08]",
        className,
      )}
      data-over={over || undefined}
    >
      {children}
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}

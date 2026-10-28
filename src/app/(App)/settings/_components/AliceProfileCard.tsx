"use client";

import { useRef, useState } from "react";
import { MediaImage, Trash } from "iconoir-react";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import AliceAvatar from "../../alice/_components/AliceAvatar";
import { alice, useAlice } from "../../alice/_lib/store";
import { toAvatar } from "../../alice/_lib/images";

/** Admin (app desktop): foto profil Alice — tampil di tiap balasan chat. Dipotong persegi 256px, hanya di perangkat ini. */
export default function AliceProfileCard() {
  const { t } = useT();
  const p = t.alice.profile;
  const avatar = useAlice((s) => s.avatar);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const url = await toAvatar(file);
    if (url) alice.setAvatar(url);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <CardBox className="rise">
      <CardHeader title={p.title} />
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <AliceAvatar size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-[13px] text-fg-2">{p.sub}</p>
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
            <Button size="sm" variant="primary" loading={busy} icon={<MediaImage />} onClick={() => input.current?.click()}>
              {avatar ? p.change : p.choose}
            </Button>
            {avatar && (
              <Button size="sm" variant="subtle" icon={<Trash />} onClick={() => alice.setAvatar(null)}>
                {p.remove}
              </Button>
            )}
          </div>
        </div>
      </div>
    </CardBox>
  );
}

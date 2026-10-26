"use client";

import { useT } from "@/hooks/useT";
import MemberGate from "@/components/shared/MemberGate";
import { SfEnlarge } from "@/components/icons/SfIcons";
import UpscaleScreen from "./UpscaleScreen";

export default function UpscaleGate() {
  const { t } = useT();
  const g = t.imgtools;
  return (
    <MemberGate eyebrow={g.eyebrow} title={t.upscale.title} sub={t.upscale.sub} loginTitle={g.loginTitle} loginSub={g.loginSub} next="/upscale" icon={<SfEnlarge size={26} />}>
      <UpscaleScreen />
    </MemberGate>
  );
}

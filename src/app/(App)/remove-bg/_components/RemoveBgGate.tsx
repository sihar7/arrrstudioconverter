"use client";

import { useT } from "@/hooks/useT";
import MemberGate from "@/components/shared/MemberGate";
import { SfCutout } from "@/components/icons/SfIcons";
import RemoveBgScreen from "./RemoveBgScreen";

export default function RemoveBgGate() {
  const { t } = useT();
  const g = t.imgtools;
  return (
    <MemberGate eyebrow={g.eyebrow} title={t.rmbg.title} sub={t.rmbg.sub} loginTitle={g.loginTitle} loginSub={g.loginSub} next="/remove-bg" icon={<SfCutout size={26} />}>
      <RemoveBgScreen />
    </MemberGate>
  );
}

"use client";

import { useT } from "@/hooks/useT";
import MemberGate from "@/components/shared/MemberGate";
import { SfSpoof } from "@/components/icons/SfIcons";
import SpoofScreen from "./SpoofScreen";

/** Spoof khusus member (login Discord) — riwayat spoof & file terikat ke akun */
export default function SpoofGate() {
  const { t } = useT();
  const S = t.spoof;
  return (
    <MemberGate eyebrow={S.eyebrow} title={S.title} sub={S.sub} loginTitle={S.loginTitle} loginSub={S.loginSub} next="/spoof" icon={<SfSpoof size={26} />}>
      <SpoofScreen />
    </MemberGate>
  );
}

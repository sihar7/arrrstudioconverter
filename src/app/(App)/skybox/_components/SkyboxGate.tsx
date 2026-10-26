"use client";

import { useT } from "@/hooks/useT";
import MemberGate from "@/components/shared/MemberGate";
import { SfCube } from "@/components/icons/SfIcons";
import SkyboxScreen from "./SkyboxScreen";

/** Skybox khusus member (login Discord). SkyboxScreen baru di-mount setelah login → canvas & WebGL dibuat sekali. */
export default function SkyboxGate() {
  const { t } = useT();
  const s = t.skybox;
  return (
    <MemberGate eyebrow={s.eyebrow} title={s.title} sub={s.sub} loginTitle={s.loginTitle} loginSub={s.loginSub} next="/skybox" icon={<SfCube size={26} />}>
      <SkyboxScreen />
    </MemberGate>
  );
}

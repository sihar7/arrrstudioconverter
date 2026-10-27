"use client";

import { useT } from "@/hooks/useT";
import MemberGate from "@/components/shared/MemberGate";
import { SfArrowUpDoc } from "@/components/icons/SfIcons";
import UploadScreen from "./UploadScreen";

/** Upload audio khusus member (login Discord) — upload Roblox & Riwayat terikat ke akun */
export default function UploadGate() {
  const { t } = useT();
  const U = t.fileUpload;
  return (
    <MemberGate eyebrow={U.eyebrow} title={U.title} sub={U.sub} loginTitle={U.loginTitle} loginSub={U.loginSub} next="/upload" icon={<SfArrowUpDoc size={26} />}>
      <UploadScreen />
    </MemberGate>
  );
}

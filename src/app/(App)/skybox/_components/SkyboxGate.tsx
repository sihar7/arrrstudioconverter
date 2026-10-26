"use client";

import { Discord } from "iconoir-react";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import CardBox from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import { buttonClass } from "@/components/ui/Button";
import { SfCube } from "@/components/icons/SfIcons";
import SkyboxScreen from "./SkyboxScreen";

/** Skybox khusus member (login Discord). SkyboxScreen baru di-mount setelah login → canvas & WebGL dibuat sekali. */
export default function SkyboxGate() {
  const { t } = useT();
  const s = t.skybox;
  const { data: me, isLoading } = useMeQuery();

  if (isLoading) return <PageLoader />;
  if (me?.user) return <SkyboxScreen />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={s.eyebrow} title={s.title} sub={s.sub} />
      <CardBox>
        <EmptyState
          icon={<SfCube size={26} />}
          title={s.loginTitle}
          sub={s.loginSub}
          action={
            <a href="/api/auth/discord?next=/skybox" className={buttonClass("primary")}>
              <Discord width={18} height={18} /> {t.login.discord}
            </a>
          }
        />
      </CardBox>
    </div>
  );
}

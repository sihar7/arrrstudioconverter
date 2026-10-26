"use client";

import type { ReactNode } from "react";
import { Discord } from "iconoir-react";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import PageHeader from "@/components/shared/PageHeader";
import PageLoader from "@/components/shared/PageLoader";
import CardBox from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import { buttonClass } from "@/components/ui/Button";

/**
 * Halaman khusus member (login Discord). Konten baru di-mount setelah login terkonfirmasi —
 * aman untuk layar yang membuat sumber daya berat sekali di awal (WebGL, model AI).
 */
export default function MemberGate({
  eyebrow,
  title,
  sub,
  loginTitle,
  loginSub,
  next,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  loginTitle: string;
  loginSub: string;
  next: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const { t } = useT();
  const { data: me, isLoading } = useMeQuery();

  if (isLoading) return <PageLoader />;
  if (me?.user) return <>{children}</>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={eyebrow} title={title} sub={sub} />
      <CardBox>
        <EmptyState
          icon={icon}
          title={loginTitle}
          sub={loginSub}
          action={
            <a href={`/api/auth/discord?next=${encodeURIComponent(next)}`} className={buttonClass("primary")}>
              <Discord width={18} height={18} /> {t.login.discord}
            </a>
          }
        />
      </CardBox>
    </div>
  );
}

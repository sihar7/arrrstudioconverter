"use client";

import { Discord } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateRoblox } from "@/store/slices/robloxSlice";
import { setLang, setTheme } from "@/store/slices/preferencesSlice";
import { useLogoutMutation, useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import { Avatar } from "@/components/shared/UserMenu";
import { switchTheme } from "@/components/shared/PrefToggles";
import Field, { Input } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Button, { buttonClass } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

export function DefaultsCard() {
  const dispatch = useAppDispatch();
  const r = useAppSelector((s) => s.roblox);
  const { t } = useT();
  return (
    <CardBox className="rise [animation-delay:60ms]">
      <CardHeader title={t.settings.defaultsTitle} />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <Field label={t.settings.defaultPermission}>
          {() => (
            <Segmented
              label={t.settings.defaultPermission}
              value={r.defaultPermission}
              options={[
                { value: "none", label: t.upload.permNone },
                { value: "place", label: t.upload.permPlace },
                { value: "public", label: t.upload.permPublic },
              ]}
              onChange={(defaultPermission) => dispatch(updateRoblox({ defaultPermission }))}
            />
          )}
        </Field>
        <Field label={t.upload.placeId} hint={t.upload.permPlaceHint}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              inputMode="numeric"
              className="font-mono"
              value={r.placeId}
              onChange={(e) => dispatch(updateRoblox({ placeId: e.target.value.replace(/\D/g, "") }))}
            />
          )}
        </Field>
      </div>
    </CardBox>
  );
}

export function AppearanceCard() {
  const dispatch = useAppDispatch();
  const { theme, lang } = useAppSelector((s) => s.preferences);
  const { t } = useT();
  return (
    <CardBox className="rise [animation-delay:120ms]">
      <CardHeader title={t.settings.appearance} />
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <Field label={t.settings.theme}>
          {() => (
            <Segmented
              label={t.settings.theme}
              value={theme}
              options={[
                { value: "dark", label: t.nav.dark },
                { value: "light", label: t.nav.light },
              ]}
              onChange={(v) => {
                switchTheme(v);
                dispatch(setTheme(v));
              }}
            />
          )}
        </Field>
        <Field label={t.settings.language}>
          {() => (
            <Segmented
              label={t.settings.language}
              value={lang}
              options={[
                { value: "id", label: "Indonesia" },
                { value: "en", label: "English" },
              ]}
              onChange={(v) => dispatch(setLang(v))}
            />
          )}
        </Field>
      </div>
    </CardBox>
  );
}

export function AccountCard() {
  const { data, isLoading } = useMeQuery();
  const [logout, { isLoading: leaving }] = useLogoutMutation();
  const router = useRouter();
  const { t } = useT();
  const u = data?.user;
  return (
    <CardBox className="rise [animation-delay:180ms]">
      <CardHeader title={t.settings.account} />
      <div className="p-5 sm:p-6">
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : u ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar src={u.avatarUrl} name={u.displayName} size={44} />
              <div className="min-w-0">
                <p className="text-[12px] uppercase tracking-[0.14em] text-fg-3">{t.settings.loggedAs}</p>
                <p className="truncate text-[15px] font-semibold">
                  {u.displayName} <span className="font-normal text-fg-3">@{u.username}</span>
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              loading={leaving}
              onClick={async () => {
                await logout();
                router.push("/");
              }}
            >
              {t.nav.logout}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <p className="text-[14px] leading-relaxed text-fg-2">{t.settings.guestAccount}</p>
            <a href="/api/auth/discord?next=/settings" className={buttonClass("primary")}>
              <Discord width={18} height={18} /> {t.login.discord}
            </a>
          </div>
        )}
      </div>
    </CardBox>
  );
}

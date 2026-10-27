"use client";

import { useState } from "react";
import { Check, Eye, EyeClosed, OpenNewWindow, WarningTriangle } from "iconoir-react";
import Url from "@/Url/Url";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateRoblox } from "@/store/slices/robloxSlice";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Field, { Input } from "@/components/ui/Field";
import Switch from "@/components/ui/Switch";
import Segmented from "@/components/ui/Segmented";
import Badge from "@/components/ui/Badge";
import { useKeyCheck } from "../_hooks/useKeyCheck";
import RobloxProfileCard from "./RobloxProfileCard";

export default function RobloxCard() {
  const dispatch = useAppDispatch();
  const r = useAppSelector((s) => s.roblox);
  const { data: me } = useMeQuery();
  const { t, f } = useT();
  const s = t.settings;
  const [show, setShow] = useState(false);
  const kc = useKeyCheck();
  const res = r.keyCheck;

  return (
    <CardBox className="rise">
      <CardHeader title={s.robloxTitle} />
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <RobloxProfileCard />
        <p className="text-[14px] leading-relaxed text-fg-2">{s.robloxSub}</p>

        <Field label={s.apiKey} error={kc.error}>
          {({ id, describedBy, invalid }) => (
            <div className="flex gap-2">
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                type={show ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder={s.apiKeyPlaceholder}
                value={r.apiKey}
                onChange={(e) => dispatch(updateRoblox({ apiKey: e.target.value.trim() }))}
                className="font-mono text-[13px]"
              />
              <IconButton
                label={show ? t.common.hide : t.common.show}
                bordered
                icon={show ? <EyeClosed width={18} height={18} /> : <Eye width={18} height={18} />}
                onClick={() => setShow((v) => !v)}
                className="size-11"
              />
            </div>
          )}
        </Field>

        <Switch label={s.remember} hint={s.rememberHint} checked={r.remember} onChange={(remember) => dispatch(updateRoblox({ remember }))} />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" loading={kc.checking} disabled={r.apiKey.length < 20 || !me?.user} onClick={kc.check}>
            {kc.checking ? s.checking : s.check}
          </Button>
          {!me?.user && <span className="text-[13px] text-fg-3">{t.converter.loginToUpload}</span>}
        </div>

        {res && (
          <div className="rise flex flex-col gap-3 border-l-2 bg-bg py-4 pl-4 pr-4" style={{ borderColor: res.ok ? "var(--ok)" : "var(--warn)" }}>
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              {res.ok ? <Check width={16} height={16} className="text-ok" /> : <WarningTriangle width={16} height={16} className="text-warn" />}
              {res.ok ? s.keyOk : s.keyBad}
              {res.name && <span className="font-normal text-fg-3">· {res.name}</span>}
            </p>
            {res.ownerId && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-fg-2">
                {s.owner}: <span className="font-mono text-fg">{res.ownerId}</span>
                {r.creatorId !== res.ownerId && (
                  <button
                    type="button"
                    onClick={() => dispatch(updateRoblox({ creatorType: "user", creatorId: res.ownerId! }))}
                    className="cursor-pointer text-[12.5px] font-semibold text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg"
                  >
                    {s.useOwner}
                  </button>
                )}
              </div>
            )}
            {res.scopes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {res.scopes.map((sc) => (
                  <Badge key={sc}>{sc}</Badge>
                ))}
              </div>
            )}
            {res.missing.length > 0 && <p className="text-[13px] text-err">{f(s.missing, { list: res.missing.join(", ") })}</p>}
            {res.missingOptional.length > 0 && <p className="text-[13px] text-warn">{f(s.missingOptional, { list: res.missingOptional.join(", ") })}</p>}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Field label={t.upload.creator}>
            {() => (
              <Segmented
                label={t.upload.creator}
                value={r.creatorType}
                options={[
                  { value: "user", label: t.upload.user },
                  { value: "group", label: t.upload.group },
                ]}
                onChange={(creatorType) => dispatch(updateRoblox({ creatorType }))}
              />
            )}
          </Field>
          <Field label={f(t.upload.creatorId, { type: r.creatorType === "user" ? t.upload.user : t.upload.group })}>
            {({ id }) => (
              <Input
                id={id}
                inputMode="numeric"
                className="font-mono"
                value={r.creatorId}
                onChange={(e) => dispatch(updateRoblox({ creatorId: e.target.value.replace(/\D/g, "") }))}
              />
            )}
          </Field>
        </div>

        <Switch label={t.upload.cover} hint={t.upload.coverHint} checked={r.uploadCover} onChange={(uploadCover) => dispatch(updateRoblox({ uploadCover }))} />

        <details className="group border-t border-line pt-5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold">
            {s.howTo}
            <span className="font-mono text-fg-3 transition-transform group-open:rotate-45">+</span>
          </summary>
          <ol className="mt-4 flex flex-col gap-3">
            {s.howToSteps.map((step, i) => (
              <li key={step} className="grid grid-cols-[28px_1fr] gap-2 text-[14px] leading-relaxed text-fg-2">
                <span className="font-display text-[18px] font-extrabold leading-6 text-accent">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
          <a
            href={Url.robloxCreatorDashboard}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg"
          >
            {s.openDashboard} <OpenNewWindow width={14} height={14} />
          </a>
        </details>
      </div>
    </CardBox>
  );
}

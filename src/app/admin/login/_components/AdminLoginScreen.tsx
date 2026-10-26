"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeClosed, Lock, NavArrowLeft, WarningTriangle } from "iconoir-react";
import { LogoMark } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/PrefToggles";
import Button from "@/components/ui/Button";
import Field, { Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/utils";
import { adminLogin, adminMe } from "../../_service/admin.service";
import { errorText } from "../../_hooks/useAdmin";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Hitung mundur saat kena throttle (429 + retryAfter)
  const [wait, setWait] = useState(0);
  const userRef = useRef<HTMLInputElement>(null);

  // Sudah masuk → langsung ke dashboard
  useEffect(() => {
    let alive = true;
    adminMe()
      .then(() => alive && router.replace("/admin"))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || wait > 0) return;
    if (!username.trim() || !password) {
      setError("Isi username dan password.");
      userRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminLogin(username.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setPassword("");
      setError(errorText(err));
      if (err instanceof ApiError && err.status === 429) setWait(Number(err.data.retryAfter) || 60);
      setBusy(false);
    }
  };

  const mm = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="caps inline-flex min-h-11 items-center gap-1.5 text-fg-2 hover:text-fg">
          <NavArrowLeft width={14} height={14} aria-hidden="true" /> Situs
        </Link>
        <ThemeToggle />
      </div>

      <main id="main" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
        <div className="flex items-center gap-3">
          <LogoMark size={40} priority />
          <span className="caps inline-flex h-6 items-center gap-1.5 rounded-xs bg-accent/12 px-2 text-[10.5px] text-fg">
            <Lock width={12} height={12} aria-hidden="true" /> Admin
          </span>
        </div>
        <h1 className="mt-8 font-display text-[36px] font-bold leading-none tracking-[-0.035em]">Panel admin</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-2">Akses terbatas. Semua percobaan masuk dicatat.</p>

        <form onSubmit={submit} noValidate className="mt-9 flex flex-col gap-5">
          {error && (
            <div role="alert" className="rise flex gap-3 border-l-2 border-err bg-surface py-3 pl-4 pr-3 text-[14px] text-fg-2">
              <WarningTriangle width={18} height={18} className="mt-0.5 shrink-0 text-err" aria-hidden="true" />
              <p>
                {error}
                {wait > 0 && <span className="mt-1 block font-mono text-[13px] tabular-nums text-fg-3">Coba lagi dalam {mm}</span>}
              </p>
            </div>
          )}

          <Field label="Username">
            {({ id, describedBy }) => (
              <Input
                ref={userRef}
                id={id}
                aria-describedby={describedBy}
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
                maxLength={64}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}
          </Field>

          <Field label="Password">
            {({ id, describedBy }) => (
              <div className="relative">
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  className="pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={show}
                  className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-fg-3 transition-colors hover:text-fg"
                >
                  {show ? <EyeClosed width={18} height={18} aria-hidden="true" /> : <Eye width={18} height={18} aria-hidden="true" />}
                </button>
              </div>
            )}
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            disabled={wait > 0}
            className="mt-2 w-full justify-between"
            iconRight={<ArrowRight width={18} height={18} aria-hidden="true" />}
          >
            {wait > 0 ? `Tunggu ${mm}` : "Masuk"}
          </Button>
        </form>
      </main>

      <p className="text-center text-[12.5px] text-fg-3">© 2026 ARRR Studio</p>
    </div>
  );
}

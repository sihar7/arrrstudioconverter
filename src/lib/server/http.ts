import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

// Error yang pesannya aman ditampilkan ke user
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BAD_REQUEST",
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export function fail(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, code: err.code, ...err.extra }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      { error: `Input tidak valid: ${first?.path.join(".") || "body"} — ${first?.message}`, code: "VALIDATION" },
      { status: 422 },
    );
  }
  console.error("[api]", err);
  return NextResponse.json({ error: "Terjadi kesalahan di server", code: "INTERNAL" }, { status: 500 });
}

/** Bungkus route handler: semua error → JSON {error, code} */
export function handle<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return fail(e);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("Body harus JSON", 400);
  }
}

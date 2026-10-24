import "server-only";
import { spawn } from "node:child_process";
import { AppError } from "../http";

// Jalankan binary (yt-dlp / ffmpeg) TANPA shell — argumen tidak pernah diinterpretasi shell

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface RunOptions {
  timeoutMs: number;
  label: string;
  onLine?: (line: string) => void;
  signal?: AbortSignal;
}

const MAX_BUFFER = 8 * 1024 * 1024;

export function run(bin: string, args: string[], opts: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";
    let pending = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new AppError(`Timeout — ${opts.label} terlalu lama`, 504, "TIMEOUT")));
    }, opts.timeoutMs);

    const onAbort = () => {
      child.kill("SIGKILL");
      finish(() => reject(new AppError("Dibatalkan", 499, "ABORTED")));
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      if (stdout.length < MAX_BUFFER) stdout += chunk;
      if (!opts.onLine) return;
      pending += chunk;
      const lines = pending.split(/\r?\n|\r/);
      pending = lines.pop() ?? "";
      for (const line of lines) if (line) opts.onLine(line);
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < MAX_BUFFER) stderr += chunk;
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      finish(() =>
        reject(
          err.code === "ENOENT"
            ? new AppError(`${opts.label} belum terpasang di server`, 500, "MISSING_BINARY")
            : err,
        ),
      );
    });
    child.on("close", (code) => {
      if (opts.onLine && pending) opts.onLine(pending);
      finish(() => resolve({ code: code ?? -1, stdout, stderr }));
    });
  });
}

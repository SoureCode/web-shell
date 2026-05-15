import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STATE_DIR =
  process.env.WEB_SHELL_STATE_DIR ?? join(homedir(), ".cache", "web-shell", "sessions");

export function ensureStateDir(): string {
  mkdirSync(STATE_DIR, { recursive: true });
  return STATE_DIR;
}

export function socketPath(id: string): string {
  return join(ensureStateDir(), `${id}.sock`);
}

export function metaPath(id: string): string {
  return join(ensureStateDir(), `${id}.json`);
}

export function logPath(id: string): string {
  return join(ensureStateDir(), `${id}.log`);
}

export function pidPath(id: string): string {
  return join(ensureStateDir(), `${id}.pid`);
}

export interface SessionMeta {
  readonly id: string;
  readonly title: string;
  readonly shell: string;
  readonly cwd: string;
  readonly createdAt: number;
  readonly order?: number;
}

export function writeMeta(meta: SessionMeta): void {
  try {
    writeFileSync(metaPath(meta.id), JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export function readMeta(id: string): SessionMeta | null {
  try {
    return JSON.parse(readFileSync(metaPath(id), "utf8")) as SessionMeta;
  } catch {
    return null;
  }
}

function isSocket(p: string): boolean {
  try {
    return statSync(p).isSocket();
  } catch {
    return false;
  }
}

export function listSessionIds(): string[] {
  ensureStateDir();
  try {
    return readdirSync(STATE_DIR)
      .filter((f) => f.endsWith(".sock"))
      .map((f) => f.slice(0, -".sock".length))
      .filter((id) => isSocket(socketPath(id)));
  } catch {
    return [];
  }
}

export function readLogTail(id: string, maxBytes: number): string {
  const p = logPath(id);
  try {
    const size = statSync(p).size;
    const start = Math.max(0, size - maxBytes);
    const len = size - start;
    const fd = openSync(p, "r");
    try {
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, start);
      return buf.toString("utf8");
    } finally {
      closeSync(fd);
    }
  } catch {
    return "";
  }
}

export function writeLog(id: string, snapshot: string): void {
  try {
    writeFileSync(logPath(id), snapshot);
  } catch {
    // ignore
  }
}

export function appendLog(id: string, chunk: string, maxBytes: number): void {
  const p = logPath(id);
  try {
    const size = existsSync(p) ? statSync(p).size : 0;
    if (size + chunk.length > maxBytes * 2) {
      const tail = readLogTail(id, maxBytes);
      writeFileSync(p, tail + chunk);
    } else {
      appendFileSync(p, chunk);
    }
  } catch {
    // ignore
  }
}

export function sessionExists(id: string): boolean {
  return existsSync(socketPath(id)) && isSocket(socketPath(id));
}

export function readPid(id: string): number | null {
  try {
    const n = Number(readFileSync(pidPath(id), "utf8").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function cleanupFiles(id: string): void {
  for (const p of [socketPath(id), metaPath(id), logPath(id), pidPath(id)]) {
    try {
      unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

export function killShell(id: string): void {
  const pid = readPid(id);
  if (pid) {
    try {
      process.kill(pid, "SIGHUP");
    } catch {
      // already gone
    }
  }
}

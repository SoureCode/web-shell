import { spawn, type IPty } from "node-pty";
import { randomUUID } from "node:crypto";
import { SCROLLBACK_BYTES } from "../config.js";
import type { SessionInfo } from "../types/session.js";
import { sanitizeForReplay } from "./replay.js";
import { Scrollback } from "./scrollback.js";
import * as dtach from "./dtach.js";

export type OutputListener = (chunk: string) => void;
export type ExitListener = (code: number, signal?: number) => void;

export interface SessionOptions {
  readonly id?: string;
  readonly createdAt?: number;
  readonly title: string;
  readonly shell: string;
  readonly cwd: string;
  readonly cols: number;
  readonly rows: number;
  readonly reattach?: boolean;
}

export class Session {
  readonly id: string;
  readonly createdAt: number;
  readonly shell: string;

  private _title: string;
  private _cols: number;
  private _rows: number;
  private readonly pty: IPty;
  private readonly scrollback = new Scrollback(SCROLLBACK_BYTES);
  private readonly outputListeners = new Set<OutputListener>();
  private readonly exitListeners = new Set<ExitListener>();

  constructor(opts: SessionOptions) {
    this.id = opts.id ?? randomUUID();
    this.createdAt = opts.createdAt ?? Date.now();
    this._title = opts.title;
    this.shell = opts.shell;
    this._cols = opts.cols;
    this._rows = opts.rows;

    const sock = dtach.socketPath(this.id);
    const pidFile = dtach.pidPath(this.id);
    const alreadyRunning = Boolean(opts.reattach) && dtach.sessionExists(this.id);

    if (alreadyRunning) {
      this.scrollback.append(dtach.readLogTail(this.id, SCROLLBACK_BYTES));
    }

    const args = alreadyRunning
      ? ["-a", sock, "-r", "none", "-E"]
      : ["-A", sock, "-r", "none", "-E", "sh", "-c", `echo $$ > ${JSON.stringify(pidFile)}; exec ${JSON.stringify(opts.shell)}`];

    this.pty = spawn("dtach", args, {
      name: "xterm-256color",
      cols: opts.cols,
      rows: opts.rows,
      cwd: opts.cwd,
      env: process.env as Record<string, string>,
    });

    this.pty.onData((data) => {
      const sanitized = data.replace(/\x1b\[\?2004[hl]/g, "");
      this.scrollback.append(sanitized);
      dtach.appendLog(this.id, sanitized, SCROLLBACK_BYTES);
      for (const listener of this.outputListeners) listener(sanitized);
    });

    this.pty.onExit(({ exitCode, signal }) => {
      for (const listener of this.exitListeners) listener(exitCode, signal);
    });

    dtach.writeMeta({
      id: this.id,
      title: this._title,
      shell: this.shell,
      createdAt: this.createdAt,
    });
  }

  get title(): string {
    return this._title;
  }

  setTitle(title: string): void {
    this._title = title;
    dtach.writeMeta({
      id: this.id,
      title,
      shell: this.shell,
      createdAt: this.createdAt,
    });
  }

  get cols(): number {
    return this._cols;
  }

  get rows(): number {
    return this._rows;
  }

  write(data: string): void {
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    this._cols = cols;
    this._rows = rows;
    try {
      this.pty.resize(cols, rows);
    } catch {
      // pty already exited
    }
  }

  history(): string {
    return sanitizeForReplay(this.scrollback.snapshot());
  }

  subscribe(onData: OutputListener, onExit: ExitListener): () => void {
    this.outputListeners.add(onData);
    this.exitListeners.add(onExit);
    return () => {
      this.outputListeners.delete(onData);
      this.exitListeners.delete(onExit);
    };
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  kill(): void {
    dtach.killShell(this.id);
    try {
      this.pty.kill();
    } catch {
      // already dead
    }
    dtach.cleanupFiles(this.id);
  }

  detach(): void {
    try {
      this.pty.kill();
    } catch {
      // already dead
    }
  }

  info(): SessionInfo {
    return {
      id: this.id,
      title: this._title,
      shell: this.shell,
      cols: this._cols,
      rows: this._rows,
      createdAt: this.createdAt,
    };
  }
}

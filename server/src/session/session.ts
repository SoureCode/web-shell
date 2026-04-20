import { spawn, type IPty } from "node-pty";
import { randomUUID } from "node:crypto";
import { SCROLLBACK_BYTES } from "../config.js";
import type { SessionInfo } from "../types/session.js";
import { Scrollback } from "./scrollback.js";

export type OutputListener = (chunk: string) => void;
export type ExitListener = (code: number, signal?: number) => void;

export interface SessionOptions {
  readonly title: string;
  readonly shell: string;
  readonly cwd: string;
  readonly cols: number;
  readonly rows: number;
}

export class Session {
  readonly id: string = randomUUID();
  readonly createdAt: number = Date.now();
  readonly title: string;
  readonly shell: string;

  private _cols: number;
  private _rows: number;
  private readonly pty: IPty;
  private readonly scrollback = new Scrollback(SCROLLBACK_BYTES);
  private readonly outputListeners = new Set<OutputListener>();
  private readonly exitListeners = new Set<ExitListener>();

  constructor(opts: SessionOptions) {
    this.title = opts.title;
    this.shell = opts.shell;
    this._cols = opts.cols;
    this._rows = opts.rows;

    this.pty = spawn(opts.shell, [], {
      name: "xterm-256color",
      cols: opts.cols,
      rows: opts.rows,
      cwd: opts.cwd,
      env: process.env as Record<string, string>,
    });

    this.pty.onData((data) => {
      this.scrollback.append(data);
      for (const listener of this.outputListeners) listener(data);
    });

    this.pty.onExit(({ exitCode, signal }) => {
      for (const listener of this.exitListeners) listener(exitCode, signal);
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
    return this.scrollback.snapshot();
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
    try {
      this.pty.kill();
    } catch {
      // already dead
    }
  }

  info(): SessionInfo {
    return {
      id: this.id,
      title: this.title,
      shell: this.shell,
      cols: this._cols,
      rows: this._rows,
      createdAt: this.createdAt,
    };
  }
}

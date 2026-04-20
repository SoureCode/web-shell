import { spawn, type IPty } from "node-pty";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCROLLBACK_BYTES } from "../config.js";
import type { SessionInfo } from "../types/session.js";
import { sanitizeForReplay } from "./replay.js";
import { Scrollback } from "./scrollback.js";
import * as tmux from "./tmux.js";

const TMUX_CONF = resolve(dirname(fileURLToPath(import.meta.url)), "../../tmux.conf");

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
  readonly initialHistory?: string;
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
  private readonly tmuxName: string;

  constructor(opts: SessionOptions) {
    this.id = opts.id ?? randomUUID();
    this.createdAt = opts.createdAt ?? Date.now();
    this._title = opts.title;
    this.shell = opts.shell;
    this._cols = opts.cols;
    this._rows = opts.rows;
    this.tmuxName = tmux.sessionName(this.id);

    if (opts.initialHistory) this.scrollback.append(opts.initialHistory);

    this.pty = spawn(
      "tmux",
      [
        "-f",
        TMUX_CONF,
        "new-session",
        "-A",
        "-s",
        this.tmuxName,
        "-x",
        String(opts.cols),
        "-y",
        String(opts.rows),
        opts.shell,
      ],
      {
        name: "xterm-256color",
        cols: opts.cols,
        rows: opts.rows,
        cwd: opts.cwd,
        env: process.env as Record<string, string>,
      },
    );

    this.pty.onData((data) => {
      this.scrollback.append(data);
      for (const listener of this.outputListeners) listener(data);
    });

    this.pty.onExit(({ exitCode, signal }) => {
      for (const listener of this.exitListeners) listener(exitCode, signal);
    });

    void this.configureTmux();
  }

  private async configureTmux(): Promise<void> {
    await tmux.sourceFile(TMUX_CONF);
    await tmux.setTitle(this.tmuxName, this._title);
  }

  get title(): string {
    return this._title;
  }

  setTitle(title: string): void {
    this._title = title;
    void tmux.setTitle(this.tmuxName, title);
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
    try {
      this.pty.kill();
    } catch {
      // already dead
    }
    void tmux.kill(this.tmuxName);
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

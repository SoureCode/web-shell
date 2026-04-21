import { DEFAULT_COLS, DEFAULT_ROWS } from "../config.js";
import type { CreateSessionRequest, SessionInfo } from "../types/session.js";
import { log } from "../utils/log.js";
import { defaultCwd, defaultShell } from "../utils/shell.js";
import * as dtach from "./dtach.js";
import { Session } from "./session.js";

export class SessionManager {
  private readonly sessions = new Map<string, Session>();

  async rehydrate(): Promise<void> {
    const ids = dtach.listSessionIds();
    for (const id of ids) {
      const meta = dtach.readMeta(id);
      if (!meta) continue;
      const session = new Session({
        id: meta.id,
        createdAt: meta.createdAt,
        title: meta.title,
        shell: meta.shell,
        cwd: defaultCwd(),
        cols: DEFAULT_COLS,
        rows: DEFAULT_ROWS,
        reattach: true,
      });
      this.sessions.set(session.id, session);
      log("session", "rehydrate", session.id, session.title);
      session.onExit((code, signal) => {
        log("session", "removed after exit", session.id, "code=", code, "signal=", signal);
        this.sessions.delete(session.id);
      });
    }
  }

  create(req: CreateSessionRequest): Session {
    const session = new Session({
      title: req.title ?? `shell-${this.sessions.size + 1}`,
      shell: req.shell ?? defaultShell(),
      cwd: req.cwd ?? defaultCwd(),
      cols: req.cols ?? DEFAULT_COLS,
      rows: req.rows ?? DEFAULT_ROWS,
    });

    this.sessions.set(session.id, session);
    log("session", "create", session.id, session.shell, `${session.cols}x${session.rows}`);
    session.onExit((code, signal) => {
      log("session", "removed after exit", session.id, "code=", code, "signal=", signal);
      this.sessions.delete(session.id);
    });
    return session;
  }

  get(id: string): Session | undefined {
    const s = this.sessions.get(id);
    log("session", "get", id, s ? "hit" : "miss");
    return s;
  }

  list(): SessionInfo[] {
    const infos = [...this.sessions.values()].map((s) => s.info());
    log("session", "list", infos.length);
    return infos;
  }

  detachAll(): void {
    for (const session of this.sessions.values()) {
      session.detach();
    }
    this.sessions.clear();
  }

  destroy(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      log("session", "destroy miss", id);
      return false;
    }
    log("session", "destroy", id);
    session.kill();
    this.sessions.delete(id);
    return true;
  }
}

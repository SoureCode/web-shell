import { DEFAULT_COLS, DEFAULT_ROWS } from "../config.js";
import type { CreateSessionRequest, SessionInfo } from "../types/session.js";
import { defaultCwd, defaultShell } from "../utils/shell.js";
import { Session } from "./session.js";

export class SessionManager {
  private readonly sessions = new Map<string, Session>();

  create(req: CreateSessionRequest): Session {
    const session = new Session({
      title: req.title ?? `shell-${this.sessions.size + 1}`,
      shell: req.shell ?? defaultShell(),
      cwd: req.cwd ?? defaultCwd(),
      cols: req.cols ?? DEFAULT_COLS,
      rows: req.rows ?? DEFAULT_ROWS,
    });

    this.sessions.set(session.id, session);
    session.onExit(() => {
      this.sessions.delete(session.id);
    });
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  list(): SessionInfo[] {
    return [...this.sessions.values()].map((s) => s.info());
  }

  destroy(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.kill();
    this.sessions.delete(id);
    return true;
  }
}

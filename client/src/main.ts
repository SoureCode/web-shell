import "./styles/main.scss";
import "@xterm/xterm/css/xterm.css";

import { createSession, destroySession, listSessions } from "./api/sessions.js";
import {
  clearActiveSessionId,
  getActiveSessionId,
  setActiveSessionId,
} from "./state/active-session.js";
import { attachTerminal } from "./terminal/attach.js";
import type { SessionInfo } from "./types/session.js";
import type { AttachedTerminal } from "./types/terminal.js";
import { renderSessionList } from "./ui/sidebar.js";
import { createStatusBar } from "./ui/status.js";
import { requireElement } from "./utils/dom.js";

const sessionListEl = requireElement<HTMLUListElement>("session-list");
const newBtn = requireElement<HTMLButtonElement>("new-session");
const termEl = requireElement<HTMLDivElement>("terminal");
const statusEl = requireElement<HTMLDivElement>("status");

const setStatus = createStatusBar(statusEl);

let active: AttachedTerminal | null = null;

async function refresh(): Promise<SessionInfo[]> {
  const sessions = await listSessions();
  renderSessionList(sessionListEl, sessions, active?.sessionId ?? null, {
    onSelect: (id) => void attach(id),
    onDestroy: (id) => void destroy(id),
  });
  return sessions;
}

async function attach(id: string): Promise<void> {
  if (active?.sessionId === id) return;
  active?.dispose();
  active = attachTerminal(termEl, id, setStatus);
  setActiveSessionId(id);
  await refresh();
}

async function destroy(id: string): Promise<void> {
  await destroySession(id);
  if (active?.sessionId === id) {
    active.dispose();
    active = null;
    termEl.innerHTML = "";
    clearActiveSessionId();
    setStatus("no session");
  }
  await refresh();
}

async function createAndAttach(): Promise<void> {
  const info = await createSession();
  await attach(info.id);
}

newBtn.addEventListener("click", () => void createAndAttach());

async function bootstrap(): Promise<void> {
  const sessions = await refresh();
  const saved = getActiveSessionId();
  const target = sessions.find((s) => s.id === saved) ?? sessions[0];
  if (target) await attach(target.id);
  else setStatus("no session — press + new");
}

void bootstrap();

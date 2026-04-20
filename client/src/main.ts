import "./styles/main.scss";
import "@xterm/xterm/css/xterm.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { UnauthorizedError, createSession, destroySession, listSessions, renameSession } from "./api/sessions.js";
import { log } from "./utils/log.js";
import {
  clearActiveSessionId,
  getActiveSessionId,
  setActiveSessionId,
} from "./state/active-session.js";
import { attachTerminal } from "./terminal/attach.js";
import type { SessionInfo } from "./types/session.js";
import type { AttachedTerminal } from "./types/terminal.js";
import { promptForToken } from "./ui/auth-prompt.js";
import { mountDrawer } from "./ui/drawer.js";
import { renderSessionList } from "./ui/sidebar.js";
import { createStatusBar } from "./ui/status.js";
import { mountVirtualKeyboard } from "./ui/virtual-keyboard.js";
import { requireElement } from "./utils/dom.js";

const appEl = requireElement<HTMLDivElement>("app");
const sessionListEl = requireElement<HTMLUListElement>("session-list");
const newBtn = requireElement<HTMLButtonElement>("new-session");
const termEl = requireElement<HTMLDivElement>("terminal");
const statusEl = requireElement<HTMLDivElement>("status");
const menuToggle = requireElement<HTMLButtonElement>("menu-toggle");
const backdrop = requireElement<HTMLDivElement>("backdrop");
const pinBtn = requireElement<HTMLButtonElement>("pin-sidebar");
const kbEl = requireElement<HTMLElement>("keyboard");
const kbToggle = requireElement<HTMLButtonElement>("kb-toggle");

const drawer = mountDrawer({ root: appEl, toggleBtn: menuToggle, backdrop, pinBtn });
const keyboard = mountVirtualKeyboard(kbEl, kbToggle);
const setStatus = createStatusBar(statusEl);

let active: AttachedTerminal | null = null;

async function refresh(): Promise<SessionInfo[]> {
  const sessions = await listSessions();
  renderSessionList(sessionListEl, sessions, active?.sessionId ?? null, {
    onSelect: (id) => {
      drawer.closeIfMobile();
      void attach(id);
    },
    onRename: async (id, title) => {
      await renameSession(id, title);
      await refresh();
    },
    onDestroy: (id) => void destroy(id),
  });
  return sessions;
}

async function attach(id: string): Promise<void> {
  log("main", "attach request", id, "current=", active?.sessionId);
  if (active?.sessionId === id) {
    log("main", "attach skip (already active)", id);
    return;
  }
  if (active) {
    log("main", "disposing previous", active.sessionId);
    active.dispose();
  }
  active = attachTerminal(termEl, id, setStatus);
  keyboard.setSend((data) => active?.sendInput(data));
  setActiveSessionId(id);
  await refresh();
}

async function destroy(id: string): Promise<void> {
  await destroySession(id);
  if (active?.sessionId === id) {
    active.dispose();
    active = null;
    keyboard.setSend(null);
    termEl.innerHTML = "";
    clearActiveSessionId();
    setStatus("no session");
  }
  await refresh();
}

async function createAndAttach(): Promise<void> {
  const info = await createSession();
  drawer.closeIfMobile();
  await attach(info.id);
}

newBtn.addEventListener("click", () => void createAndAttach());

async function withAuthRetry<T>(op: () => Promise<T>): Promise<T> {
  for (;;) {
    try {
      return await op();
    } catch (err: unknown) {
      if (!(err instanceof UnauthorizedError)) throw err;
      setStatus("authentication required");
      if (!promptForToken("web-shell auth token")) throw err;
    }
  }
}

async function bootstrap(): Promise<void> {
  const sessions = await withAuthRetry(refresh);
  const saved = getActiveSessionId();
  const target = sessions.find((s) => s.id === saved) ?? sessions[0];
  if (target) await attach(target.id);
  else setStatus("no session — press + new");
}

void bootstrap();

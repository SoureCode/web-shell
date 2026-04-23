import type { SessionInfo } from "../types/session.js";
import { getAuthToken } from "../state/auth-token.js";
import { log } from "../utils/log.js";
import { wsUrl } from "../utils/url.js";

function buildUrl(path: string): string {
  const token = getAuthToken();
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${wsUrl(path)}${qs}`;
}

export function openSessionSocket(id: string): WebSocket {
  const url = buildUrl(`api/sessions/${id}/stream`);
  log("socket", "open", id, url);
  return new WebSocket(url);
}

export function subscribeSessionList(onUpdate: (sessions: SessionInfo[]) => void): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retryMs = 500;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRetryTimer = (): void => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const connect = (): void => {
    if (closed) return;
    clearRetryTimer();
    const url = buildUrl("api/sessions/events");
    log("socket", "open events", url);
    const ws = new WebSocket(url);
    socket = ws;
    ws.addEventListener("open", () => {
      retryMs = 500;
    });
    ws.addEventListener("message", (ev: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(ev.data) as { type: string; data?: unknown };
        if (msg.type === "sessions" && Array.isArray(msg.data)) {
          onUpdate(msg.data as SessionInfo[]);
        }
      } catch {
        // ignore malformed frames
      }
    });
    ws.addEventListener("close", () => {
      if (socket === ws) socket = null;
      if (closed) return;
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 10_000);
    });
  };

  const forceReconnect = (): void => {
    if (closed) return;
    if (socket && socket.readyState === WebSocket.OPEN) return;
    if (socket && socket.readyState === WebSocket.CONNECTING) return;
    log("socket", "events force reconnect");
    retryMs = 500;
    connect();
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState !== "visible") return;
    forceReconnect();
  };
  const onOnline = (): void => forceReconnect();

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("online", onOnline);

  connect();

  return () => {
    closed = true;
    clearRetryTimer();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("online", onOnline);
    socket?.close();
  };
}

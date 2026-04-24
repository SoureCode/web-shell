import { openSessionSocket } from "../api/socket.js";
import type { ClientMessage } from "../types/protocol.js";
import type { AttachedTerminal, Status, StatusListener } from "../types/terminal.js";
import { log } from "../utils/log.js";
import { createTerminal } from "./factory.js";
import { parseServerMessage } from "./protocol.js";
import { observeResize } from "./resize.js";
import { mountSearch } from "./search.js";

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 30;
const MAX_QUEUED_INPUT_BYTES = 64 * 1024;

export function attachTerminal(
  container: HTMLElement,
  sessionId: string,
  onStatus: StatusListener,
): AttachedTerminal {
  const { term, fit, search } = createTerminal(container);

  let socket: WebSocket | null = null;
  let disposed = false;
  let exited = false;
  let everConnected = false;
  let attempt = 0;
  let backoffMs = INITIAL_BACKOFF_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let inputQueue: string[] = [];
  let queuedBytes = 0;

  const setStatus = (status: Status): void => onStatus(status);

  const queueInput = (data: string): void => {
    if (queuedBytes + data.length > MAX_QUEUED_INPUT_BYTES) {
      log("attach", "queue full, dropping input", sessionId, data.length, "bytes");
      return;
    }
    inputQueue.push(data);
    queuedBytes += data.length;
  };

  const drainQueue = (ws: WebSocket): void => {
    if (inputQueue.length === 0) return;
    log("attach", "drain queue", sessionId, inputQueue.length, "msgs", queuedBytes, "bytes");
    for (const data of inputQueue) {
      ws.send(JSON.stringify({ type: "input", data }));
    }
    inputQueue = [];
    queuedBytes = 0;
  };

  const send = (msg: ClientMessage): void => {
    const ws = socket;
    if (ws && ws.readyState === ws.OPEN) {
      log("attach", "send", sessionId, msg.type);
      ws.send(JSON.stringify(msg));
      return;
    }
    if (msg.type === "input") queueInput(msg.data);
    // resize is implicit in current term dims; resent on next open
  };

  const sendResize = (): void => send({ type: "resize", cols: term.cols, rows: term.rows });

  const clearRetryTimer = (): void => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const connect = (): void => {
    if (disposed || exited) return;
    clearRetryTimer();

    const isReconnect = everConnected;
    if (isReconnect) {
      setStatus({
        kind: "reconnecting",
        text: attempt > 1 ? `reconnecting | attempt ${attempt}` : "reconnecting…",
        attempt,
      });
    } else {
      setStatus({ kind: "connecting", text: "connecting…" });
    }

    const ws = openSessionSocket(sessionId);
    socket = ws;

    ws.addEventListener("open", () => {
      if (socket !== ws) {
        try { ws.close(); } catch { /* ignore */ }
        return;
      }
      log("attach", "open", sessionId, "reconnect=", isReconnect);
      backoffMs = INITIAL_BACKOFF_MS;
      attempt = 0;
      if (isReconnect) {
        // Server replays the full scrollback on every connect. Without a
        // reset, the replay appends below existing content — duplicating
        // the recent screen and leaving stale cursor state for TUIs.
        term.reset();
      }
      everConnected = true;
      setStatus({ kind: "connected", text: "connected" });
      sendResize();
      drainQueue(ws);
    });

    ws.addEventListener("message", (ev: MessageEvent<string>) => {
      const msg = parseServerMessage(ev.data);
      if (!msg) {
        log("attach", "recv unparseable", sessionId, String(ev.data).slice(0, 80));
        return;
      }
      if (msg.type === "history" || msg.type === "output") {
        term.write(msg.data);
      } else {
        log("attach", "recv exit", sessionId, "code=", msg.code);
        exited = true;
        setStatus({ kind: "exited", text: `exited | code ${msg.code}` });
      }
    });

    ws.addEventListener("close", (ev) => {
      log("attach", "close", sessionId, "code=", ev.code, "clean=", ev.wasClean);
      if (socket === ws) socket = null;
      if (disposed || exited) return;
      scheduleReconnect(ev.code);
    });

    ws.addEventListener("error", () => {
      log("attach", "error", sessionId);
      // close fires next; status is set there
    });
  };

  const scheduleReconnect = (closeCode: number): void => {
    attempt += 1;
    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      setStatus({
        kind: "error",
        text: `connection lost (${closeCode})`,
        attempt,
      });
      return;
    }
    const delay = backoffMs;
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    setStatus({
      kind: "reconnecting",
      text: attempt === 1
        ? "disconnected | reconnecting…"
        : `reconnecting in ${Math.round(delay / 100) / 10}s | attempt ${attempt}`,
      attempt,
    });
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  };

  const retry = (): void => {
    if (disposed || exited) return;
    log("attach", "retry requested", sessionId);
    clearRetryTimer();
    backoffMs = INITIAL_BACKOFF_MS;
    attempt = 0;
    if (socket && socket.readyState === socket.OPEN) return;
    if (socket && socket.readyState === socket.CONNECTING) return;
    connect();
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState !== "visible") return;
    if (disposed || exited) return;
    if (socket && socket.readyState === socket.OPEN) return;
    log("attach", "tab visible, forcing reconnect", sessionId);
    retry();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  connect();

  const inputSub = term.onData((data) => send({ type: "input", data }));
  const resizeSub = term.onResize(sendResize);
  const stopObserve = observeResize(container, term, fit);
  const stopSearch = mountSearch(container, term, search);

  term.focus();

  return {
    sessionId,
    fit: () => fit.fit(),
    sendInput: (data) => send({ type: "input", data }),
    retry,
    dispose: () => {
      log("attach", "dispose", sessionId);
      disposed = true;
      clearRetryTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopSearch();
      stopObserve();
      inputSub.dispose();
      resizeSub.dispose();
      if (socket) {
        try { socket.close(); } catch { /* ignore */ }
        socket = null;
      }
      term.dispose();
    },
  };
}

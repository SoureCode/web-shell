import { openSessionSocket } from "../api/socket.js";
import type { ClientMessage } from "../types/protocol.js";
import type { AttachedTerminal, StatusListener } from "../types/terminal.js";
import { log } from "../utils/log.js";
import { createTerminal } from "./factory.js";
import { parseServerMessage } from "./protocol.js";
import { observeResize } from "./resize.js";
import { mountSearch } from "./search.js";

export function attachTerminal(
  container: HTMLElement,
  sessionId: string,
  onStatus: StatusListener,
): AttachedTerminal {
  const { term, fit, search } = createTerminal(container);
  const socket = openSessionSocket(sessionId);
  let opened = false;

  const send = (msg: ClientMessage): void => {
    if (opened && socket.readyState === socket.OPEN) {
      log("attach", "send", sessionId, msg.type);
      socket.send(JSON.stringify(msg));
    }
  };

  const sendResize = (): void => send({ type: "resize", cols: term.cols, rows: term.rows });

  socket.addEventListener("open", () => {
    opened = true;
    log("attach", "open", sessionId);
    onStatus(`connected · ${sessionId.slice(0, 8)}`);
    sendResize();
  });

  socket.addEventListener("message", (ev: MessageEvent<string>) => {
    const msg = parseServerMessage(ev.data);
    if (!msg) {
      log("attach", "recv unparseable", sessionId, String(ev.data).slice(0, 80));
      return;
    }
    if (msg.type === "history" || msg.type === "output") {
      log("attach", "recv", sessionId, msg.type, msg.data.length, "bytes");
      term.write(msg.data);
    } else {
      log("attach", "recv exit", sessionId, "code=", msg.code);
      onStatus(`exited (code ${msg.code})`);
    }
  });

  socket.addEventListener("close", (ev) => {
    log("attach", "close", sessionId, "code=", ev.code, "reason=", ev.reason, "clean=", ev.wasClean);
    onStatus(`disconnected (${ev.code})`);
  });

  socket.addEventListener("error", () => {
    log("attach", "error", sessionId);
    onStatus("socket error");
  });

  const inputSub = term.onData((data) => send({ type: "input", data }));
  const resizeSub = term.onResize(sendResize);
  const stopObserve = observeResize(container, term, fit);
  const stopSearch = mountSearch(container, term, search);

  return {
    sessionId,
    fit: () => fit.fit(),
    sendInput: (data) => send({ type: "input", data }),
    dispose: () => {
      log("attach", "dispose", sessionId);
      stopSearch();
      stopObserve();
      inputSub.dispose();
      resizeSub.dispose();
      try {
        socket.close();
      } catch {
        // ignore
      }
      term.dispose();
    },
  };
}

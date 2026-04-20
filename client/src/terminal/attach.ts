import { openSessionSocket } from "../api/socket.js";
import type { ClientMessage } from "../types/protocol.js";
import type { AttachedTerminal, StatusListener } from "../types/terminal.js";
import { createTerminal } from "./factory.js";
import { parseServerMessage } from "./protocol.js";
import { observeResize } from "./resize.js";

export function attachTerminal(
  container: HTMLElement,
  sessionId: string,
  onStatus: StatusListener,
): AttachedTerminal {
  const { term, fit } = createTerminal(container);
  const socket = openSessionSocket(sessionId);
  let opened = false;

  const send = (msg: ClientMessage): void => {
    if (opened && socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
  };

  const sendResize = (): void => send({ type: "resize", cols: term.cols, rows: term.rows });

  socket.addEventListener("open", () => {
    opened = true;
    onStatus(`connected · ${sessionId.slice(0, 8)}`);
    sendResize();
  });

  socket.addEventListener("message", (ev: MessageEvent<string>) => {
    const msg = parseServerMessage(ev.data);
    if (!msg) return;
    if (msg.type === "history" || msg.type === "output") term.write(msg.data);
    else onStatus(`exited (code ${msg.code})`);
  });

  socket.addEventListener("close", () => onStatus("disconnected"));
  socket.addEventListener("error", () => onStatus("socket error"));

  const inputSub = term.onData((data) => send({ type: "input", data }));
  const resizeSub = term.onResize(sendResize);
  const stopObserve = observeResize(container, term, fit);

  return {
    sessionId,
    fit: () => fit.fit(),
    dispose: () => {
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

import type { Status, StatusListener } from "../types/terminal.js";

export interface TerminalOverlay {
  readonly listener: StatusListener;
  setRetryHandler(handler: (() => void) | null): void;
}

interface OverlayElements {
  readonly root: HTMLElement;
  readonly title: HTMLElement;
  readonly message: HTMLElement;
  readonly action: HTMLButtonElement;
}

export function mountTerminalOverlay(elements: OverlayElements): TerminalOverlay {
  const { root, title, message, action } = elements;
  let retryHandler: (() => void) | null = null;

  action.addEventListener("click", () => {
    retryHandler?.();
  });

  const apply = (status: Status): void => {
    switch (status.kind) {
      case "reconnecting":
        root.dataset["state"] = "reconnecting";
        root.hidden = false;
        title.textContent = "Disconnected";
        message.textContent = status.text;
        action.hidden = false;
        action.textContent = "Retry now";
        break;
      case "error":
        root.dataset["state"] = "error";
        root.hidden = false;
        title.textContent = "Connection lost";
        message.textContent = status.text;
        action.hidden = false;
        action.textContent = "Reconnect";
        break;
      case "exited":
        root.dataset["state"] = "exited";
        root.hidden = false;
        title.textContent = "Session ended";
        message.textContent = status.text;
        action.hidden = true;
        break;
      case "connected":
      case "connecting":
      case "idle":
      default:
        root.dataset["state"] = "hidden";
        root.hidden = true;
        action.hidden = true;
        break;
    }
  };

  return {
    listener: apply,
    setRetryHandler(handler) {
      retryHandler = handler;
    },
  };
}

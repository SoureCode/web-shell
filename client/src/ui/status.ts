import type { StatusListener } from "../types/terminal.js";

export function createStatusBar(el: HTMLElement): StatusListener {
  return (status) => {
    el.textContent = status.text;
    el.dataset["state"] = status.kind;
  };
}

import type { StatusKind } from "../types/terminal.js";

export interface StatusBar {
  set(kind: StatusKind, text: string): void;
  setSessionStartedAt(startedAt: number | null): void;
}

export function createStatusBar(el: HTMLElement): StatusBar {
  const textEl = document.createElement("span");
  textEl.className = "status__text";
  const uptimeEl = document.createElement("span");
  uptimeEl.className = "status__uptime";
  const clockEl = document.createElement("span");
  clockEl.className = "status__clock";
  el.replaceChildren(textEl, uptimeEl, clockEl);

  let startedAt: number | null = null;

  const tick = (): void => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    clockEl.textContent = `| ${hh}:${mm}:${ss}`;
    uptimeEl.textContent =
      startedAt === null ? "" : `uptime ${formatUptime(Date.now() - startedAt)}`;
  };
  tick();
  setInterval(tick, 1000);

  return {
    set(kind, text) {
      textEl.textContent = text;
      el.dataset["state"] = kind;
    },
    setSessionStartedAt(value) {
      startedAt = value;
      tick();
    },
  };
}

function formatUptime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

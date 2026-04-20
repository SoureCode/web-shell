import "@sourecode/virtual-keyboard";
import { terminalAdapter, type TerminalSend } from "@sourecode/virtual-keyboard";

const VISIBLE_KEY = "web-shell.keyboardVisible";

export interface KeyboardController {
  setSend(send: TerminalSend | null): void;
  show(): void;
  hide(): void;
  toggle(): void;
}

function loadVisible(defaultValue: boolean): boolean {
  try {
    const v = localStorage.getItem(VISIBLE_KEY);
    if (v === "true") return true;
    if (v === "false") return false;
  } catch {
    // storage disabled
  }
  return defaultValue;
}

function saveVisible(visible: boolean): void {
  try {
    localStorage.setItem(VISIBLE_KEY, visible ? "true" : "false");
  } catch {
    // storage disabled
  }
}

export function mountVirtualKeyboard(el: HTMLElement, toggleBtn: HTMLElement): KeyboardController {
  let send: TerminalSend | null = null;
  const adapter = terminalAdapter((data) => {
    if (send) send(data);
  });
  (el as unknown as { setAdapter(a: unknown): void }).setAdapter(adapter);

  const apply = (visible: boolean, persist = true): void => {
    if (visible) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
    toggleBtn.setAttribute("aria-pressed", visible ? "true" : "false");
    if (persist) saveVisible(visible);
  };

  const defaultVisible = window.matchMedia("(pointer: coarse)").matches;
  apply(loadVisible(defaultVisible), false);

  toggleBtn.addEventListener("click", () => apply(el.hasAttribute("hidden")));

  return {
    setSend: (next) => {
      send = next;
    },
    show: () => apply(true),
    hide: () => apply(false),
    toggle: () => apply(el.hasAttribute("hidden")),
  };
}

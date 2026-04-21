import { Terminal } from "@xterm/xterm";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { FitAddon } from "@xterm/addon-fit";
import { ProgressAddon } from "@xterm/addon-progress";
import { SearchAddon } from "@xterm/addon-search";
import { UnicodeGraphemesAddon } from "@xterm/addon-unicode-graphemes";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { TERMINAL_FONT_FAMILY, TERMINAL_FONT_SIZE, TERMINAL_SCROLLBACK } from "../config.js";
import { tryEnableGpuRenderer } from "./gpu.js";

export interface TerminalBundle {
  readonly term: Terminal;
  readonly fit: FitAddon;
  readonly search: SearchAddon;
}

export function createTerminal(container: HTMLElement): TerminalBundle {
  container.innerHTML = "";

  const term = new Terminal({
    cursorBlink: true,
    fontFamily: TERMINAL_FONT_FAMILY,
    fontSize: TERMINAL_FONT_SIZE,
    scrollback: TERMINAL_SCROLLBACK,
    allowProposedApi: true,
    theme: {
      background: "#0e1116",
      foreground: "#d5d7dc",
      cursor: "#4c8dff",
      selectionBackground: "#2b446b",
    },
  });

  const fit = new FitAddon();
  const search = new SearchAddon();
  term.loadAddon(fit);
  term.loadAddon(search);
  term.loadAddon(new WebLinksAddon());
  term.loadAddon(new ClipboardAddon());
  term.loadAddon(new ProgressAddon());

  const graphemes = new UnicodeGraphemesAddon();
  term.loadAddon(graphemes);
  term.unicode.activeVersion = "15-graphemes";

  term.open(container);
  fit.fit();

  const viewport = term.element;
  if (viewport) {
    viewport.addEventListener(
      "wheel",
      (event) => {
        if (term.buffer.active.type === "alternate") {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true },
    );
    viewport.addEventListener("paste", () => {
      setTimeout(() => term.clearSelection(), 0);
    });
  }

  term.onSelectionChange(() => {
    const selection = term.getSelection();
    if (!selection) return;
    void navigator.clipboard?.writeText(selection);
  });

  term.attachCustomKeyEventHandler((event) => {
    if (event.type !== "keydown") return true;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "c" && term.hasSelection()) {
      void navigator.clipboard?.writeText(term.getSelection());
      term.clearSelection();
      return false;
    }
    if (mod && !event.altKey && event.key.toLowerCase() === "v") {
      term.clearSelection();
      return false;
    }
    return true;
  });

  requestAnimationFrame(() => {
    tryEnableGpuRenderer(term, fit);
  });

  return { term, fit, search };
}

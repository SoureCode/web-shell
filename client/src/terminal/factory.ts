import { Terminal } from "@xterm/xterm";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { FitAddon } from "@xterm/addon-fit";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import { ProgressAddon } from "@xterm/addon-progress";
import { SearchAddon } from "@xterm/addon-search";
import { UnicodeGraphemesAddon } from "@xterm/addon-unicode-graphemes";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { TERMINAL_FONT_FAMILY, TERMINAL_FONT_SIZE, TERMINAL_SCROLLBACK } from "../config.js";
import { log } from "../utils/log.js";

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

  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => {
      log("terminal", "webgl context lost, disposing addon");
      webgl.dispose();
    });
    term.loadAddon(webgl);
    term.loadAddon(new LigaturesAddon());
  } catch (err: unknown) {
    log("terminal", "webgl unavailable, using DOM renderer", String(err));
  }

  fit.fit();

  return { term, fit, search };
}

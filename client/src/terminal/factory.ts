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

  // The sync fit above can measure with pre-layout container dims or before
  // the terminal font has finished loading (wrong char metrics → wrong cols).
  // ResizeObserver only reacts to container-size changes, not font-metric
  // changes, so schedule explicit re-fits. Each is a no-op if dims are stable.
  const refit = (): void => {
    try {
      fit.fit();
    } catch {
      // container removed before callback ran
    }
  };
  requestAnimationFrame(refit);
  void document.fonts?.ready.then(refit);

  const viewport = term.element;
  if (viewport) {
    viewport.addEventListener(
      "wheel",
      (event) => {
        // Only swallow when xterm has no use for the event: alt screen active
        // and the app hasn't enabled mouse tracking. Otherwise xterm translates
        // the wheel into mouse escapes that pagers/editors need to scroll.
        if (term.buffer.active.type === "alternate" && term.modes.mouseTrackingMode === "none") {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true },
    );
    viewport.addEventListener("paste", () => {
      setTimeout(() => term.clearSelection(), 0);
    });

    // Touch support. xterm's xterm-screen overlays xterm-viewport and eats
    // touch events, so mobile browsers never see a native scroll gesture.
    // Translate single-finger drags into synthetic wheel events dispatched
    // at xterm's viewport. xterm's own wheel handling then applies — which
    // means touch inherits exactly the same policy as the mouse wheel:
    //   - normal buffer: scrolls the scrollback
    //   - alt buffer + mouse tracking: emits protocol-correct mouse-wheel
    //     escapes (apps with mouse support scroll natively)
    //   - alt buffer without mouse tracking: swallowed by the capture
    //     handler above, same as desktop
    const xtermViewport = viewport.querySelector<HTMLElement>(".xterm-viewport");
    let touchId: number | null = null;
    let lastY = 0;
    let pixelAccum = 0;

    const findTouch = (list: TouchList, id: number): Touch | null => {
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        if (t && t.identifier === id) return t;
      }
      return null;
    };

    // Row height via public surface: viewport's rendered height / term.rows.
    // Falls back to a plausible pixel height before layout is ready.
    const rowHeight = (): number => {
      const h = xtermViewport?.clientHeight ?? 0;
      const rows = term.rows || 1;
      return h > 0 ? h / rows : 17;
    };

    const onTouchStart = (event: TouchEvent): void => {
      const t = event.touches[0];
      if (event.touches.length !== 1 || !t) {
        touchId = null;
        return;
      }
      touchId = t.identifier;
      lastY = t.clientY;
      pixelAccum = 0;
    };

    const onTouchMove = (event: TouchEvent): void => {
      if (touchId === null || !xtermViewport) return;
      const t = findTouch(event.touches, touchId);
      if (!t) return;
      const dy = lastY - t.clientY;
      if (dy === 0) return;
      lastY = t.clientY;

      if (term.buffer.active.type === "normal") {
        // Map continuous pixel delta onto xterm's row-based scroll API.
        // Synthetic WheelEvents don't trigger the browser's default scroll of
        // an overflow:auto element (gated on isTrusted), so we use xterm's
        // public scrollLines() — the same entry point used by its own wheel
        // handler after normalising pixels to lines.
        pixelAccum += dy;
        const rh = rowHeight();
        const lines = Math.trunc(pixelAccum / rh);
        if (lines !== 0) {
          pixelAccum -= lines * rh;
          term.scrollLines(lines);
        }
      } else {
        // Alt buffer: no scrollback to slide. Dispatch a synthetic wheel so
        // xterm's JS handler runs — it emits protocol-correct mouse-wheel
        // escapes when the app has opted into mouse tracking, and is
        // swallowed by the capture handler above otherwise (matching the
        // desktop wheel policy).
        xtermViewport.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: dy,
            deltaMode: WheelEvent.DOM_DELTA_PIXEL,
            clientX: t.clientX,
            clientY: t.clientY,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    };

    const onTouchEnd = (event: TouchEvent): void => {
      if (touchId === null) return;
      if (findTouch(event.touches, touchId)) return;
      touchId = null;
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: true });
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

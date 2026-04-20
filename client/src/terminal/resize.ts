import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";

export function observeResize(container: HTMLElement, term: Terminal, fit: FitAddon): () => void {
  let rafId = 0;

  const schedule = (): void => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      const dims = fit.proposeDimensions();
      if (!dims) return;
      if (dims.cols === term.cols && dims.rows === term.rows) return;
      try {
        fit.fit();
      } catch {
        // container removed mid-resize
      }
    });
  };

  const observer = new ResizeObserver(schedule);
  observer.observe(container);

  return () => {
    observer.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
  };
}

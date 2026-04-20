import type { FitAddon } from "@xterm/addon-fit";

export function observeResize(container: HTMLElement, fit: FitAddon): () => void {
  const observer = new ResizeObserver(() => {
    try {
      fit.fit();
    } catch {
      // container not measurable yet
    }
  });
  observer.observe(container);
  return () => observer.disconnect();
}

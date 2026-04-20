import type { SearchAddon, ISearchOptions } from "@xterm/addon-search";
import type { Terminal } from "@xterm/xterm";
import { log } from "../utils/log.js";

const SEARCH_OPTIONS: ISearchOptions = {
  regex: false,
  caseSensitive: false,
  wholeWord: false,
  decorations: {
    matchBackground: "#4c8dff66",
    matchBorder: "#4c8dff",
    matchOverviewRuler: "#4c8dff",
    activeMatchBackground: "#ff9e4f",
    activeMatchBorder: "#ff9e4f",
    activeMatchColorOverviewRuler: "#ff9e4f",
  },
};

export function mountSearch(container: HTMLElement, term: Terminal, search: SearchAddon): () => void {
  const overlay = document.createElement("div");
  overlay.className = "term-search";
  overlay.hidden = true;

  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "find";
  input.className = "term-search__input";
  input.autocomplete = "off";
  input.spellcheck = false;

  const count = document.createElement("span");
  count.className = "term-search__count";
  count.textContent = "";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "term-search__close";
  closeBtn.textContent = "×";
  closeBtn.title = "close (Esc)";

  overlay.append(input, count, closeBtn);
  container.append(overlay);

  const resultsDisposer = search.onDidChangeResults(({ resultIndex, resultCount }) => {
    count.textContent = resultCount === 0 ? "" : `${resultIndex + 1}/${resultCount}`;
  });

  const open = (): void => {
    overlay.hidden = false;
    input.focus();
    input.select();
  };

  const close = (): void => {
    overlay.hidden = true;
    search.clearDecorations();
    count.textContent = "";
    term.focus();
  };

  const find = (direction: "next" | "prev"): void => {
    const query = input.value;
    if (!query) {
      search.clearDecorations();
      count.textContent = "";
      return;
    }
    if (direction === "next") search.findNext(query, SEARCH_OPTIONS);
    else search.findPrevious(query, SEARCH_OPTIONS);
  };

  const onInput = (): void => find("next");

  const onInputKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      find(e.shiftKey ? "prev" : "next");
    }
  };

  const onDocKey = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      log("search", "open");
      open();
    }
  };

  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onInputKey);
  closeBtn.addEventListener("click", close);
  container.addEventListener("keydown", onDocKey);
  document.addEventListener("keydown", onDocKey);

  return () => {
    document.removeEventListener("keydown", onDocKey);
    container.removeEventListener("keydown", onDocKey);
    input.removeEventListener("input", onInput);
    input.removeEventListener("keydown", onInputKey);
    closeBtn.removeEventListener("click", close);
    resultsDisposer.dispose();
    overlay.remove();
  };
}

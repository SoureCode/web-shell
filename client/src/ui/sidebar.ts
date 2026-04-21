import Sortable from "sortablejs";
import type { SessionInfo } from "../types/session.js";

export interface SidebarHandlers {
  readonly onSelect: (id: string) => void;
  readonly onRename: (id: string, title: string) => Promise<void> | void;
  readonly onDestroy: (id: string) => Promise<void> | void;
  readonly onReorder: (id: string, order: number) => Promise<void> | void;
}

const CONFIRM_TIMEOUT_MS = 3000;

export function renderSessionList(
  list: HTMLUListElement,
  sessions: readonly SessionInfo[],
  activeId: string | null,
  handlers: SidebarHandlers,
): void {
  list.innerHTML = "";
  for (const session of sessions) {
    list.append(renderItem(session, activeId === session.id, handlers));
  }
}

function renderItem(session: SessionInfo, active: boolean, handlers: SidebarHandlers): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "session-list__item";
  li.dataset["sessionId"] = session.id;
  li.dataset["order"] = String(session.order);
  if (active) li.classList.add("session-list__item--active");

  const handle = document.createElement("span");
  handle.className = "session-list__handle";
  handle.setAttribute("aria-hidden", "true");
  const handleIcon = document.createElement("i");
  handleIcon.className = "bi bi-grip-vertical";
  handle.append(handleIcon);

  const label = document.createElement("button");
  label.type = "button";
  label.className = "session-list__label";
  label.textContent = session.title;
  label.addEventListener("click", () => handlers.onSelect(session.id));

  const actions = document.createElement("div");
  actions.className = "session-list__actions";

  const renameBtn = makeIconButton("bi-pencil", "rename", "accent");
  renameBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    enterRenameMode(li, label, renameBtn, session, handlers);
  });

  const destroy = renderDestroyControl(session.id, handlers);

  actions.append(renameBtn, destroy);
  li.append(handle, label, actions);
  return li;
}

export function mountSortable(
  list: HTMLUListElement,
  onReorder: (id: string, order: number) => void,
): () => void {
  const sortable = Sortable.create(list, {
    animation: 150,
    delay: 200,
    delayOnTouchOnly: true,
    draggable: ".session-list__item",
    handle: ".session-list__handle",
    onEnd: (evt) => {
      const el = evt.item as HTMLElement;
      const id = el.dataset["sessionId"];
      if (!id) return;
      const prev = el.previousElementSibling as HTMLElement | null;
      const next = el.nextElementSibling as HTMLElement | null;
      const prevOrder = parseOrder(prev);
      const nextOrder = parseOrder(next);
      onReorder(id, midpointOrder(prevOrder, nextOrder));
    },
  });
  return () => sortable.destroy();
}

function parseOrder(el: HTMLElement | null): number | undefined {
  const raw = el?.dataset["order"];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function midpointOrder(prev: number | undefined, next: number | undefined): number {
  const GAP = 1000;
  if (prev === undefined && next === undefined) return Date.now();
  if (prev === undefined) return (next as number) - GAP;
  if (next === undefined) return prev + GAP;
  return (prev + next) / 2;
}

type ActionVariant = "accent" | "success" | "danger" | "neutral";

function makeIconButton(
  iconClass: string,
  label: string,
  variant: ActionVariant = "neutral",
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "session-list__action";
  if (variant !== "neutral") btn.classList.add(`session-list__action--${variant}`);
  btn.title = label;
  btn.setAttribute("aria-label", label);
  const icon = document.createElement("i");
  icon.className = `bi ${iconClass}`;
  icon.setAttribute("aria-hidden", "true");
  btn.append(icon);
  return btn;
}

function enterRenameMode(
  li: HTMLLIElement,
  label: HTMLButtonElement,
  renameBtn: HTMLButtonElement,
  session: SessionInfo,
  handlers: SidebarHandlers,
): void {
  // The pencil's original click handler still fires during rename mode;
  // bail so clicking the now-"save" button doesn't re-enter.
  if (!label.isConnected) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "session-list__edit";
  input.value = session.title;
  input.autocomplete = "off";
  input.spellcheck = false;

  const icon = renameBtn.querySelector("i");
  const prevIconClass = icon?.className ?? "bi bi-pencil";
  const prevTitle = renameBtn.title;
  const prevAria = renameBtn.getAttribute("aria-label") ?? "";

  let done = false;
  const commit = (save: boolean): void => {
    if (done) return;
    done = true;
    const next = input.value.trim();
    cleanup();
    if (save && next && next !== session.title) void handlers.onRename(session.id, next);
  };

  const cleanup = (): void => {
    input.removeEventListener("keydown", onKey);
    input.removeEventListener("blur", onBlur);
    renameBtn.removeEventListener("mousedown", onBtnMouseDown);
    renameBtn.removeEventListener("click", onBtnClick);
    if (icon) icon.className = prevIconClass;
    renameBtn.title = prevTitle;
    if (prevAria) renameBtn.setAttribute("aria-label", prevAria);
    renameBtn.classList.remove("session-list__action--success");
    renameBtn.classList.add("session-list__action--accent");
    if (input.isConnected) input.replaceWith(label);
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      commit(false);
    }
  };

  const onBlur = (): void => commit(true);

  // Suppress input blur when the user mousedowns on the save button, or
  // the blur handler would fire first and cleanup before the click lands.
  const onBtnMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
  };
  // Ignore quick repeat clicks on the same button — the first opened
  // rename mode, a follow-up within the arm window would save without
  // giving the user a chance to type.
  const SAVE_ARM_MS = 250;
  const armedAt = performance.now();
  const onBtnClick = (e: MouseEvent): void => {
    e.stopPropagation();
    if (performance.now() - armedAt < SAVE_ARM_MS) return;
    commit(true);
  };

  label.replaceWith(input);
  if (icon) icon.className = "bi bi-check-lg";
  renameBtn.title = "save";
  renameBtn.setAttribute("aria-label", "save");
  renameBtn.classList.remove("session-list__action--accent");
  renameBtn.classList.add("session-list__action--success");
  input.addEventListener("keydown", onKey);
  input.addEventListener("blur", onBlur);
  renameBtn.addEventListener("mousedown", onBtnMouseDown);
  renameBtn.addEventListener("click", onBtnClick);
  input.focus();
  input.select();

  // silence unused-var warnings in strict mode
  void li;
}

function renderDestroyControl(id: string, handlers: SidebarHandlers): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "session-list__destroy";

  const trash = makeIconButton("bi-trash", "destroy", "danger");
  const confirm = makeIconButton("bi-check-lg", "confirm destroy", "danger");
  const cancel = makeIconButton("bi-x-lg", "cancel");

  let timeoutId = 0;
  const setArmed = (armed: boolean): void => {
    wrap.dataset["armed"] = armed ? "true" : "false";
    window.clearTimeout(timeoutId);
    if (armed) {
      timeoutId = window.setTimeout(() => setArmed(false), CONFIRM_TIMEOUT_MS);
    }
  };
  setArmed(false);

  trash.addEventListener("click", (e) => {
    e.stopPropagation();
    setArmed(true);
  });

  confirm.addEventListener("click", (e) => {
    e.stopPropagation();
    setArmed(false);
    void handlers.onDestroy(id);
  });

  cancel.addEventListener("click", (e) => {
    e.stopPropagation();
    setArmed(false);
  });

  wrap.append(trash, confirm, cancel);
  return wrap;
}

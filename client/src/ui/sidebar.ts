import type { SessionInfo } from "../types/session.js";

export interface SidebarHandlers {
  readonly onSelect: (id: string) => void;
  readonly onRename: (id: string, title: string) => Promise<void> | void;
  readonly onDestroy: (id: string) => Promise<void> | void;
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
  if (active) li.classList.add("session-list__item--active");

  const label = document.createElement("button");
  label.type = "button";
  label.className = "session-list__label";
  label.textContent = session.title;
  label.addEventListener("click", () => handlers.onSelect(session.id));

  const actions = document.createElement("div");
  actions.className = "session-list__actions";

  const renameBtn = makeIconButton("bi-pencil", "rename");
  renameBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    enterRenameMode(li, label, session, handlers);
  });

  const destroy = renderDestroyControl(session.id, handlers);

  actions.append(renameBtn, destroy);
  li.append(label, actions);
  return li;
}

function makeIconButton(iconClass: string, label: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "session-list__action";
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
  session: SessionInfo,
  handlers: SidebarHandlers,
): void {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "session-list__edit";
  input.value = session.title;
  input.autocomplete = "off";
  input.spellcheck = false;

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

  label.replaceWith(input);
  input.addEventListener("keydown", onKey);
  input.addEventListener("blur", onBlur);
  input.focus();
  input.select();

  // silence unused-var warnings in strict mode
  void li;
}

function renderDestroyControl(id: string, handlers: SidebarHandlers): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "session-list__destroy";

  const trash = makeIconButton("bi-trash", "destroy");
  const confirm = makeIconButton("bi-check-lg", "confirm destroy");
  const cancel = makeIconButton("bi-x-lg", "cancel");
  confirm.classList.add("session-list__action--danger");

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

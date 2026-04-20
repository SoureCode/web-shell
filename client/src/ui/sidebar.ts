import type { SessionInfo } from "../types/session.js";

export interface SidebarHandlers {
  readonly onSelect: (id: string) => void;
  readonly onDestroy: (id: string) => void;
}

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

  const close = document.createElement("button");
  close.type = "button";
  close.className = "session-list__close";
  close.title = "destroy session";
  close.textContent = "×";
  close.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onDestroy(session.id);
  });

  li.append(label, close);
  return li;
}

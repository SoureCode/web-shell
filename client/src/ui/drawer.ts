const MOBILE_QUERY = "(max-width: 768px)";
const OPEN_KEY = "web-shell.sidebarOpen";
const PIN_KEY = "web-shell.sidebarPinned";

export interface Drawer {
  open(): void;
  close(): void;
  toggle(): void;
  closeIfMobile(): void;
  togglePin(): void;
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === "true") return true;
    if (v === "false") return false;
  } catch {
    // access denied
  }
  return fallback;
}

function saveBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // access denied
  }
}

export interface DrawerElements {
  readonly root: HTMLElement;
  readonly toggleBtn: HTMLElement;
  readonly backdrop: HTMLElement;
  readonly pinBtn: HTMLElement;
}

export function mountDrawer(el: DrawerElements): Drawer {
  const media = window.matchMedia(MOBILE_QUERY);
  const initialOpen = loadBool(OPEN_KEY, !media.matches);
  const initialPinned = loadBool(PIN_KEY, false);

  const apply = (): void => {
    const open = el.root.dataset["sidebarOpen"] === "true";
    el.backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    const pinned = el.root.dataset["sidebarPinned"] === "true";
    el.pinBtn.setAttribute("aria-pressed", pinned ? "true" : "false");
    el.pinBtn.title = pinned ? "unpin sidebar" : "pin sidebar";
    const icon = el.pinBtn.querySelector("i");
    if (icon) {
      icon.className = pinned ? "bi bi-pin-angle-fill" : "bi bi-pin-angle";
    }
  };

  const setOpen = (open: boolean, persist = true): void => {
    el.root.dataset["sidebarOpen"] = open ? "true" : "false";
    if (persist) saveBool(OPEN_KEY, open);
    apply();
  };

  const setPinned = (pinned: boolean, persist = true): void => {
    el.root.dataset["sidebarPinned"] = pinned ? "true" : "false";
    if (persist) saveBool(PIN_KEY, pinned);
    apply();
  };

  setPinned(initialPinned, false);
  setOpen(initialOpen, false);

  const open = (): void => setOpen(true);
  const close = (): void => setOpen(false);
  const toggle = (): void => setOpen(el.root.dataset["sidebarOpen"] !== "true");
  const closeIfMobile = (): void => {
    if (media.matches) close();
  };
  const togglePin = (): void => setPinned(el.root.dataset["sidebarPinned"] !== "true");

  el.toggleBtn.addEventListener("click", toggle);
  el.backdrop.addEventListener("click", close);
  el.pinBtn.addEventListener("click", togglePin);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && media.matches) close();
  });

  return { open, close, toggle, closeIfMobile, togglePin };
}

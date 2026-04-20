import { STORAGE_ACTIVE_SESSION } from "../config.js";

export function getActiveSessionId(): string | null {
  return localStorage.getItem(STORAGE_ACTIVE_SESSION);
}

export function setActiveSessionId(id: string): void {
  localStorage.setItem(STORAGE_ACTIVE_SESSION, id);
}

export function clearActiveSessionId(): void {
  localStorage.removeItem(STORAGE_ACTIVE_SESSION);
}

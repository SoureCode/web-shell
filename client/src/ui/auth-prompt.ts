import { clearAuthToken, setAuthToken } from "../state/auth-token.js";

export function promptForToken(message = "Auth token"): boolean {
  const value = window.prompt(message);
  if (!value) {
    clearAuthToken();
    return false;
  }
  setAuthToken(value.trim());
  return true;
}

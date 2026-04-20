import { getAuthToken } from "../state/auth-token.js";
import { wsUrl } from "../utils/url.js";

export function openSessionSocket(id: string): WebSocket {
  const token = getAuthToken();
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return new WebSocket(`${wsUrl(`ws/sessions/${id}`)}${qs}`);
}

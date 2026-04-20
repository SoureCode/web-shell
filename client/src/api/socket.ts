import { getAuthToken } from "../state/auth-token.js";
import { log } from "../utils/log.js";
import { wsUrl } from "../utils/url.js";

export function openSessionSocket(id: string): WebSocket {
  const token = getAuthToken();
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  const url = `${wsUrl(`api/sessions/${id}/stream`)}${qs}`;
  log("socket", "open", id, url);
  return new WebSocket(url);
}

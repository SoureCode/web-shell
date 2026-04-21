import { getAuthToken } from "../state/auth-token.js";
import type { CreateSessionInput, SessionInfo } from "../types/session.js";
import { log } from "../utils/log.js";
import { apiUrl } from "../utils/url.js";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return token ? { ...extra, authorization: `Bearer ${token}` } : extra;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  log("api", init.method ?? "GET", url);
  const res = await fetch(url, init);
  log("api", "<-", res.status, url);
  if (res.status === 401) throw new UnauthorizedError();
  return res;
}

export async function listSessions(): Promise<SessionInfo[]> {
  const res = await request("api/sessions", { headers: authHeaders() });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return (await res.json()) as SessionInfo[];
}

export async function createSession(input: CreateSessionInput = {}): Promise<SessionInfo> {
  const res = await request("api/sessions", {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `create failed: ${res.status}`);
  }
  return (await res.json()) as SessionInfo;
}

export async function destroySession(id: string): Promise<void> {
  const res = await request(`api/sessions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) throw new Error(`destroy failed: ${res.status}`);
}

export async function renameSession(id: string, title: string): Promise<SessionInfo> {
  const res = await request(`api/sessions/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`rename failed: ${res.status}`);
  return (await res.json()) as SessionInfo;
}

export async function reorderSession(id: string, order: number): Promise<SessionInfo> {
  const res = await request(`api/sessions/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ order }),
  });
  if (!res.ok) throw new Error(`reorder failed: ${res.status}`);
  return (await res.json()) as SessionInfo;
}

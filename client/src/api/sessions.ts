import type { CreateSessionInput, SessionInfo } from "../types/session.js";

export async function listSessions(): Promise<SessionInfo[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return (await res.json()) as SessionInfo[];
}

export async function createSession(input: CreateSessionInput = {}): Promise<SessionInfo> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  return (await res.json()) as SessionInfo;
}

export async function destroySession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`destroy failed: ${res.status}`);
}

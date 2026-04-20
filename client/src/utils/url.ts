const BASE = import.meta.env.BASE_URL;

function join(path: string): string {
  return `${BASE}${path.replace(/^\/+/, "")}`;
}

export function apiUrl(path: string): string {
  return join(path);
}

export function wsUrl(path: string): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}${join(path)}`;
}

import type { ServerResponse } from "node:http";

export function startSse(res: ServerResponse): void {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "x-accel-buffering": "no",
    connection: "keep-alive",
  });
  res.flushHeaders?.();
  res.write(": connected\n\n");
}

export function sendEvent(res: ServerResponse, event: string, data: string): void {
  res.write(`event: ${event}\n`);
  for (const line of data.split("\n")) res.write(`data: ${line}\n`);
  res.write("\n");
}

export function sendPing(res: ServerResponse): void {
  res.write(": ping\n\n");
}

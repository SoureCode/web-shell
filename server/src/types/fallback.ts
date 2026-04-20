import type { IncomingMessage, ServerResponse } from "node:http";

export type RequestFallback = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

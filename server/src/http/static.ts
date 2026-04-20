import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { mimeType } from "../utils/mime.js";

export async function serveStatic(root: string, urlPath: string, res: ServerResponse): Promise<boolean> {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  let absolute = resolve(root, relative.replace(/^[/\\]+/, ""));

  const safeRoot = resolve(root) + sep;
  if (!(absolute + sep).startsWith(safeRoot) && absolute !== resolve(root)) return false;

  try {
    let info = await stat(absolute);
    if (info.isDirectory()) {
      absolute = join(absolute, "index.html");
      info = await stat(absolute);
    }
    if (!info.isFile()) return false;

    res.writeHead(200, {
      "content-type": mimeType(extname(absolute)),
      "content-length": info.size,
      "cache-control": "no-cache",
    });
    await new Promise<void>((done, fail) => {
      createReadStream(absolute).on("end", done).on("error", fail).pipe(res);
    });
    return true;
  } catch {
    return false;
  }
}

export async function serveSpaFallback(root: string, res: ServerResponse): Promise<boolean> {
  return serveStatic(root, "/index.html", res);
}

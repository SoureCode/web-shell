import { spawn } from "node:child_process";

const SESSION_PREFIX = "webshell-";

export function sessionName(id: string): string {
  return `${SESSION_PREFIX}${id}`;
}

export function idFromName(name: string): string {
  return name.slice(SESSION_PREFIX.length);
}

export function isOurs(name: string): boolean {
  return name.startsWith(SESSION_PREFIX);
}

export interface TmuxSession {
  readonly name: string;
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
}

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn("tmux", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`tmux ${args.join(" ")} exited ${code}: ${stderr.trim()}`));
    });
    p.on("error", reject);
  });
}

export async function listSessions(): Promise<TmuxSession[]> {
  try {
    const out = await run([
      "list-sessions",
      "-F",
      "#{session_name}\t#{session_created}\t#{@title}",
    ]);
    return out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("\t");
        const name = parts[0] ?? "";
        const created = parts[1] ?? "0";
        const rawTitle = parts[2] ?? "";
        const title = rawTitle.length > 0 ? rawTitle : name;
        return {
          name,
          id: idFromName(name),
          title,
          createdAt: Number(created) * 1000,
        };
      })
      .filter((s) => isOurs(s.name));
  } catch {
    return [];
  }
}

export async function capturePane(name: string): Promise<string> {
  try {
    return await run(["capture-pane", "-p", "-e", "-J", "-S", "-", "-t", name]);
  } catch {
    return "";
  }
}

export async function setTitle(name: string, title: string): Promise<void> {
  await run(["set-option", "-t", name, "@title", title]).catch(() => {});
}

export async function setOption(name: string, option: string, value: string): Promise<void> {
  await run(["set-option", "-t", name, option, value]).catch(() => {});
}

export async function kill(name: string): Promise<void> {
  await run(["kill-session", "-t", name]).catch(() => {});
}

export async function sourceFile(path: string): Promise<void> {
  await run(["source-file", path]).catch(() => {});
}

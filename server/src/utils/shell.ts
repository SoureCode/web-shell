export function defaultShell(): string {
  const fromEnv = process.env["SHELL"];
  if (fromEnv) return fromEnv;
  return process.platform === "win32" ? "powershell.exe" : "bash";
}

export function defaultCwd(): string {
  return process.env["HOME"] ?? process.cwd();
}

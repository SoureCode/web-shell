import { spawnSync } from "node:child_process";

export const DTACH_MISSING_MESSAGE =
  "'dtach' is not installed on the server. Install it and restart " +
  "(debian/ubuntu: 'sudo apt-get install -y dtach', alpine: 'apk add dtach', macos: 'brew install dtach').";

export function isDtachAvailable(): boolean {
  const result = spawnSync("dtach", [], { stdio: "ignore" });
  const err = result.error as NodeJS.ErrnoException | undefined;
  return !err || err.code !== "ENOENT";
}

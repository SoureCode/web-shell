import { spawnSync } from "node:child_process";

export const DTACH_MISSING_MESSAGE =
  "'dtach' is not installed on the server. Install it and restart " +
  "(debian/ubuntu: 'sudo apt-get install -y dtach', alpine: 'apk add dtach', macos: 'brew install dtach').";

let cached: boolean | null = null;

export function isDtachAvailable(): boolean {
  if (cached !== null) return cached;
  const result = spawnSync("dtach", ["-V"], { stdio: "ignore" });
  cached = !result.error && result.status === 0;
  return cached;
}

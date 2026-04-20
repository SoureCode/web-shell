// Strip escape sequences that would trigger the terminal to emit a
// response (Device Attributes, cursor-position / status reports, OSC
// color queries). Replaying them lets xterm re-answer, and those
// answers leak onto the shell.
const CSI_QUERY = /\x1b\[[?>=]?[0-9;]*[cn]/g;
const OSC_COLOR_QUERY = /\x1b\][0-9]+;\?(?:\x07|\x1b\\)/g;

export function sanitizeForReplay(data: string): string {
  return data.replace(CSI_QUERY, "").replace(OSC_COLOR_QUERY, "");
}

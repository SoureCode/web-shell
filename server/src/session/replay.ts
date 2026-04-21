// Strip escape sequences that would trigger the terminal to emit a
// response (Device Attributes, cursor-position / status reports, OSC
// color queries). Replaying them lets xterm re-answer, and those
// answers leak onto the shell.
const CSI_QUERY = /\x1b\[[?>=]?[0-9;]*[cn]/g;
const OSC_COLOR_QUERY = /\x1b\][0-9]+;\?(?:\x07|\x1b\\)/g;
// Erase-display (ED). Replaying these wipes prior content out of
// xterm.js during rehydrate, hiding history the user expects to see.
const ERASE_DISPLAY = /\x1b\[[0-3]?J/g;
// Cursor Position / Horizontal-Vertical Position. Replaying these
// jumps the cursor back over already-rendered content so live output
// appends below instead of overwriting the replayed screen.
const CURSOR_POSITION = /\x1b\[\d*(?:;\d*)?[Hf]/g;

export function sanitizeForReplay(data: string): string {
  return data
    .replace(CSI_QUERY, "")
    .replace(OSC_COLOR_QUERY, "")
    .replace(ERASE_DISPLAY, "")
    .replace(CURSOR_POSITION, "");
}

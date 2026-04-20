import type { FitAddon } from "@xterm/addon-fit";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import { WebglAddon } from "@xterm/addon-webgl";
import type { Terminal } from "@xterm/xterm";
import { log } from "../utils/log.js";

function supportsWebgl2(): boolean {
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return pixel[0] === 255 && pixel[1] === 0 && pixel[2] === 0;
  } catch {
    return false;
  }
}

export function tryEnableGpuRenderer(term: Terminal, fit: FitAddon): boolean {
  if (!supportsWebgl2()) {
    log("terminal", "webgl2 unsupported or non-drawing, staying on DOM renderer");
    return false;
  }

  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => {
      log("terminal", "webgl context lost, disposing addon");
      webgl.dispose();
    });
    term.loadAddon(webgl);
    term.loadAddon(new LigaturesAddon());
    fit.fit();
    term.refresh(0, term.rows - 1);
    log("terminal", "webgl renderer active");
    return true;
  } catch (err: unknown) {
    log("terminal", "webgl load failed, staying on DOM renderer", String(err));
    return false;
  }
}

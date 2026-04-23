import { defineConfig, type Plugin } from "vite";
import { injectTitlePrefix as renderTitlePrefix } from "../server/src/utils/title-prefix.js";

const proxyPort = process.env["PORT"] ?? "5173";
const proxyUri = process.env["VSCODE_PROXY_URI"];
const proxyUrl = proxyUri?.replace("{{port}}", proxyPort).replace(/\/$/, "");
const parsed = proxyUrl ? new URL(proxyUrl) : undefined;

function injectTitlePrefix(): Plugin {
  return {
    name: "inject-title-prefix",
    apply: "serve",
    transformIndexHtml(html) {
      const prefix = process.env["WEB_SHELL_TITLE_PREFIX"]?.trim() || null;
      return renderTitlePrefix(html, prefix);
    },
  };
}

function reinstateBase(base: string): Plugin {
  return {
    name: "reinstate-stripped-base",
    apply: "serve",
    configureServer(server) {
      if (base === "/") return;
      server.middlewares.use((req, _res, next) => {
        const url = req.url;
        if (!url) return next();
        if (!url.startsWith("/api") && !url.startsWith(base)) {
          req.url = base + url.replace(/^\//, "");
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  const pathname = parsed?.pathname ?? "/";
  const base = !parsed || pathname === "/" ? "/" : `${pathname.replace(/\/$/, "")}/`;
  return {
    root: import.meta.dirname,
    base,
    plugins: [injectTitlePrefix(), reinstateBase(base)],
    server: {
      strictPort: true,
      allowedHosts: true,
    },
  };
});

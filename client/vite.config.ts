import { defineConfig, type Plugin } from "vite";

const proxyUri = process.env["VSCODE_PROXY_URI"];
const proxyUrl = proxyUri?.replace("{{port}}", "5173").replace(/\/$/, "");
const parsed = proxyUrl ? new URL(proxyUrl) : undefined;

function reinstateBase(base: string): Plugin {
  return {
    name: "reinstate-stripped-base",
    apply: "serve",
    configureServer(server) {
      if (base === "/") return;
      server.middlewares.use((req, _res, next) => {
        const url = req.url;
        if (!url) return next();
        const isProxied = url.startsWith("/api") || url.startsWith("/ws");
        if (!isProxied && !url.startsWith(base)) {
          req.url = base + url.replace(/^\//, "");
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  const base = parsed ? `${parsed.pathname}/` : "/";
  return {
    base,
    plugins: [reinstateBase(base)],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: true,
      ...(parsed
        ? {
            hmr: {
              host: parsed.hostname,
              clientPort: 443,
              protocol: "wss",
              path: base,
            },
          }
        : {}),
      proxy: {
        "/api": "http://127.0.0.1:4000",
        "/ws": { target: "ws://127.0.0.1:4000", ws: true },
      },
    },
  };
});

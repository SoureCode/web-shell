# web-shell

Persistent browser terminal. Spawns shells inside `tmux` sessions on a Node.js backend and streams them over WebSocket to [xterm.js](https://xtermjs.org/). Sessions live server-side with a scrollback buffer and survive page refreshes, device switches, _and_ server restarts — `tmux` keeps the shells running, and the server reattaches to them on boot.

## Stack

- **Server**: Node.js + TypeScript, `node-pty`, `ws`, `tmux` (required on `$PATH`)
- **Client**: TypeScript + SCSS + Vite, `xterm.js`
- Strict TS everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …)

## Requirements

- Node.js 20+
- `tmux` installed and on `$PATH` — every session is a `tmux new-session -A -s webshell-<id>` under the hood.

## Layout

```
server/src/
  types/       session & protocol shapes
  session/     Session, SessionManager, scrollback
  http/        REST router
  ws/          upgrade handler, per-socket wiring, parser
  utils/       cors, json, shell helpers
  config.ts
  index.ts

client/src/
  types/       protocol, session, terminal shapes
  api/         REST client, socket factory
  terminal/    xterm factory, attach, resize, parser
  ui/          sidebar, status
  state/       localStorage persistence
  utils/       dom, json
  styles/      SCSS partials
  config.ts
  main.ts
```

One concept per file. Types under `types/`, helpers under `utils/`.

## Develop

```bash
npm install
npm run dev
```

- Server: `http://localhost:4000`
- Client: `http://localhost:5173` (proxies `/api` and `/ws` to the server)

## Build / single-process deploy

```bash
npm run build
npm start
# or shorthand:
npm run preview
```

`npm run build` compiles the server to `server/dist/` and bundles the client to `client/dist/`. `npm start` runs the compiled server, which also serves `client/dist/` statically with SPA fallback — one port, one origin, no Vite / CORS in the way.

Set `CLIENT_DIST` to override the path, or leave it unset and the server auto-detects `../client/dist` next to its own build output.

## API

| Method | Path                    | Description                    |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/api/sessions`         | list sessions                  |
| POST   | `/api/sessions`         | create session                 |
| GET    | `/api/sessions/:id`     | session info                   |
| DELETE | `/api/sessions/:id`     | destroy session                |
| WS     | `/api/sessions/:id/stream` | attach: history + I/O + resize |

### WebSocket protocol

Client → server:

```ts
{ type: "input",  data: string }
{ type: "resize", cols: number, rows: number }
```

Server → client:

```ts
{ type: "history", data: string }              // scrollback replay on connect
{ type: "output",  data: string }              // live PTY output
{ type: "exit",    code: number, signal?: number }
```

## Persistence model

Each `Session` is a `tmux` session named `webshell-<uuid>`, spawned under `node-pty` with a bundled `tmux.conf` (`server/tmux.conf`). `SessionManager` owns the live wrappers and keeps the last 256 KB of PTY output in a ring buffer per session. New WebSocket connections receive a sanitized `history` frame with the current buffer before live `output` streams, so the terminal repaints to the current state on refresh.

Because the shells run inside `tmux`, they outlive the Node process. On startup, the server enumerates existing `webshell-*` tmux sessions, reattaches to each one, and seeds its scrollback from `tmux capture-pane`. Killing a session via the API runs `tmux kill-session`.

The active session id is stored in `localStorage` so reloads reopen the same session automatically.

## Config

| Variable          | Default                                                 | Description                                                                                    |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `HOST`            | `127.0.0.1`                                             | Bind address. Loopback by default so an unfronted instance is never silently network-reachable. Set to `0.0.0.0` only when the port is protected by a reverse proxy / tunnel. |
| `PORT`            | `4000`                                                  | Server HTTP/WS port                                                                            |
| `SHELL`           | env / `bash`                                            | Default shell for new sessions                                                                 |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173`           | Comma-separated origin allow-list. Requests with a disallowed `Origin` are rejected (HTTP 403 / WS 403). Required for the frontend you actually deploy. |
| `AUTH_TOKEN`      | _unset_                                                 | Optional shared bearer token. When set, REST requires `Authorization: Bearer <token>` and WS requires `?token=<token>`. When unset, auth is disabled — only safe behind an authenticated upstream (Coder agent, SSO proxy, Tailscale, etc.). |

## Security model

web-shell has no user/account model. It exposes two trust modes:

1. **Token mode** (`AUTH_TOKEN` set). A single shared bearer token gates REST and WS. The browser prompts once and caches the token in `localStorage`. Suitable for solo/personal deployments.
2. **Proxy mode** (`AUTH_TOKEN` unset). The app trusts whatever sits in front of it — a reverse proxy with SSO, the Coder workspace agent tunnel, a VPN, etc. **Never expose a proxy-mode instance directly to an untrusted network.** The default `HOST=127.0.0.1` bind helps prevent accidental exposure.

Regardless of mode, cross-origin requests are rejected unless the `Origin` matches `ALLOWED_ORIGINS`, closing CSWSH and drive-by session-creation paths.

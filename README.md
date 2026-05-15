# web-shell

Persistent browser terminal. Spawns shells under `dtach` on a Node.js backend and streams them over WebSocket to [xterm.js](https://xtermjs.org/). Sessions live server-side with a scrollback buffer and survive page refreshes, device switches, _and_ server restarts — `dtach` keeps the shells running, and the server reattaches to them on boot.

## Stack

- **Server**: Node.js + TypeScript, `node-pty`, `ws`, `dtach` (required on `$PATH`)
- **Client**: TypeScript + SCSS + Vite, `xterm.js`
- Strict TS everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …)

## Requirements

- Node.js 20+
- `dtach` installed and on `$PATH` — every session runs under `dtach -A <socket>` so the shell survives Node restarts.

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

Each `Session` spawns a shell under `dtach -A <sock>` via `node-pty`. `SessionManager` owns the live wrappers and keeps a ring buffer of recent PTY output in memory, also append-only mirrored to a log file next to the socket. New WebSocket connections receive a sanitized `history` frame with the current buffer before live `output` streams, so the terminal repaints to the current state on refresh.

Because the shells run under `dtach`, they outlive the Node process. Session state lives in `$WEB_SHELL_STATE_DIR` (default `~/.cache/web-shell/sessions/`): one `<id>.sock` (dtach), `<id>.json` (metadata), `<id>.log` (scrollback), `<id>.pid` (shell PID) per session. On startup, the server enumerates live sockets, reattaches to each, and seeds its scrollback from the log tail. Killing a session via the API `SIGHUP`s the shell and removes the session files. On graceful shutdown (SIGINT/SIGTERM) the server detaches cleanly so shells keep running.

The active session id is stored in `localStorage` so reloads reopen the same session automatically.

## Config

| Variable          | Default                                                 | Description                                                                                    |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `HOST`            | `127.0.0.1`                                             | Bind address. Loopback by default so an unfronted instance is never silently network-reachable. Set to `0.0.0.0` only when the port is protected by a reverse proxy / tunnel. |
| `PORT`            | `4000`                                                  | Server HTTP/WS port                                                                            |
| `SHELL`           | env / `bash`                                            | Default shell for new sessions                                                                 |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173`           | Comma-separated origin allow-list. Requests with a disallowed `Origin` are rejected (HTTP 403 / WS 403). Required for the frontend you actually deploy. |
| `AUTH_TOKEN`      | _unset_                                                 | Optional shared bearer token. When set, REST requires `Authorization: Bearer <token>` and WS requires `?token=<token>`. When unset, auth is disabled — only safe behind an authenticated upstream (Coder agent, SSO proxy, Tailscale, etc.). |
| `WEB_SHELL_STATE_DIR` | `~/.cache/web-shell/sessions`                       | Directory holding per-session dtach sockets, metadata, logs, and pid files.                    |
| `WEB_SHELL_CWD`   | `$HOME`                                                 | Default working directory for new sessions when the client does not request one.               |
| `WEB_SHELL_CWD_ALLOW` | _unset_                                             | Optional comma-separated allow-list of directory prefixes. When set, `?cwd=` requests outside the listed roots are rejected. Off by default.        |

## Per-session working directory

Each new session can pick its own starting directory via the `?cwd=` query parameter on the page URL:

```
http://localhost:4000/?cwd=/tmp
```

The frontend reads `?cwd=` and forwards it to the backend when it creates a session. Existing sessions keep their original cwd — the parameter only applies when a fresh session is spawned.

The server validates every requested cwd:

- Must be an absolute path.
- Must exist and be a directory.
- Must be readable and executable by the server's user.
- If `WEB_SHELL_CWD_ALLOW` is set, the resolved path must sit under one of the listed prefixes (e.g. `WEB_SHELL_CWD_ALLOW=/home/coder,/tmp`). Match is by directory boundary, so `/home/coder` admits `/home/coder/projects` but not `/home/coder-evil`.

Invalid requests fail with HTTP 400 and the error is surfaced in the terminal pane — there is no silent fallback, so misconfigurations are visible. When the parameter is omitted, sessions start in `WEB_SHELL_CWD` (or `$HOME` if unset).

`?cwd=` is plain routing input — auth is unchanged and still relies on `AUTH_TOKEN` or upstream proxy auth.

## Security model

web-shell has no user/account model. It exposes two trust modes:

1. **Token mode** (`AUTH_TOKEN` set). A single shared bearer token gates REST and WS. The browser prompts once and caches the token in `localStorage`. Suitable for solo/personal deployments.
2. **Proxy mode** (`AUTH_TOKEN` unset). The app trusts whatever sits in front of it — a reverse proxy with SSO, the Coder workspace agent tunnel, a VPN, etc. **Never expose a proxy-mode instance directly to an untrusted network.** The default `HOST=127.0.0.1` bind helps prevent accidental exposure.

Regardless of mode, cross-origin requests are rejected unless the `Origin` matches `ALLOWED_ORIGINS`, closing CSWSH and drive-by session-creation paths.

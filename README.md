# web-shell

Persistent browser terminal. Spawns PTY sessions on a Node.js backend and streams them over WebSocket to [xterm.js](https://xtermjs.org/). Sessions live server-side with a scrollback buffer, so refreshing the page — or reattaching from another device — resumes the same shell exactly where you left it.

## Stack

- **Server**: Node.js + TypeScript, `node-pty`, `ws`
- **Client**: TypeScript + SCSS + Vite, `xterm.js`
- Strict TS everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …)

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

## Build

```bash
npm run build
npm start
```

`npm run build` compiles the server to `server/dist/` and bundles the client to `client/dist/`. `npm start` runs the compiled server.

## API

| Method | Path                    | Description                    |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/api/sessions`         | list sessions                  |
| POST   | `/api/sessions`         | create session                 |
| GET    | `/api/sessions/:id`     | session info                   |
| DELETE | `/api/sessions/:id`     | destroy session                |
| WS     | `/ws/sessions/:id`      | attach: history + I/O + resize |

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

`SessionManager` owns the live `Session` instances. Each session keeps the last 256 KB of PTY output in a ring buffer. New WebSocket connections receive a `history` frame with the current buffer before live `output` streams, so the terminal repaints to the current state on refresh.

The active session id is stored in `localStorage` so reloads reopen the same session automatically.

## Config

| Variable | Default | Description         |
| -------- | ------- | ------------------- |
| `PORT`   | `4000`  | Server HTTP/WS port |
| `SHELL`  | env / `bash` | Default shell for new sessions |

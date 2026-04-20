# SoureCode Devcontainer Template

Opinionated devcontainer preloaded with the
[`sourecode/devcontainer-features`](https://github.com/sourecode/devcontainer-features)
collection. Open this folder in any editor that speaks the
[Dev Containers spec](https://containers.dev) (VS Code, JetBrains Gateway,
`devcontainer` CLI, Coder, …) and you get a Debian `trixie-slim` box with
Node.js, Claude Code, and home-directory persistence wired up.

## What's inside

| Feature | Summary |
|---|---|
| [`nvm`](https://github.com/sourecode/devcontainer-features/tree/master/src/nvm) | System-wide nvm at `/usr/local/share/nvm` with `node`/`npm`/`npx` on PATH (defaults to the LTS). |
| [`claude-code`](https://github.com/sourecode/devcontainer-features/tree/master/src/claude-code) | Latest Claude Code CLI via the official native installer. Declares `~/.claude` and `~/.claude.json` as persistence targets and pulls in `nvm` via `dependsOn`. |
| [`rtk`](https://github.com/sourecode/devcontainer-features/tree/master/src/rtk) | [rtk](https://github.com/rtk-ai/rtk) LLM token-reducing proxy. Auto-patches Claude Code so the hook is written against the live `~/.claude`. |
| [`context-mode`](https://github.com/sourecode/devcontainer-features/tree/master/src/context-mode) | Installs the [`context-mode`](https://github.com/mksglu/context-mode) Claude Code plugin into `~/.claude/plugins`. |
| [`home-persist`](https://github.com/sourecode/devcontainer-features/tree/master/src/home-persist) | Symlinks declared `$HOME` paths into the per-owner persistence volume at `/mnt/home-persist`. |

## Usage

1. Click **Use this template** on GitHub to create your own repo.
2. Ensure a persistence directory exists on the host and is bind-mounted at
   `/mnt/home-persist` — the included `devcontainer.json` declares the mount,
   and the host path must be writable by the container user (UID `1000` by
   default).
3. Open the repo in your Dev Containers client and let the features install.
   On first create, `home-persist` materializes symlinks for `~/.claude`,
   `~/.claude.json`, and anything else features or you declare.

### Customizing the user

The Dockerfile accepts `USERNAME`, `USER_UID`, and `USER_GID` build args,
driven by `DEVCONTAINER_USERNAME` / `DEVCONTAINER_USER_UID` /
`DEVCONTAINER_USER_GID` from the host environment. Defaults: `dev` / `1000` /
`1000`.

### Adding your own persisted paths

Set the `paths` option on `home-persist` in `devcontainer.json`:

```jsonc
"ghcr.io/sourecode/devcontainer-features/home-persist:1": {
  "paths": ".gitconfig,.ssh,.config/gh"
}
```

Features already declare their own paths (e.g. `claude-code` contributes
`.claude` and `.claude.json`), so you only list what's yours.

## References

- Upstream features & docs: https://github.com/sourecode/devcontainer-features
- Persistence model: [`docs/persistence.md`](https://github.com/sourecode/devcontainer-features/blob/master/docs/persistence.md)
- Dev Containers spec: https://containers.dev

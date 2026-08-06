# Codex Avatars

Codex Avatars turns Codex multi-agent activity into a tiny animated team on your Windows desktop. Every subagent gets its own independent character and lifecycle.

> Early preview: the local prototype is functional, but the first public release has not been signed or published yet.

## What it shows

- One avatar for the main Codex session.
- One independent avatar per `agent_id` reported by `SubagentStart`.
- Working, waiting, attention, completed, and exit animations.
- Separate groups when several Codex projects are active.
- A passive click-through mode toggled with `Ctrl+Alt+A`.

Codex currently gives lifecycle hooks a stable subagent identifier, but tool-use hooks do not document an individual `agent_id`. Codex Avatars therefore shows accurate per-agent lifecycle state and does not guess which subagent used a particular tool.

## Privacy

Events stay on your computer. The hook sends a small allowlisted payload through a local Windows named pipe. It deliberately excludes prompts, tool arguments, command output, transcript contents, source code, and assistant messages.

## Install on Windows

For a published release, no developer tools are required:

1. Download `Codex Avatars-Setup-<version>.exe` from GitHub Releases.
2. Run the installer and launch Codex Avatars.
3. Open **Settings** and select **Enable** under Codex integration.
4. Review and trust the hook in Codex when prompted, then open a new task.

That is the complete end-user setup. The current local preview is unsigned; a public release should be code-signed to avoid unnecessary Windows warnings.

## Run from source

Requirements:

- Windows 10 or 11
- Node.js 22 or newer
- A current Codex release with lifecycle hooks enabled

```powershell
git clone <repository-url> codex-avatars
cd codex-avatars
npm install
npm start
```

In the overlay, open **Settings** and select **Enable** under Codex integration. Existing `~/.codex/hooks.json` entries are preserved and a timestamped backup is created before every change.

The Windows uninstaller removes only the Codex Avatars hook handlers before deleting the app. Other user hooks remain untouched.

Codex may ask you to review and trust the new hook definition. This is an intentional security step. Restart Codex or open a new task after enabling the integration.

## Useful commands

```powershell
npm test
npm run demo
npm run hooks:status
npm run hooks:install
npm run hooks:uninstall
npm run dist
```

`npm run demo` sends synthetic agent events to a running overlay. The hook-management commands are optional alternatives to the buttons in the app.

## Architecture

```text
Codex lifecycle hooks
        |
        | allowlisted metadata only
        v
Windows named pipe: codex-avatars-v1
        |
        v
Electron overlay + in-memory agent store
```

The first release uses the officially documented `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `PermissionRequest`, `SubagentStart`, and `SubagentStop` events. A richer App Server adapter can be added later without changing the renderer protocol.

## Build a Windows installer

```powershell
npm ci
npm test
npm run dist
```

The unsigned NSIS installer is written to `dist/`. Public releases should be code-signed before broad distribution.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports should follow [SECURITY.md](SECURITY.md).

Maintainers can follow [docs/releasing.md](docs/releasing.md) for the GitHub release process.

## License

MIT

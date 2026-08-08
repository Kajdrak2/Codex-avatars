# Codex Avatars

Codex Avatars gives the main task and every Codex subagent an independent animated companion. Characters use the native Codex Pet v2 format and roam directly across one or more displays, with no dock, colored panel, or visible overlay background.

> Project status: version `0.2.0` works locally on Windows and includes a Git-ready plugin marketplace. This checkout does not yet have a configured remote or a published signed binary.

[Lire en français](README.fr.md)

## Features

- A genuinely invisible overlay: only avatars and optional labels are drawn.
- One independent character per `agent_id`, including the main agent.
- Native Codex Pet v2 movement, working, waiting, and completion animations.
- Enable or disable avatars discovered under `~/.codex/pets`.
- Automatically detect avatars created from ChatGPT Work or Codex.
- Roam on every display, selected displays, or an exact custom rectangle.
- Escape passive mode from settings, the Windows tray icon, or `Ctrl+Alt+A`.
- Start on the first Codex session event, with login startup as a fallback.
- Local, metadata-minimized event transport.

## Why a local renderer is still required

The plugin owns the ChatGPT/Codex integration: lifecycle hooks, installation, commands, and avatar creation. Plugin UI runs inside an iframe in ChatGPT, so it cannot create an operating-system window above unrelated applications.

A small local Electron process therefore draws the desktop sprites. The Git workflow below does not distribute a bespoke Codex Avatars executable; it runs the Electron runtime installed in `node_modules`. A `.exe` installer remains an optional future fallback for people who do not want Node.js.

## Install from Git

Requirements: Windows 10/11, Node.js 22 or newer, and a current ChatGPT desktop app with Codex.

```powershell
git clone <repository-url> codex-avatars
cd codex-avatars
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

The setup script installs locked dependencies, registers this checkout as a local Codex marketplace, attempts to install `codex-avatars@codex-avatars-local`, records the source renderer path, and starts it in the background.

Restart ChatGPT, open **Plugins**, choose **Codex Avatars Local**, enable **Codex Avatars**, and trust its lifecycle hooks when prompted. Non-managed hooks intentionally require this review.

Preview the setup without changing anything:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -WhatIf
```

## Use

The overlay intentionally has no panel. Open settings from the **Codex Avatars** icon in the Windows notification area.

- Passive mode makes every click pass through; `Ctrl+Alt+A` always remains available.
- Interactive mode lets you drag individual avatars without blocking the rest of the desktop.
- Select active Pets, avatar size, labels, reduced movement, and automatic activation of new avatars.
- Choose all displays, selected monitors, or a custom `X`, `Y`, width, and height.

## Create an avatar from Work or Codex

After installing the plugin, start a new task with:

```text
Use $create-codex-avatar to create a new Codex Avatars companion.
```

The skill delegates to the official `hatch-pet` workflow, validates a `1536x2288` v2 atlas, and installs `pet.json` beside `spritesheet.webp` under `~/.codex/pets/<pet-id>`. The renderer refreshes that shared library every five seconds.

## Privacy

The hook allowlists only lifecycle name, session/turn/agent ids, agent type, working directory, and tool name when present. Prompts, tool arguments, command output, transcripts, messages, source contents, and secrets are excluded.

Events use the local `codex-avatars-v1` named pipe. There is no TCP listener or remote service.

## Development

```powershell
npm ci
npm test
npm start
npm run start:background
npm run preview
npm run preview:settings
npm run demo
npm run dist
```

`npm run dist` still creates the optional NSIS installer. GitHub releases also package a source/plugin archive.

## Current limitations

- `SubagentStart` and `SubagentStop` expose an individual `agent_id`; tool-use hooks do not. Codex Avatars does not invent per-agent tool attribution.
- A plugin alone cannot draw above the entire Windows desktop; the local renderer is a real platform boundary.
- A broadly distributed optional installer should be code-signed.

See [docs/architecture.md](docs/architecture.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).

## License

MIT

# Codex Avatars

Codex Avatars gives the main task and every Codex subagent an independent animated companion. Characters use the native Codex Pet v2 format and roam directly across one or more displays, with no dock, colored panel, or visible overlay background.

> Project status: version `0.4.1` provides a self-contained Windows installer, a Git-ready plugin marketplace, portable Pet sharing, and bounded dormant-agent display. This checkout does not yet have a configured remote or a published signed binary.

[Lire en français](README.fr.md)

## Features

- A genuinely invisible overlay: only avatars and optional labels are drawn.
- One independent character per `agent_id`, including the main agent.
- Native Codex Pet v2 movement, working, waiting, and completion animations.
- Enable or disable avatars discovered under `~/.codex/pets`.
- Automatically detect avatars created from ChatGPT Work or Codex.
- Roam on every display, selected displays, or an exact custom rectangle.
- Draw custom roaming rectangles directly on the desktop, like a screenshot selection.
- Show each main Codex task title and the real collaboration subtask name, plus optional model and reasoning effort.
- Size main agents and subagents independently.
- Optionally keep recently idle or completed agents visible as stationary sleeping Pets for up to 30 minutes.
- Create a tailored Pet from the settings form in a prefilled Codex task.
- Import and share validated `.codexpet` packages through the local Pet Gallery.
- Escape passive mode from settings, the Windows tray icon, or `Ctrl+Alt+A`.
- Start on the first Codex session event, with login startup as a fallback.
- Local, metadata-minimized event transport.

## Why a local renderer is still required

The plugin owns the ChatGPT/Codex integration: lifecycle hooks, installation, commands, and avatar creation. Plugin UI runs inside an iframe in ChatGPT, so it cannot create an operating-system window above unrelated applications.

A small local Electron process therefore draws the desktop sprites. The installer bundles it as a self-contained companion; end users need neither Node.js, Git, nor a terminal after downloading it.

## Simple installation — recommended

1. Download `Codex Avatars-Setup-0.4.1.exe` from the GitHub release.
2. Run the installer and finish the wizard.
3. On the Codex plugin page that opens, install **Codex Avatars** and review its hooks.

The installer places the companion in the Windows user profile, enables the local hooks immediately, bundles the marketplace and plugin, records the exact renderer path, and opens settings. The final Codex confirmation is intentional: an installer must not accept security-sensitive hooks on the user's behalf.

The current local build is unsigned, so Windows may show SmartScreen until Authenticode signing is configured for publication.

## Install from Git — development

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
- Select active Pets, separate main/subagent sizes, names, model/effort details, dormant-agent display, reduced movement, and automatic activation of newly discovered Pets.
- Choose all displays, selected monitors, or draw a custom area on the desktop.
- Start and stop the synthetic demo from the same button.

## Create an avatar from Work or Codex

Open the character studio in settings, describe the appearance, style, personality, colors, props, and exclusions, then choose **Create in Codex**. The app opens `codex://threads/new` with the full prompt prepared. Because that prefill protocol is currently a desktop implementation detail rather than a published compatibility contract, the app copies the same prompt only if launching Codex fails.

The skill delegates to the official `hatch-pet` workflow, validates a `1536x2288` v2 atlas, and installs `pet.json` beside `spritesheet.webp` under `~/.codex/pets/<pet-id>`. The renderer refreshes that shared library every five seconds.

## Privacy

The hook allowlists only lifecycle name, session/turn/agent ids, agent type, optional agent name/model/effort, and the final project-folder name. The full working-directory path never crosses the bridge. Prompts, tool arguments, command output, transcripts, messages, source contents, and secrets are excluded.

Codex hooks do not currently expose task titles, collaboration task names, models, or effort. To label an avatar accurately, the companion reads the root title from Codex's local `session_index.jsonl`, then correlates each hook `agent_id` with the matching local rollout and extracts only `agent_path`, `model`, and `effort`; it does not copy conversation content into its state or settings.

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

`npm run dist` creates the recommended self-contained installer. GitHub releases also package a source/plugin archive for Git-based development.

## Current limitations

- `SubagentStart` and `SubagentStop` expose an individual `agent_id`; tool-use hooks do not. Codex Avatars does not invent per-agent tool attribution.
- There is no official public Pet marketplace. The built-in Pet Gallery is a safe portable package/import layer suitable for sharing through GitHub or another catalog; see [docs/pet-gallery.md](docs/pet-gallery.md).
- A plugin alone cannot draw above the entire Windows desktop; the local renderer is a real platform boundary.
- A broadly distributed installer should be code-signed to avoid SmartScreen warnings.

See [docs/architecture.md](docs/architecture.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).

## License

MIT

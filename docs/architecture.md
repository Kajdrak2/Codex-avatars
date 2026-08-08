# Architecture

## Product boundary

Codex Avatars is deliberately hybrid:

- the **Codex plugin** supplies lifecycle hooks and the `create-codex-avatar` workflow;
- the **local renderer companion** owns the operating-system overlay, tray controls, settings, and sprite animation.

Plugin UI is hosted inside ChatGPT. It cannot create a global always-on-top window, so the renderer is the smallest honest system component that satisfies desktop roaming.

## Data flow

```text
Codex lifecycle
      |
      | plugin hook; allowlisted metadata only
      v
PowerShell bridge -- starts renderer when absent
      |
      | local named pipe: codex-avatars-v1
      v
Normalizer + agent store
      ^
      | local title index + rollout metadata: labels, model, effort only
      |
      +-------------> normal settings window + Windows tray
      |
      v
fully transparent virtual-desktop BrowserWindow
      |
      v
independent Codex Pet v2 sprite actors
```

## Plugin package

The repo marketplace lives at `.agents/plugins/marketplace.json`; the plugin source lives under `plugins/codex-avatars/`.

- `hooks/hooks.json` subscribes to session, permission, prompt, stop, and subagent lifecycle events.
- `scripts/codex-hook.ps1` forwards only explicit fields. On the first event it can start either the source renderer, a configured packaged companion, or the standard per-user install.
- `skills/create-codex-avatar/` routes avatar creation through `hatch-pet` and the shared Codex Pets directory.

Codex copies installed local plugins into its cache. `install.ps1` therefore stores `CODEX_AVATARS_DEV_ROOT` as a user environment variable so a cached hook can still find a cloned source renderer. Packaged installs instead resolve the companion executable from the install directory.

## Installer package

The NSIS installer is the end-user path. It embeds the repo marketplace and plugin under `resources/integration`, so it does not depend on a clone after installation. Its custom install phase merges standalone lifecycle hooks and registers the exact executable path in the per-user `CODEX_AVATARS_APP` environment value. The custom uninstall phase removes only hooks carrying the Codex Avatars marker and deletes that environment value only when it still points at the uninstalling copy.

The first normal packaged launch shows a four-step guide. Its plugin action opens the bundled marketplace through a `codex://plugins/codex-avatars` deeplink. The user still installs the plugin and reviews its hooks in Codex; this security boundary is intentionally not automated.

## Overlay and control surface

The overlay BrowserWindow covers the resolved union of selected work areas, has an alpha-zero background, and renders only actor nodes. It is separate from the normal settings window.

In passive mode the entire window ignores mouse input. The settings window, tray menu, and global `Ctrl+Alt+A` shortcut are outside that input surface, so passive mode cannot lock the user out. In interactive mode forwarded pointer movement enables input only while the pointer is over an avatar; transparent desktop regions continue to pass clicks through.

The roaming resolver supports:

- all displays;
- an explicit set of display ids;
- one clamped rectangle in virtual-screen coordinates, including negative monitor coordinates, selected through a full-desktop drag surface.

Actors receive deterministic initial display assignments. When more than one zone is active they cycle between zones; changing zones relocates the actor into the target work area before normal movement resumes, avoiding the old constraint loop that pinned actors to the primary display.

## Avatar library

`src/core/avatar-library.cjs` scans the shared `${CODEX_HOME}/pets` directory first and optional bundled assets second. It validates package paths and WebP dimensions before exposing an asset through the private `codex-avatar:` protocol.

V2 sheets use 8 columns, 11 rows, `192x208` cells, and a final size of `1536x2288`. The overlay maps lifecycle state and horizontal velocity to the native idle, directional-running, waving, waiting, working, and review rows.

Personal Pet binaries are never copied into Git. A watcher refreshes the library every five seconds and can automatically enable newly created avatars.

The Pet Gallery exports a constrained `.codexpet` ZIP and stages imports before validation. Only a small allowlist of root files is accepted; existing ids are never overwritten. See `docs/pet-gallery.md`.

## Persistence and privacy

Renderer preferences are stored under Electron's per-user application data directory. No prompt or transcript data is persisted.

The bridge accepts only event name, session id, turn id, agent id, agent type, optional task/model/effort metadata, and a project-folder basename derived inside the hook. The full working-directory path never enters the pipe or renderer state. The named-pipe server limits payload size, ignores malformed data, and never exposes a TCP port.

Current lifecycle hooks expose `agent_id` and `agent_type`, but not the main task title, collaboration task label, configured model, or reasoning effort. The optional metadata resolver reads the root title from `session_index.jsonl`, then matches `agent_id` to the local rollout filename, reads `session_meta` and the first `turn_context`, and returns only the task title, `agent_path`, nickname, model, and effort. Conversation records are not added to the agent store or settings.

## Event accuracy

`SubagentStart` and `SubagentStop` include `agent_id` and `agent_type`, which is enough to create and retire independent actors. Tool-use hook payloads do not currently expose an individual subagent id, so the renderer does not claim per-agent command or file attribution. When rollout enrichment is unavailable, a unique `Agent XXXX` fallback is shown instead of repeating `Default`.

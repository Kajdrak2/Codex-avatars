# Architecture

## Design goals

1. Represent every documented Codex subagent identity independently.
2. Keep all event transport local and metadata-only.
3. Never block or steer a Codex run.
4. Preserve existing Codex configuration.
5. Offer a one-installer path for non-developers and a conventional Git workflow for contributors.

## Components

### Codex lifecycle hook

`scripts/codex-hook.ps1` reads the hook JSON object from standard input, copies only explicitly allowed fields, and sends one compact JSON line to the local named pipe. It exits with code zero even when the overlay is not running.

### Local event bridge

`src/core/pipe-server.cjs` owns the named pipe. It limits each connection to 64 KiB and ignores malformed messages. There is no TCP listener and no remote service.

### Normalizer and store

The normalizer converts Codex event names into a small internal protocol. The store keeps sessions and avatars independent from Electron, which makes lifecycle behavior straightforward to test.

### Electron shell

The Electron main process owns the transparent always-on-top window, the pipe server, global shortcut, launch-at-login option, and hook setup. The sandboxed renderer receives immutable snapshots through a narrow preload API.

## Event accuracy

`SubagentStart` and `SubagentStop` include `agent_id` and `agent_type`, so the app can create and retire independent avatars reliably. The documented `PreToolUse` and `PostToolUse` inputs do not include an individual subagent identifier. The first release does not attribute those tool events to a specific avatar.

## Future adapters

The renderer consumes only the internal session-and-agent snapshot. A later Codex App Server adapter can provide richer thread hierarchy and activity data while leaving the UI and hook adapter intact.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-08-08

### Added

- Optional dormant-agent display for recently idle main agents and completed subagents.
- A distinct stationary sleeping treatment with a dimmed Pet and `Zz` indicator.

### Changed

- Dormant history is bounded to 30 minutes and 50 agents, while the existing completion animation remains visible before sleep.
- The status counter distinguishes active agents from sleeping agents.

## [0.4.0] - 2026-08-08

### Added

- English-first settings with an explicit English/French language menu; generated avatar briefs follow the selected language.
- Four-step first-run guide explaining the overlay, plugin, hook trust, avatar creation, and roaming zones.
- Hatch-pet character brief form that opens a new Codex task with the prompt already prepared, plus a clipboard fallback.
- Portable `.codexpet` gallery packages with validated, non-overwriting import and export.
- Screenshot-style desktop rectangle selection for custom roaming zones.
- Optional model and reasoning-effort details below each agent name.
- Local task metadata enrichment so collaboration labels such as `UX scout` replace the generic `Default` profile.
- Main-agent labels from Codex's local task-title index, with a project/session fallback when no title is available.
- Independent size controls for main agents and subagents, including migration from the former shared size.

### Fixed

- Agents are distributed across selected displays and cycle between zones instead of being pinned to the primary display.
- Demo mode is now a start/stop toggle and always clears its synthetic agents.
- Pets added while the companion was closed are detected by the automatic-enable preference on the next launch.
- Passive mode remains recoverable from settings, the tray icon, and `Ctrl+Alt+A`.

## [0.3.0] - 2026-08-08

### Added

- Self-contained Windows installer with no Node.js or Git requirement for end users.
- Bundled Codex marketplace and plugin, plus a one-click handoff back to the Codex plugin screen.
- Automatic standalone hook activation during installation and reversible cleanup during uninstall.
- Exact packaged-app discovery through the per-user `CODEX_AVATARS_APP` environment value.

- Repo marketplace, Codex lifecycle plugin hooks, and a `create-codex-avatar` skill.
- All-display, selected-display, and custom-rectangle roaming zones.
- Native Codex Pet v2 discovery, selection, animation, and hot refresh.
- Source-based setup that does not require a bespoke application installer.

### Changed

- Split the alpha-zero sprite overlay from the normal settings window.
- Added permanent Windows tray controls and passive-mode recovery.
- Start the local companion from the first Codex lifecycle event when it is absent.
- Expanded validation to 25 automated tests plus overlay and settings captures.

## [0.1.0] - 2026-08-06

### Added

- Transparent Windows overlay with one independent avatar per Codex subagent.
- Main-session and multi-project grouping.
- Working, waiting, attention, completion, and exit states.
- Metadata-only local transport over a Windows named pipe.
- Non-destructive Codex hook installation, backup, status, and removal.
- Automatic hook cleanup from the Windows uninstaller.
- Passive click-through mode and launch-at-login option.
- French and English interface copy and documentation.
- Demo mode, unit tests, privacy tests, NSIS packaging, and GitHub release workflow.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.7] - 2026-08-08

### Changed

- Avatar creation now invokes `$hatch-pet` directly and reserves an explicit chroma-key color before image generation, preventing rainbow palettes from colliding with the background key.

## [0.4.6] - 2026-08-08

### Fixed

- "Show names" and "Show model + effort" now control independent overlay lines, including collision spacing and label height.

## [0.4.5] - 2026-08-08

### Fixed

- Gallery previews again use the app's direct atlas delivery path, avoiding the blank packaged-Windows thumbnails caused by native-image decoding.

### Changed

- The generated avatar request and Codex Avatar skill now define completion as final independent QA plus installation of both Pet files, rather than atlas assembly alone.

## [0.4.4] - 2026-08-08

### Fixed

- Pet cards select the most opaque sprite cell in the real atlas, rather than relying on an animation frame which may legitimately be transparent.
- Autonomous avatars now follow shared screen edges and intermediary monitors from the Windows display arrangement instead of jumping directly to another screen.
- Dragging retains pointer capture through release or cancellation, including across an adjacent screen edge; manual placement can cross monitors without snapping back.

## [0.4.3] - 2026-08-08

### Added

- A persistent enable/disable button in settings and a matching tray action that hides every avatar without stopping the companion process.

### Changed

- Main-agent and subagent size sliders now preview directly on the desktop while they are dragged and persist only when the change is committed.
- Avatar creation now explicitly invokes `$hatch-pet`, resolves the bundled Codex workspace runtime before any Python command, and verifies Pillow instead of falling back to a system interpreter.

### Fixed

- Multi-monitor overlay windows now bootstrap on one work area and expand after renderer startup, avoiding the Windows clamp that silently reduced a virtual-desktop window to one monitor.
- The screenshot-style custom-zone selector now spans the real virtual desktop, including displays with negative coordinates, so a zone can be drawn on a non-primary monitor.

## [0.4.2] - 2026-08-08

### Fixed

- Renamed Codex task titles now replace main-agent fallback labels immediately, without waiting for another lifecycle event or an app restart.
- Concurrent title reads are ordered so an older cached result cannot overwrite a newer rename.

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

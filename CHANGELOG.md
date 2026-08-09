# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-08-09

### Added

- Merged the controlled `Kajdrak2/awesome-codex-pet` fork with the original Awesome Codex Pet catalog. The fork wins matching ids and exact spritesheet hashes, while genuinely different variants and original-only Pets remain available.
- Added a visible **Bug report / Suggestion** button. It offers a localized native choice, then opens a fixed project GitHub URL with a structured draft and the running app version already filled in; repository visitors also receive guided issue forms.
- Integrated the open Awesome Codex Pet catalog as a searchable, category-filtered V2 marketplace with cached previews and one-button local installation.
- Added an in-app V2 Pet submission form with full-atlas review, provenance and license fields, fresh duplicate checks, official GitHub browser authentication, and one consent-gated ready-for-review pull request—without opening Codex or spending Codex credits.
- Fixed first-time GitHub authentication by advancing the browser flow, copying the device code through GitHub CLI, reusing an existing CLI session when available, and making connection attempts cancellable.
- The submission dialog remains dismissible during GitHub connection, defaults the author to the connected GitHub login, and generates an editable canonical key from category, author, and Pet id.
- Added a localized **Report** action to every marketplace Pet. It collects a fixed reason and bounded explanation, then opens a prefilled public GitHub issue with verified catalog metadata for the user to review and submit.

### Changed

- Focused Pet submissions now publish automatically after the protected catalog checks pass for the exact pull-request commit; draft, failed, stale, or unrelated revisions remain unmerged.

### Fixed

- Marketplace entries without a generated public preview now fall back to their integrity-checked V2 WebP atlas, cropped to one frame directly by Chromium instead of relying on Electron's unavailable Windows WebP decoder.
- Direct Pet submissions now generate Prettier-compatible catalog JSON, so a valid Pet no longer fails CI only because a short tags array was expanded across multiple lines.
- Repeating a submission updates the newest matching open pull request instead of creating another public branch and duplicate pull request.
- Direct in-app Pet submissions now target the controlled catalog fork. Its owner can publish the submission branch directly; other contributors stay compatible through any fork in the original GitHub repository network.
- Catalog sources are fetched and cached independently, so one unavailable repository no longer hides the other source. V1 single-source caches migrate safely to the new merged cache.
- GitHub device authentication now shows the one-time code in a prominent in-app panel with dedicated **Copy code** and **Open GitHub** actions; the browser action cannot be used before a code exists.
- Continuously reconciles active root tasks and subagents from their local rollout state, so concurrent projects missed by a resume hook appear within about two seconds without reviving completed tasks.
- GitHub browser authentication now waits for the one-time device code before advancing the CLI prompt, opens the device page from the app, keeps a manual **Open GitHub** action available, and checks existing sessions in parallel.
- The submission author is filled from the connected GitHub login and remembered locally; the canonical key is generated immediately even before the first connection, with the author added for original characters.
- Removed the redundant always-required provenance textarea. Original and independently generated Pets receive accurate source notes automatically; reuse and attribution details appear only for source types that need them.

### Security

- Marketplace Pet assets can only resolve to the two fixed catalog repositories, and source-specific details links are resolved from the validated catalog record instead of being constructed by the renderer.
- Marketplace downloads are restricted to the expected repository and paths, size-limited, checked against the catalog SHA-256 and byte counts, validated as native `1536x2288` V2 atlases, and installed atomically without overwriting a conflicting local Pet.
- The renderer retains its no-network CSP; catalog, thumbnail, and Pet downloads run only in the sandboxed application bridge and cached data is schema-validated before use.
- A missing GitHub CLI is fetched only from an official pinned release and must match hard-coded archive and executable SHA-256 values. GitHub tokens remain owned by the CLI credential flow, ambient token variables are stripped, API routes are fixed, and no public branch or pull request is created before a native confirmation.
- Pet reports reconstruct their source from an allowlisted catalog record, accept only fixed reasons and bounded text, and open a fixed public GitHub issue URL without background submission.

## [0.6.7] - 2026-08-08

### Fixed

- Added regression coverage for the dormant-session lifecycle guard so a delayed terminal hook cannot revive an expired avatar.

## [0.6.6] - 2026-08-08

### Fixed

- Delayed terminal hooks can no longer recreate a dormant avatar after its retention period has elapsed.

## [0.6.5] - 2026-08-08

### Fixed

- SessionEnd hooks omit an explicit timeout to avoid a Codex validator warning at its own three-second limit.
- A restarted companion immediately reconstructs recently active Codex roots and subagents from local rollout metadata.

## [0.6.4] - 2026-08-08

### Fixed

- Codex lifecycle hooks now declare the supported three-second timeout, avoiding startup warnings.
- Login-item registration explicitly targets the installed executable, and metadata retries no longer delay a restarted overlay for more than a fraction of a second.

## [0.6.3] - 2026-08-08

### Fixed

- In-app update checks accept the GitHub-normalized installer name and releases also include the legacy filename required by version 0.5.0.

## [0.6.2] - 2026-08-08

### Fixed

- Release assets now keep the exact Windows installer filename used by the in-app update checker.

## [0.6.1] - 2026-08-08

### Fixed

- GitHub Actions release builds no longer attempt Electron Builder's implicit secondary publish without a token.

## [0.6.0] - 2026-08-08

### Changed

- Avatar creation tasks now begin with `/goal`, keeping Hatch Pet repairs active until the fully reviewed Pet v2 package is installed.

## [0.5.2] - 2026-08-08

### Fixed

- Release validation now tracks the packaged plugin version correctly.

## [0.5.1] - 2026-08-08

### Fixed

- Model and effort labels now refresh from the latest local Codex turn context and retain any newer values supplied directly by lifecycle events.

## [0.5.0] - 2026-08-08

### Added

- Packaged Windows installations check the stable GitHub Release on startup and offer the matching newer installer through a native confirmation dialog.

## [0.4.9] - 2026-08-08

### Fixed

- Pets now match their main agent by default, including its subagents. A new setting switches to a stable shuffled rotation, where every active Pet is used once before an assignment repeats.

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

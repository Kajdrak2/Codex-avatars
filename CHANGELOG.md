# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repo marketplace, Codex lifecycle plugin hooks, and a `create-codex-avatar` skill.
- All-display, selected-display, and custom-rectangle roaming zones.
- Native Codex Pet v2 discovery, selection, animation, and hot refresh.
- Source-based setup that does not require a bespoke application installer.

### Changed

- Split the alpha-zero sprite overlay from the normal settings window.
- Added permanent Windows tray controls and passive-mode recovery.
- Start the local companion from the first Codex lifecycle event when it is absent.
- Expanded validation to 21 automated tests plus overlay and settings captures.

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

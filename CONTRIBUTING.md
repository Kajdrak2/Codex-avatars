# Contributing

Thanks for helping make Codex Avatars better.

1. Open an issue before a large behavior or protocol change.
2. Keep hook payloads metadata-only. Never add prompt, transcript, source-code, tool-input, or tool-output forwarding.
3. Preserve existing Codex hook configuration during install and uninstall.
4. Run `npm test` before opening a pull request.
5. Keep settings keyboard-accessible, preserve tray and shortcut recovery, and respect reduced-motion settings.
6. Keep personal Pet packages out of Git; tests should use fixtures or a local library discovered at runtime.

Use conventional, focused commits. A pull request should explain the visible behavior, privacy impact, and how it was tested.

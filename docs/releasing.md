# Releasing Codex Avatars

## Before the first public release

1. Create the GitHub repository and add it as `origin`.
2. Replace the generic clone URL in both READMEs with the real repository URL.
3. Treat the self-contained Windows installer as the primary end-user distribution and the Git/plugin bundle as the developer distribution.
4. Configure Windows code-signing secrets before promoting the installer broadly.
5. Confirm matching versions in `package.json`, `package-lock.json`, and `plugins/codex-avatars/.codex-plugin/plugin.json`.
6. Review every bundled hook and ensure the trust prompt describes the final command hash.

## Local verification

```powershell
npm ci
npm test
npm audit --omit=dev
npm run preview
npm run preview:settings
powershell -ExecutionPolicy Bypass -File .\install.ps1 -WhatIf
npm run dist
```

Also run the `skill-creator` quick validator on `plugins/codex-avatars/skills/create-codex-avatar` and the `plugin-creator` validator on `plugins/codex-avatars`.

Confirm that `dist/win-unpacked/resources/integration` contains the marketplace and plugin, then test the unpacked executable at `dist/win-unpacked/Codex Avatars.exe`. Use a temporary `CODEX_HOME` for standalone hook merge tests; do not mutate a maintainer's real hook configuration during release validation.

## Publish through GitHub Actions

```powershell
git tag v0.4.4
git push origin main
git push origin v0.4.4
```

The tag runs tests, builds the self-contained NSIS installer, creates a source/plugin zip with `git archive`, generates SHA-256 checksums, uploads the workflow artifact, and attaches both distribution forms to the GitHub Release.

## Marketplace and plugin directory

The repo archive already contains `.agents/plugins/marketplace.json` and `plugins/codex-avatars/`. Test a tagged checkout as a fresh marketplace source before submission. Public plugin submission must not claim that iframe UI can render the operating-system overlay; the local companion requirement must remain explicit.

## Signing

The current local preview is unsigned. Configure an Authenticode certificate through the supported electron-builder signing environment before broad Windows-installer distribution. Never commit a certificate or password.

# Releasing Codex Avatars

## Before the first public release

1. Create an empty GitHub repository.
2. Add it as the local `origin` remote.
3. Configure Windows code-signing secrets for the release workflow when broad distribution begins.
4. Replace any placeholder repository links in documentation.
5. Confirm the version in `package.json` and `CHANGELOG.md`.

## Local verification

```powershell
npm ci
npm test
npm audit --omit=dev
npm run preview
npm run dist
```

Test the unpacked executable at `dist/win-unpacked/Codex Avatars.exe`. Do not test hook merging against a real user configuration when a temporary `CODEX_HOME` directory will do.

## Publish through GitHub Actions

```powershell
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

The tag starts the Windows release workflow. It runs the test suite, creates the NSIS installer, generates `SHA256SUMS.txt`, uploads a workflow artifact, and attaches the installer files to a GitHub Release.

## Signing

The current local preview is unsigned. Before promoting downloads to a broad audience, configure an Authenticode certificate through the supported electron-builder signing environment. Never commit a certificate or its password to Git.

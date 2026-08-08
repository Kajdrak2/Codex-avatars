'use strict';

const RELEASES_URL = 'https://api.github.com/repos/Kajdrak2/Codex-avatars/releases/latest';

function versionParts(value) {
  const match = String(value || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  if (!leftParts || !rightParts) return null;
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function parseLatestRelease(release, currentVersion) {
  if (!release || typeof release !== 'object' || release.draft || release.prerelease) return null;
  const version = String(release.tag_name || '').replace(/^v/i, '');
  const comparison = compareVersions(version, currentVersion);
  if (comparison === null || comparison <= 0) return null;
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const installerNames = new Set([
    `Codex Avatars-Setup-${version}.exe`,
    `Codex.Avatars-Setup-${version}.exe`,
  ].map((name) => name.toLowerCase()));
  const installer = assets.find((asset) => installerNames.has(String(asset?.name || '').toLowerCase()));
  const downloadUrl = typeof installer?.browser_download_url === 'string' ? installer.browser_download_url : null;
  if (!downloadUrl || !downloadUrl.startsWith('https://')) return null;
  return { version, downloadUrl };
}

async function checkForUpdate({ currentVersion, fetchImpl = globalThis.fetch, signal } = {}) {
  if (typeof fetchImpl !== 'function') return null;
  const response = await fetchImpl(RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Codex-Avatars' },
    signal,
  });
  if (!response.ok) return null;
  return parseLatestRelease(await response.json(), currentVersion);
}

module.exports = { RELEASES_URL, checkForUpdate, compareVersions, parseLatestRelease };

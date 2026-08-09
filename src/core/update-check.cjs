'use strict';

const RELEASES_URL = 'https://api.github.com/repos/Kajdrak2/Codex-avatars/releases/latest';

function versionParts(value) {
  const match = String(value || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
  if (!match) return null;
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  if (!leftParts || !rightParts) return null;
  for (let index = 0; index < leftParts.core.length; index += 1) {
    if (leftParts.core[index] !== rightParts.core[index]) return leftParts.core[index] - rightParts.core[index];
  }
  if (leftParts.prerelease.length === 0 && rightParts.prerelease.length === 0) return 0;
  if (leftParts.prerelease.length === 0) return 1;
  if (rightParts.prerelease.length === 0) return -1;
  const length = Math.max(leftParts.prerelease.length, rightParts.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts.prerelease[index];
    const rightPart = rightParts.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return leftPart.localeCompare(rightPart);
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

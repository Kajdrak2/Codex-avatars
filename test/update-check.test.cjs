'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RELEASES_URL, checkForUpdate, compareVersions, parseLatestRelease } = require('../src/core/update-check.cjs');

test('compares three-part release versions', () => {
  assert.equal(compareVersions('0.5.0', '0.4.9'), 1);
  assert.equal(compareVersions('v0.4.9', '0.4.9'), 0);
  assert.equal(compareVersions('preview', '0.4.9'), null);
});

test('accepts a newer stable GitHub release and its installer asset', () => {
  const update = parseLatestRelease({
    tag_name: 'v0.5.0', html_url: 'https://github.com/Kajdrak2/Codex-avatars/releases/tag/v0.5.0',
    assets: [{ name: 'Codex Avatars-Setup-0.5.0.exe', browser_download_url: 'https://example.test/setup.exe' }],
  }, '0.4.9');
  assert.deepEqual(update, {
    version: '0.5.0', downloadUrl: 'https://example.test/setup.exe',
  });
});

test('ignores older, draft, and prerelease releases', () => {
  assert.equal(parseLatestRelease({ tag_name: 'v0.4.9', html_url: 'https://example.test' }, '0.4.9'), null);
  assert.equal(parseLatestRelease({ tag_name: 'v0.5.0', draft: true, html_url: 'https://example.test' }, '0.4.9'), null);
  assert.equal(parseLatestRelease({ tag_name: 'v0.5.0', prerelease: true, html_url: 'https://example.test' }, '0.4.9'), null);
});

test('requires the exact HTTPS installer asset for the tagged version', () => {
  assert.equal(parseLatestRelease({
    tag_name: 'v0.5.0', assets: [{ name: 'Codex Avatars-Setup-0.4.9.exe', browser_download_url: 'https://example.test/setup.exe' }],
  }, '0.4.9'), null);
  assert.equal(parseLatestRelease({
    tag_name: 'v0.5.0', assets: [{ name: 'Codex Avatars-Setup-0.5.0.exe', browser_download_url: 'http://example.test/setup.exe' }],
  }, '0.4.9'), null);
});

test('checks the fixed public release endpoint without throwing on an HTTP failure', async () => {
  let receivedUrl = null;
  const update = await checkForUpdate({
    currentVersion: '0.4.9',
    fetchImpl: async (url) => { receivedUrl = url; return { ok: false }; },
  });
  assert.equal(receivedUrl, RELEASES_URL);
  assert.equal(update, null);
});

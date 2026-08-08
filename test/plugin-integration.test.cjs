'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  integrationRoot,
  marketplacePath,
  pluginDeepLink,
} = require('../src/core/plugin-integration.cjs');

test('resolves the bundled marketplace from the packaged resources directory', () => {
  const options = {
    isPackaged: true,
    resourcesPath: 'C:\\Program Files\\Codex Avatars\\resources',
    appPath: 'C:\\source',
  };

  assert.equal(
    integrationRoot(options),
    path.join(options.resourcesPath, 'integration'),
  );
  assert.equal(
    marketplacePath(options),
    path.join(options.resourcesPath, 'integration', '.agents', 'plugins', 'marketplace.json'),
  );
});

test('builds a Codex deeplink without losing spaces or Windows separators', () => {
  const source = 'C:\\Program Files\\Codex Avatars\\resources\\integration\\.agents\\plugins\\marketplace.json';
  const url = new URL(pluginDeepLink(source));

  assert.equal(url.protocol, 'codex:');
  assert.equal(url.hostname, 'plugins');
  assert.equal(url.pathname, '/codex-avatars');
  assert.equal(url.searchParams.get('marketplacePath'), path.resolve(source));
  assert.equal(url.searchParams.has('mode'), false);
});

test('adds share mode only when explicitly requested', () => {
  const url = new URL(pluginDeepLink('C:\\marketplace.json', 'share'));
  assert.equal(url.searchParams.get('mode'), 'share');
});

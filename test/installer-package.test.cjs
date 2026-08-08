'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('NSIS installer bundles the plugin and invokes reversible integration hooks', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const resources = new Map(manifest.build.extraResources.map((entry) => [entry.from, entry.to]));
  const installer = fs.readFileSync(path.join(root, manifest.build.nsis.include), 'utf8');

  assert.equal(resources.get('.agents'), 'integration/.agents');
  assert.equal(resources.get('plugins'), 'integration/plugins');
  assert.match(installer, /!macro customInstall/);
  assert.match(installer, /--install-hooks/);
  assert.match(installer, /!macro customUnInstall/);
  assert.match(installer, /--uninstall-hooks/);
  assert.match(installer, /CODEX_AVATARS_APP/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { discoverAvatars, readAvatarPackage, readWebpDimensions } = require('../src/core/avatar-library.cjs');

async function makePet(root, id, manifest = {}) {
  const directory = path.join(root, id);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'pet.json'), JSON.stringify({
    id,
    displayName: id.toUpperCase(),
    spriteVersionNumber: 2,
    spritesheetPath: 'spritesheet.webp',
    ...manifest,
  }));
  await fs.writeFile(path.join(directory, 'spritesheet.webp'), 'sprite');
  return directory;
}

test('reads the Codex v2 pet contract', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-pet-'));
  const directory = await makePet(root, 'minuit');
  const avatar = await readAvatarPackage(directory, 'codex-pet');
  assert.equal(avatar.spriteVersionNumber, 2);
  assert.equal(avatar.rows, 11);
  assert.equal(avatar.displayName, 'MINUIT');
  await fs.rm(root, { recursive: true, force: true });
});

test('prefers the first root when pet ids collide', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-roots-'));
  const user = path.join(root, 'user');
  const bundled = path.join(root, 'bundled');
  await makePet(user, 'same', { displayName: 'User pet' });
  await makePet(bundled, 'same', { displayName: 'Bundled pet' });
  const result = await discoverAvatars([
    { path: user, source: 'codex-pet' },
    { path: bundled, source: 'bundled' },
  ]);
  assert.equal(result.avatars.length, 1);
  assert.equal(result.avatars[0].displayName, 'User pet');
  await fs.rm(root, { recursive: true, force: true });
});

test('reads dimensions from an extended WebP header', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-webp-'));
  const filePath = path.join(root, 'atlas.webp');
  const data = Buffer.alloc(30);
  data.write('RIFF', 0, 'ascii');
  data.writeUInt32LE(22, 4);
  data.write('WEBPVP8X', 8, 'ascii');
  data.writeUInt32LE(10, 16);
  const width = 1536 - 1;
  const height = 2288 - 1;
  data[24] = width & 0xff;
  data[25] = (width >> 8) & 0xff;
  data[26] = (width >> 16) & 0xff;
  data[27] = height & 0xff;
  data[28] = (height >> 8) & 0xff;
  data[29] = (height >> 16) & 0xff;
  await fs.writeFile(filePath, data);
  assert.deepEqual(await readWebpDimensions(filePath), { width: 1536, height: 2288 });
  await fs.rm(root, { recursive: true, force: true });
});

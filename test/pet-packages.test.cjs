'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { readAvatarPackage } = require('../src/core/avatar-library.cjs');
const { exportPetPackage, importPetPackage, readArchiveEntries } = require('../src/core/pet-packages.cjs');

function webpHeader(width = 1536, height = 2288) {
  const data = Buffer.alloc(30);
  data.write('RIFF', 0, 'ascii'); data.writeUInt32LE(22, 4); data.write('WEBPVP8X', 8, 'ascii'); data.writeUInt32LE(10, 16);
  const w = width - 1; const h = height - 1;
  data[24] = w & 0xff; data[25] = (w >> 8) & 0xff; data[26] = (w >> 16) & 0xff;
  data[27] = h & 0xff; data[28] = (h >> 8) & 0xff; data[29] = (h >> 16) & 0xff;
  return data;
}

test('exports and imports a portable Pet without overwriting an existing id', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-package-'));
  const source = path.join(root, 'source', 'minuit');
  const destination = path.join(root, 'pets');
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(path.join(source, 'pet.json'), JSON.stringify({ id: 'minuit', displayName: 'Minuit', spriteVersionNumber: 2, spritesheetPath: 'spritesheet.webp' }));
  await fs.writeFile(path.join(source, 'spritesheet.webp'), webpHeader());
  const record = await readAvatarPackage(source, 'codex-pet');
  const archive = path.join(root, 'minuit.codexpet');
  await exportPetPackage(record, archive);
  const first = await importPetPackage(archive, destination);
  const second = await importPetPackage(archive, destination);
  assert.equal(first.id, 'minuit');
  assert.equal(second.id, 'minuit-2');
  assert.equal(JSON.parse(await fs.readFile(path.join(destination, 'minuit-2', 'pet.json'), 'utf8')).id, 'minuit-2');
  await fs.rm(root, { recursive: true, force: true });
});

test('rejects an invalid atlas and leaves no destination behind', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-bad-package-'));
  const archivePath = path.join(root, 'bad.codexpet');
  const archive = new AdmZip();
  archive.addFile('pet.json', Buffer.from(JSON.stringify({ id: 'bad', displayName: 'Bad', spriteVersionNumber: 2, spritesheetPath: 'spritesheet.webp' })));
  archive.addFile('spritesheet.webp', webpHeader(100, 100));
  archive.writeZip(archivePath);
  await assert.rejects(importPetPackage(archivePath, path.join(root, 'pets')), /1536/);
  const entries = await fs.readdir(path.join(root, 'pets'));
  assert.deepEqual(entries, []);
  await fs.rm(root, { recursive: true, force: true });
});

test('rejects nested and case-duplicate archive entries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-unsafe-package-'));
  const nestedPath = path.join(root, 'nested.zip');
  const nested = new AdmZip();
  nested.addFile('folder/pet.json', Buffer.from('{}'));
  nested.writeZip(nestedPath);
  assert.throws(() => readArchiveEntries(nestedPath), /Unsafe archive entry/);

  const duplicatePath = path.join(root, 'duplicate.zip');
  const duplicate = new AdmZip();
  duplicate.addFile('pet.json', Buffer.from('{}'));
  duplicate.addFile('PET.JSON', Buffer.from('{}'));
  duplicate.writeZip(duplicatePath);
  assert.throws(() => readArchiveEntries(duplicatePath), /Duplicate archive entry/);
  await fs.rm(root, { recursive: true, force: true });
});

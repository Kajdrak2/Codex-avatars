'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const AdmZip = require('adm-zip');
const { readAvatarPackage, readWebpDimensions } = require('./avatar-library.cjs');

const MAX_ARCHIVE_BYTES = 80 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 120 * 1024 * 1024;
const ALLOWED_FILES = new Set(['license', 'license.md', 'pet.json', 'readme.md', 'share.json', 'spritesheet.webp']);

function safePackageId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(id)) throw new Error('The Pet package has an invalid id.');
  return id;
}

function normalizedEntryName(entry) {
  const name = String(entry.entryName || '').replace(/\\/g, '/');
  if (!name || name.startsWith('/') || name.includes('../') || name.includes('/')) {
    throw new Error(`Unsafe archive entry: ${name || '(empty)'}`);
  }
  return name;
}

async function availableDestination(petRoot, requestedId) {
  let id = requestedId;
  for (let index = 2; index < 10_000; index += 1) {
    try {
      await fs.access(path.join(petRoot, id));
      id = `${requestedId}-${index}`;
    } catch (error) {
      if (error.code === 'ENOENT') return { id, path: path.join(petRoot, id) };
      throw error;
    }
  }
  throw new Error('Could not allocate a destination for this Pet.');
}

function readArchiveEntries(archivePath) {
  const archive = new AdmZip(archivePath);
  const files = new Map();
  let totalSize = 0;
  for (const entry of archive.getEntries()) {
    if (entry.isDirectory) continue;
    const name = normalizedEntryName(entry);
    const key = name.toLowerCase();
    if (!ALLOWED_FILES.has(key)) throw new Error(`Unsupported archive entry: ${name}`);
    if (files.has(key)) throw new Error(`Duplicate archive entry: ${name}`);
    totalSize += Number(entry.header?.size || 0);
    if (totalSize > MAX_UNCOMPRESSED_BYTES) throw new Error('The Pet package is too large after extraction.');
    files.set(key, entry.getData());
  }
  return files;
}

async function importPetPackage(archivePath, petRoot) {
  const stat = await fs.stat(archivePath);
  if (!stat.isFile()) throw new Error('The selected Pet package is not a file.');
  if (stat.size > MAX_ARCHIVE_BYTES) throw new Error('The selected Pet package is too large.');

  const files = readArchiveEntries(archivePath);
  if (!files.has('pet.json') || !files.has('spritesheet.webp')) {
    throw new Error('A Pet package must contain pet.json and spritesheet.webp.');
  }

  let manifest;
  try {
    manifest = JSON.parse(files.get('pet.json').toString('utf8'));
  } catch {
    throw new Error('The Pet manifest is not valid JSON.');
  }
  const requestedId = safePackageId(manifest.id);
  if (Number(manifest.spriteVersionNumber) !== 2) throw new Error('Only Codex Pet v2 packages can be imported.');

  await fs.mkdir(petRoot, { recursive: true });
  const stagingPath = path.join(petRoot, `.codex-avatars-import-${randomUUID()}`);
  let committed = false;
  try {
    await fs.mkdir(stagingPath);
    const destination = await availableDestination(petRoot, requestedId);
    manifest = { ...manifest, id: destination.id, spritesheetPath: 'spritesheet.webp', spriteVersionNumber: 2 };
    await fs.writeFile(path.join(stagingPath, 'pet.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await fs.writeFile(path.join(stagingPath, 'spritesheet.webp'), files.get('spritesheet.webp'));
    for (const [name, outputName] of [['readme.md', 'README.md'], ['license.md', 'LICENSE.md'], ['license', 'LICENSE']]) {
      if (files.has(name)) await fs.writeFile(path.join(stagingPath, outputName), files.get(name));
    }

    const record = await readAvatarPackage(stagingPath, 'codex-pet');
    const dimensions = await readWebpDimensions(record.spritesheetPath);
    if (!dimensions || dimensions.width !== 1536 || dimensions.height !== 2288) {
      throw new Error('The Pet v2 spritesheet must be a readable 1536 × 2288 WebP atlas.');
    }
    await fs.rename(stagingPath, destination.path);
    committed = true;
    return { id: destination.id, displayName: record.displayName, directory: destination.path };
  } finally {
    if (!committed) await fs.rm(stagingPath, { recursive: true, force: true });
  }
}

async function writeZip(archive, destinationPath) {
  await new Promise((resolve, reject) => {
    archive.writeZip(destinationPath, (error) => (error ? reject(error) : resolve()));
  });
}

async function exportPetPackage(record, destinationPath) {
  if (!record?.manifestPath || !record?.spritesheetPath) throw new Error('The selected Pet cannot be exported.');
  if (record.spriteVersionNumber !== 2) throw new Error('Only Codex Pet v2 packages can be shared.');
  const manifest = JSON.parse(await fs.readFile(record.manifestPath, 'utf8'));
  const archive = new AdmZip();
  const portableManifest = {
    ...manifest,
    id: safePackageId(record.id),
    spritesheetPath: 'spritesheet.webp',
    spriteVersionNumber: 2,
  };
  archive.addFile('share.json', Buffer.from(`${JSON.stringify({
    format: 'codex-pet-package',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    id: record.id,
  }, null, 2)}\n`, 'utf8'));
  archive.addFile('pet.json', Buffer.from(`${JSON.stringify(portableManifest, null, 2)}\n`, 'utf8'));
  archive.addLocalFile(record.spritesheetPath, '', 'spritesheet.webp');

  for (const candidate of ['README.md', 'LICENSE.md', 'LICENSE']) {
    const filePath = path.join(record.directory, candidate);
    try {
      const fileStat = await fs.stat(filePath);
      if (fileStat.isFile() && fileStat.size <= 2 * 1024 * 1024) archive.addLocalFile(filePath, '', candidate);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  await writeZip(archive, destinationPath);
  return destinationPath;
}

module.exports = {
  ALLOWED_FILES,
  MAX_ARCHIVE_BYTES,
  exportPetPackage,
  importPetPackage,
  readArchiveEntries,
  safePackageId,
};

'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function isInsideDirectory(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function readAvatarPackage(directory, source = 'custom') {
  const manifestPath = path.join(directory, 'pet.json');
  const sourceText = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(sourceText);
  const id = typeof manifest.id === 'string' ? manifest.id.trim() : '';
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(id)) {
    throw new Error(`Invalid pet id in ${manifestPath}`);
  }

  const spritesheetName = typeof manifest.spritesheetPath === 'string'
    ? manifest.spritesheetPath
    : 'spritesheet.webp';
  const spritesheetPath = path.resolve(directory, spritesheetName);
  if (!isInsideDirectory(path.resolve(directory), spritesheetPath)) {
    throw new Error(`Spritesheet escapes pet directory: ${manifestPath}`);
  }

  const stat = await fs.stat(spritesheetPath);
  if (!stat.isFile()) throw new Error(`Missing spritesheet for ${id}`);

  const spriteVersionNumber = Number(manifest.spriteVersionNumber) === 2 ? 2 : 1;
  return {
    id,
    displayName: typeof manifest.displayName === 'string' && manifest.displayName.trim()
      ? manifest.displayName.trim()
      : id,
    description: typeof manifest.description === 'string' ? manifest.description.trim() : '',
    spriteVersionNumber,
    columns: 8,
    rows: spriteVersionNumber === 2 ? 11 : 9,
    source,
    directory: path.resolve(directory),
    manifestPath,
    spritesheetPath,
    modifiedAt: stat.mtimeMs,
  };
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

async function readWebpDimensions(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(256);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const data = buffer.subarray(0, bytesRead);
    if (data.length < 30 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
      return null;
    }

    let offset = 12;
    while (offset + 8 <= data.length) {
      const type = data.toString('ascii', offset, offset + 4);
      const length = data.readUInt32LE(offset + 4);
      const payload = offset + 8;
      if (type === 'VP8X' && payload + 10 <= data.length) {
        return {
          width: readUInt24LE(data, payload + 4) + 1,
          height: readUInt24LE(data, payload + 7) + 1,
        };
      }
      if (type === 'VP8L' && payload + 5 <= data.length && data[payload] === 0x2f) {
        const b1 = data[payload + 1];
        const b2 = data[payload + 2];
        const b3 = data[payload + 3];
        const b4 = data[payload + 4];
        return {
          width: 1 + b1 + ((b2 & 0x3f) << 8),
          height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
        };
      }
      if (type === 'VP8 ' && payload + 10 <= data.length
        && data[payload + 3] === 0x9d && data[payload + 4] === 0x01 && data[payload + 5] === 0x2a) {
        return {
          width: data.readUInt16LE(payload + 6) & 0x3fff,
          height: data.readUInt16LE(payload + 8) & 0x3fff,
        };
      }
      offset = payload + length + (length % 2);
    }
    return null;
  } finally {
    await handle.close();
  }
}

async function discoverAvatars(roots) {
  const avatars = new Map();
  const errors = [];

  for (const root of roots || []) {
    if (!root?.path) continue;
    let entries;
    try {
      entries = await fs.readdir(root.path, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') errors.push({ path: root.path, message: error.message });
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      try {
        const avatar = await readAvatarPackage(path.join(root.path, entry.name), root.source || 'custom');
        if (!avatars.has(avatar.id)) avatars.set(avatar.id, avatar);
      } catch (error) {
        errors.push({ path: path.join(root.path, entry.name), message: error.message });
      }
    }
  }

  return {
    avatars: [...avatars.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    errors,
  };
}

module.exports = {
  discoverAvatars,
  isInsideDirectory,
  readAvatarPackage,
  readWebpDimensions,
};

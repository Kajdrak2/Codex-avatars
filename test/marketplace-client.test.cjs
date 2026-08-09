'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  CATALOG_SOURCES,
  MarketplaceClient,
  ORIGINAL_CATALOG_REPOSITORY,
  PRIMARY_CATALOG_REPOSITORY,
  mergeCatalogs,
  normalizeCatalog,
  rawPetUrl,
  responseBuffer,
  sha256,
} = require('../src/core/marketplace-client.cjs');

function webpHeader(marker = 0, width = 1536, height = 2288) {
  const data = Buffer.alloc(31);
  data.write('RIFF', 0, 'ascii'); data.writeUInt32LE(23, 4); data.write('WEBPVP8X', 8, 'ascii'); data.writeUInt32LE(10, 16);
  const w = width - 1; const h = height - 1;
  data[24] = w & 0xff; data[25] = (w >> 8) & 0xff; data[26] = (w >> 16) & 0xff;
  data[27] = h & 0xff; data[28] = (h >> 8) & 0xff; data[29] = (h >> 16) & 0xff;
  data[30] = marker;
  return data;
}

function asset(slug, name, marker) {
  const petJson = Buffer.from(JSON.stringify({
    id: slug,
    displayName: name,
    spriteVersionNumber: 2,
    spritesheetPath: 'spritesheet.webp',
  }));
  return { petJson, spritesheet: webpHeader(marker) };
}

function installRecord(name, files, overrides = {}) {
  return {
    name,
    spriteVersionNumber: 2,
    petJsonSha256: sha256(files.petJson),
    petJsonBytes: files.petJson.length,
    spritesheetSha256: sha256(files.spritesheet),
    spritesheetBytes: files.spritesheet.length,
    spritesheetWidth: 1536,
    spritesheetHeight: 2288,
    ...overrides,
  };
}

function metadata(slug, name, canonicalKey, author = 'Tester') {
  return {
    slug,
    name,
    author,
    author_handle: author.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    author_url: `https://github.com/${author.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    primary_category: 'Animals',
    collections: ['forest-friends'],
    canonical_key: canonicalKey,
    license: 'Non-commercial use only.',
    description: `${name} description.`,
    spriteVersionNumber: 2,
  };
}

function fixture() {
  const sharedFox = asset('tiny-fox--tester', 'Tiny Fox', 1);
  const forkOnly = asset('fork-only--kajdrak2', 'Fork Only', 2);
  const forkVariant = asset('rainbow-fox--kajdrak2', 'Rainbow Fox', 3);
  const originalOnly = asset('original-only--tester', 'Original Only', 4);
  const originalVariant = asset('blue-fox--tester', 'Blue Fox', 5);
  const aliasPetJson = Buffer.from(JSON.stringify({
    id: 'tiny-fox-copy--tester', displayName: 'Tiny Fox Copy', spriteVersionNumber: 2, spritesheetPath: 'spritesheet.webp',
  }));
  const alias = { petJson: aliasPetJson, spritesheet: sharedFox.spritesheet };

  const primary = {
    manifest: {
      schemaVersion: 1,
      // The existing GitHub fork still carries the original repository field.
      repository: ORIGINAL_CATALOG_REPOSITORY,
      ref: 'main',
      pets: {
        'tiny-fox--tester': installRecord('Tiny Fox', sharedFox),
        'fork-only--kajdrak2': installRecord('Fork Only', forkOnly),
        'rainbow-fox--kajdrak2': installRecord('Rainbow Fox', forkVariant),
      },
    },
    metadata: [
      metadata('tiny-fox--tester', 'Tiny Fox — fork metadata', 'animals/tiny-fox'),
      metadata('fork-only--kajdrak2', 'Fork Only', 'animals/fork-only', 'Kajdrak2'),
      metadata('rainbow-fox--kajdrak2', 'Rainbow Fox', 'animals/fox', 'Kajdrak2'),
    ],
    assets: {
      'tiny-fox--tester': sharedFox,
      'fork-only--kajdrak2': forkOnly,
      'rainbow-fox--kajdrak2': forkVariant,
    },
  };
  const original = {
    manifest: {
      schemaVersion: 1,
      repository: ORIGINAL_CATALOG_REPOSITORY,
      ref: 'main',
      pets: {
        'legacy--tester': {
          name: 'Legacy', spriteVersionNumber: 1,
          petJsonSha256: '0'.repeat(64), petJsonBytes: 10,
          spritesheetSha256: '1'.repeat(64), spritesheetBytes: 30,
          spritesheetWidth: 1536, spritesheetHeight: 1872,
        },
        'tiny-fox--tester': installRecord('Tiny Fox', sharedFox),
        'tiny-fox-copy--tester': installRecord('Tiny Fox Copy', alias),
        'original-only--tester': installRecord('Original Only', originalOnly),
        'blue-fox--tester': installRecord('Blue Fox', originalVariant),
      },
    },
    metadata: [
      metadata('legacy--tester', 'Legacy', 'animals/legacy'),
      metadata('tiny-fox--tester', 'Tiny Fox — original metadata', 'animals/tiny-fox'),
      metadata('tiny-fox-copy--tester', 'Tiny Fox Copy', 'animals/tiny-fox-copy'),
      metadata('original-only--tester', 'Original Only', 'animals/original-only'),
      metadata('blue-fox--tester', 'Blue Fox', 'animals/fox'),
    ],
    assets: {
      'tiny-fox--tester': sharedFox,
      'tiny-fox-copy--tester': alias,
      'original-only--tester': originalOnly,
      'blue-fox--tester': originalVariant,
    },
  };
  return { primary, original };
}

function response(value, status = 200) {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  return new Response(body, { status, headers: { 'content-length': String(body.length) } });
}

function catalogFetch(data, overrides = new Map()) {
  const bySource = new Map([
    ['codex-avatars', data.primary],
    ['awesome-codex-pet', data.original],
  ]);
  return async (url) => {
    if (overrides.has(url)) {
      const value = overrides.get(url);
      if (value instanceof Error) throw value;
      return response(value);
    }
    for (const source of CATALOG_SOURCES) {
      const sourceData = bySource.get(source.id);
      if (url === source.installManifestUrl) return response(sourceData.manifest);
      if (url === source.metadataUrl) return response(sourceData.metadata);
      for (const [slug, files] of Object.entries(sourceData.assets)) {
        if (url === rawPetUrl(source.repository, 'main', slug, 'pet.json')) return response(files.petJson);
        if (url === rawPetUrl(source.repository, 'main', slug, 'spritesheet.webp')) return response(files.spritesheet);
      }
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
}

test('normalizes only integrity-backed V2 Pets from the source repository', () => {
  const data = fixture();
  const originalSource = CATALOG_SOURCES.find((source) => source.id === 'awesome-codex-pet');
  const catalog = normalizeCatalog(data.original.manifest, data.original.metadata, originalSource);
  assert.equal(catalog.pets.length, 4);
  assert.equal(catalog.pets[0].repository, ORIGINAL_CATALOG_REPOSITORY);
  assert.equal(catalog.pets.every((pet) => pet.spriteVersionNumber === 2), true);
  assert.throws(
    () => normalizeCatalog({ ...data.original.manifest, repository: 'attacker/catalog' }, data.original.metadata, originalSource),
    /not trusted/,
  );
});

test('merges both catalogs, lets the controlled fork win, and preserves real variants', async () => {
  const data = fixture();
  const client = new MarketplaceClient({ fetchImpl: catalogFetch(data) });
  const catalog = await client.load();
  assert.equal(catalog.source, 'network');
  assert.equal(catalog.stale, false);
  assert.equal(catalog.sources.length, 2);
  assert.equal(catalog.pets.length, 5);
  assert.equal(catalog.duplicateCount, 2);
  const tinyFox = catalog.pets.find((pet) => pet.slug === 'tiny-fox--tester');
  assert.equal(tinyFox.name, 'Tiny Fox — fork metadata');
  assert.equal(tinyFox.repository, PRIMARY_CATALOG_REPOSITORY);
  assert.equal(catalog.pets.some((pet) => pet.slug === 'tiny-fox-copy--tester'), false);
  assert.deepEqual(
    catalog.pets.filter((pet) => pet.canonicalKey === 'animals/fox').map((pet) => pet.slug).sort(),
    ['blue-fox--tester', 'rainbow-fox--kajdrak2'],
  );
});

test('loads both network catalogs and falls back to validated stale per-source cache', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-marketplace-cache-'));
  const data = fixture();
  let now = 1_000_000;
  const first = new MarketplaceClient({ cacheDirectory: root, fetchImpl: catalogFetch(data), now: () => now, cacheTtlMs: 100 });
  assert.equal((await first.load()).source, 'network');

  now += 1_000;
  const offline = new MarketplaceClient({
    cacheDirectory: root,
    fetchImpl: async () => { throw new Error('offline'); },
    now: () => now,
    cacheTtlMs: 100,
  });
  const cached = await offline.load();
  assert.equal(cached.source, 'cache');
  assert.equal(cached.stale, true);
  assert.equal(cached.pets.length, 5);
  await assert.rejects(offline.duplicateIndex({ force: true, requireFresh: true }), /live marketplace catalog/);
  await fs.rm(root, { recursive: true, force: true });
});

test('keeps the available source usable when the other catalog is unavailable', async () => {
  const data = fixture();
  const original = CATALOG_SOURCES.find((source) => source.id === 'awesome-codex-pet');
  const fetchImpl = catalogFetch(data, new Map([
    [original.installManifestUrl, new Error('original offline')],
    [original.metadataUrl, new Error('original offline')],
  ]));
  const catalog = await new MarketplaceClient({ fetchImpl }).load();
  assert.equal(catalog.source, 'mixed');
  assert.equal(catalog.stale, true);
  assert.equal(catalog.pets.length, 3);
  assert.equal(catalog.sourceStatus['awesome-codex-pet'], 'missing');
});

test('downloads a winning Pet from its actual source and verifies every byte', async () => {
  const data = fixture();
  const client = new MarketplaceClient({ fetchImpl: catalogFetch(data) });
  const files = await client.fetchPetFiles('tiny-fox--tester');
  assert.deepEqual(files.petJson, data.primary.assets['tiny-fox--tester'].petJson);
  assert.equal(files.record.repository, PRIMARY_CATALOG_REPOSITORY);

  const spritesheetUrl = rawPetUrl(PRIMARY_CATALOG_REPOSITORY, 'main', 'tiny-fox--tester', 'spritesheet.webp');
  const damaged = Buffer.from(data.primary.assets['tiny-fox--tester'].spritesheet);
  damaged[30] ^= 0xff;
  const badClient = new MarketplaceClient({ fetchImpl: catalogFetch(data, new Map([[spritesheetUrl, damaged]])) });
  await assert.rejects(badClient.fetchPetFiles('tiny-fox--tester'), /integrity check/);
});

test('generates and caches a local preview when a fork-only Pet has no upstream thumbnail', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-marketplace-thumbnail-'));
  const data = fixture();
  let renderedSpritesheet = null;
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
  const client = new MarketplaceClient({
    cacheDirectory: root,
    fetchImpl: catalogFetch(data),
    renderThumbnail: async (spritesheet) => {
      renderedSpritesheet = Buffer.from(spritesheet);
      return png;
    },
  });
  const thumbnailUrl = await client.thumbnail('fork-only--kajdrak2');
  assert.match(thumbnailUrl, /^file:/);
  assert.deepEqual(renderedSpritesheet, data.primary.assets['fork-only--kajdrak2'].spritesheet);
  assert.equal(await fs.readFile(new URL(thumbnailUrl)).then((buffer) => buffer.equals(png)), true);
  renderedSpritesheet = null;
  assert.equal(await client.thumbnail('fork-only--kajdrak2'), thumbnailUrl);
  assert.equal(renderedSpritesheet, null);
  await fs.rm(root, { recursive: true, force: true });
});

test('caches the verified WebP atlas when the packaged runtime cannot render a PNG preview', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-marketplace-atlas-'));
  const data = fixture();
  let renderAttempts = 0;
  const client = new MarketplaceClient({
    cacheDirectory: root,
    fetchImpl: catalogFetch(data),
    renderThumbnail: () => {
      renderAttempts += 1;
      throw new Error('nativeImage returned an empty image');
    },
  });
  const thumbnailUrl = await client.thumbnail('fork-only--kajdrak2');
  assert.match(thumbnailUrl, /^file:.*\.webp$/);
  assert.equal(
    await fs.readFile(new URL(thumbnailUrl))
      .then((buffer) => buffer.equals(data.primary.assets['fork-only--kajdrak2'].spritesheet)),
    true,
  );
  assert.equal(renderAttempts, 1);
  assert.equal(await client.thumbnail('fork-only--kajdrak2'), thumbnailUrl);
  assert.equal(renderAttempts, 1);
  await fs.rm(root, { recursive: true, force: true });
});

test('the marketplace renderer crops cached atlas fallbacks to one V2 frame', async () => {
  const [renderer, styles, markup] = await Promise.all([
    fs.readFile(path.join(__dirname, '..', 'src', 'renderer', 'renderer.js'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'src', 'renderer', 'styles.css'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8'),
  ]);
  assert.match(renderer, /classList\.toggle\('is-atlas', \/\\\.webp/);
  assert.match(styles, /\.marketplace-thumbnail\.is-atlas\s*\{/);
  assert.match(styles, /height:\s*1100%/);
  assert.match(styles, /translateX\(-6\.25%\)/);
  assert.match(styles, /clip-path:\s*inset\(0 87\.5% 90\.9090909% 0\)/);
  assert.match(markup, /img-src 'self' data: file: codex-avatar:/);
});

test('builds a deduplicated all-version index across both catalogs', async () => {
  const data = fixture();
  const client = new MarketplaceClient({ fetchImpl: catalogFetch(data) });
  const duplicates = await client.duplicateIndex();
  assert.equal(duplicates.pets.length, 6);
  assert.equal(duplicates.pets.find((pet) => pet.slug === 'legacy--tester').spritesheetSha256, '1'.repeat(64));
  assert.equal(duplicates.pets.find((pet) => pet.slug === 'tiny-fox--tester').repository, PRIMARY_CATALOG_REPOSITORY);
  assert.equal(duplicates.pets.some((pet) => pet.slug === 'tiny-fox-copy--tester'), false);
});

test('rejects unsafe repositories, asset paths, and oversized responses', async () => {
  assert.throws(() => rawPetUrl('attacker/catalog', 'main', 'safe-pet', 'pet.json'), /not trusted/);
  assert.throws(() => rawPetUrl(PRIMARY_CATALOG_REPOSITORY, 'main', '../escape', 'pet.json'), /invalid Pet id/);
  assert.throws(() => rawPetUrl(PRIMARY_CATALOG_REPOSITORY, 'main', 'safe-pet', 'setup.ps1'), /Unsupported marketplace file/);
  assert.equal(
    rawPetUrl(PRIMARY_CATALOG_REPOSITORY, 'main', 'safe-pet', 'pet.json'),
    'https://raw.githubusercontent.com/Kajdrak2/awesome-codex-pet/main/pets/safe-pet/pet.json',
  );
  await assert.rejects(
    responseBuffer(new Response(Buffer.from('small'), { headers: { 'content-length': '100' } }), 10, 'Fixture'),
    /too large/,
  );
});

test('mergeCatalogs never collapses different hashes merely because canonical keys match', () => {
  const sourceA = { id: 'a', priority: 0, provider: 'A', repository: 'a/a', repositoryUrl: 'https://example.com/a', ref: 'main', pets: [
    { slug: 'pet-a', name: 'Pet A', canonicalKey: 'animals/pet', spritesheetSha256: 'a'.repeat(64) },
  ] };
  const sourceB = { id: 'b', priority: 1, provider: 'B', repository: 'b/b', repositoryUrl: 'https://example.com/b', ref: 'main', pets: [
    { slug: 'pet-b', name: 'Pet B', canonicalKey: 'animals/pet', spritesheetSha256: 'b'.repeat(64) },
  ] };
  assert.equal(mergeCatalogs([sourceA, sourceB]).pets.length, 2);
});

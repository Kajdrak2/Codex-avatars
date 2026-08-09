'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');

const PRIMARY_CATALOG_REPOSITORY = 'Kajdrak2/awesome-codex-pet';
const ORIGINAL_CATALOG_REPOSITORY = 'legeling/awesome-codex-pet';
const CATALOG_REPOSITORY = PRIMARY_CATALOG_REPOSITORY;
const CATALOG_REPOSITORY_URL = `https://github.com/${CATALOG_REPOSITORY}`;
const CATALOG_SITE_URL = CATALOG_REPOSITORY_URL;
const CATALOG_GUIDE_URL = `${CATALOG_REPOSITORY_URL}/blob/main/CONTRIBUTING.md`;
const ORIGINAL_CATALOG_SITE_URL = 'https://codexpet.top';
const CACHE_SCHEMA_VERSION = 2;
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_STALE_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CATALOG_BYTES = 6 * 1024 * 1024;
const MAX_PET_JSON_BYTES = 64 * 1024;
const MAX_SPRITESHEET_BYTES = 80 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 4 * 1024 * 1024;

const CATALOG_SOURCES = Object.freeze([
  Object.freeze({
    id: 'codex-avatars',
    priority: 0,
    provider: 'Codex Avatars',
    repository: PRIMARY_CATALOG_REPOSITORY,
    repositoryUrl: `https://github.com/${PRIMARY_CATALOG_REPOSITORY}`,
    siteUrl: `https://github.com/${PRIMARY_CATALOG_REPOSITORY}`,
    guideUrl: `https://github.com/${PRIMARY_CATALOG_REPOSITORY}/blob/main/CONTRIBUTING.md`,
    installManifestUrl: `https://raw.githubusercontent.com/${PRIMARY_CATALOG_REPOSITORY}/main/install-manifest.json`,
    metadataUrl: `https://raw.githubusercontent.com/${PRIMARY_CATALOG_REPOSITORY}/main/pets.json`,
    acceptedManifestRepositories: Object.freeze([PRIMARY_CATALOG_REPOSITORY, ORIGINAL_CATALOG_REPOSITORY]),
  }),
  Object.freeze({
    id: 'awesome-codex-pet',
    priority: 1,
    provider: 'Awesome Codex Pet',
    repository: ORIGINAL_CATALOG_REPOSITORY,
    repositoryUrl: `https://github.com/${ORIGINAL_CATALOG_REPOSITORY}`,
    siteUrl: ORIGINAL_CATALOG_SITE_URL,
    guideUrl: `${ORIGINAL_CATALOG_SITE_URL}/guide`,
    installManifestUrl: `https://raw.githubusercontent.com/${ORIGINAL_CATALOG_REPOSITORY}/main/install-manifest.json`,
    metadataUrl: `https://raw.githubusercontent.com/${ORIGINAL_CATALOG_REPOSITORY}/main/pets.json`,
    acceptedManifestRepositories: Object.freeze([ORIGINAL_CATALOG_REPOSITORY]),
  }),
]);
const CATALOG_SOURCE_BY_ID = new Map(CATALOG_SOURCES.map((source) => [source.id, source]));
const TRUSTED_CATALOG_REPOSITORIES = new Set(CATALOG_SOURCES.map((source) => source.repository));
const PRIMARY_CATALOG_SOURCE = CATALOG_SOURCES[0];
const ORIGINAL_CATALOG_SOURCE = CATALOG_SOURCES[1];
const INSTALL_MANIFEST_URL = PRIMARY_CATALOG_SOURCE.installManifestUrl;
const PET_METADATA_URL = PRIMARY_CATALOG_SOURCE.metadataUrl;

function safeCatalogSlug(value) {
  const slug = typeof value === 'string' ? value.trim() : '';
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(slug)) throw new Error('The marketplace returned an invalid Pet id.');
  return slug;
}

function safeCatalogRef(value) {
  const ref = typeof value === 'string' ? value.trim() : '';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(ref)) throw new Error('The marketplace returned an invalid repository ref.');
  return ref;
}

function safeCatalogRepository(value) {
  const repository = typeof value === 'string' ? value.trim() : '';
  if (!TRUSTED_CATALOG_REPOSITORIES.has(repository)) throw new Error('The marketplace repository is not trusted.');
  return repository;
}

function boundedText(value, maximum = 1_000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function stringList(value, maximum = 24) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().slice(0, 100))
    .filter(Boolean))].slice(0, maximum);
}

function safeHttpsUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function validSha256(value) {
  const hash = typeof value === 'string' ? value.toLowerCase() : '';
  return /^[a-f0-9]{64}$/.test(hash) ? hash : null;
}

function boundedInteger(value, minimum, maximum) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum && number <= maximum ? number : null;
}

function sourceDetailsUrl(source, slug, ref) {
  if (source.id === ORIGINAL_CATALOG_SOURCE.id) {
    return `${ORIGINAL_CATALOG_SITE_URL}/pets/${encodeURIComponent(slug)}`;
  }
  return `${source.repositoryUrl}/tree/${encodeURIComponent(ref)}/pets/${encodeURIComponent(slug)}`;
}

function normalizeCatalog(manifest, metadata, source = ORIGINAL_CATALOG_SOURCE) {
  const trustedSource = source && CATALOG_SOURCE_BY_ID.get(source.id);
  if (!trustedSource) throw new Error('The marketplace source is not trusted.');
  source = trustedSource;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('The marketplace install manifest is invalid.');
  if (Number(manifest.schemaVersion) !== 1) throw new Error('The marketplace install manifest uses an unsupported schema.');
  if (!source.acceptedManifestRepositories.includes(manifest.repository)) throw new Error('The marketplace repository is not trusted.');
  if (!manifest.pets || typeof manifest.pets !== 'object' || Array.isArray(manifest.pets)) throw new Error('The marketplace install manifest has no Pet index.');
  if (!Array.isArray(metadata)) throw new Error('The marketplace metadata index is invalid.');

  const ref = safeCatalogRef(manifest.ref);
  const metadataBySlug = new Map(metadata
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item) && typeof item.slug === 'string')
    .map((item) => [item.slug, item]));
  const pets = [];

  for (const [rawSlug, rawInstall] of Object.entries(manifest.pets)) {
    let slug;
    try {
      slug = safeCatalogSlug(rawSlug);
    } catch {
      continue;
    }
    if (!rawInstall || typeof rawInstall !== 'object' || Array.isArray(rawInstall)) continue;
    if (Number(rawInstall.spriteVersionNumber) !== 2) continue;
    if (Number(rawInstall.spritesheetWidth) !== 1536 || Number(rawInstall.spritesheetHeight) !== 2288) continue;

    const petJsonSha256 = validSha256(rawInstall.petJsonSha256);
    const spritesheetSha256 = validSha256(rawInstall.spritesheetSha256);
    const petJsonBytes = boundedInteger(rawInstall.petJsonBytes, 2, MAX_PET_JSON_BYTES);
    const spritesheetBytes = boundedInteger(rawInstall.spritesheetBytes, 30, MAX_SPRITESHEET_BYTES);
    if (!petJsonSha256 || !spritesheetSha256 || !petJsonBytes || !spritesheetBytes) continue;

    const info = metadataBySlug.get(slug) || {};
    const name = boundedText(info.name || rawInstall.name || slug, 120) || slug;
    pets.push({
      slug,
      name,
      localizedNames: info.localized_names && typeof info.localized_names === 'object' && !Array.isArray(info.localized_names)
        ? Object.fromEntries(Object.entries(info.localized_names)
          .filter(([key, value]) => /^[a-z]{2}(?:-[A-Z]{2})?$/.test(key) && typeof value === 'string')
          .map(([key, value]) => [key, value.trim().slice(0, 120)]))
        : {},
      author: boundedText(info.author || info.author_handle, 120),
      authorHandle: boundedText(info.author_handle, 120),
      authorUrl: safeHttpsUrl(info.author_url),
      primaryCategory: boundedText(info.primary_category, 120) || 'Others',
      canonicalKey: boundedText(info.canonical_key, 180),
      variantNote: boundedText(info.variant_note, 1_000),
      collections: stringList(info.collections),
      license: boundedText(info.license, 2_000),
      description: boundedText(info.description, 1_000),
      spriteVersionNumber: 2,
      spritesheetWidth: 1536,
      spritesheetHeight: 2288,
      petJsonSha256,
      petJsonBytes,
      spritesheetSha256,
      spritesheetBytes,
      ref,
      catalogSource: source.id,
      provider: source.provider,
      repository: source.repository,
      repositoryUrl: source.repositoryUrl,
      previewUrl: `${ORIGINAL_CATALOG_SITE_URL}/assets/previews/${encodeURIComponent(slug)}/thumbnail.png`,
      detailsUrl: sourceDetailsUrl(source, slug, ref),
    });
  }

  pets.sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
  return {
    id: source.id,
    priority: source.priority,
    provider: source.provider,
    repository: source.repository,
    repositoryUrl: source.repositoryUrl,
    siteUrl: source.siteUrl,
    guideUrl: source.guideUrl,
    manifestRepository: manifest.repository,
    ref,
    pets,
  };
}

function mergeCatalogs(catalogs) {
  const ordered = [...catalogs].sort((left, right) => left.priority - right.priority);
  const slugs = new Set();
  const hashes = new Set();
  const pets = [];
  let duplicateCount = 0;
  for (const catalog of ordered) {
    for (const pet of catalog.pets) {
      if (slugs.has(pet.slug) || hashes.has(pet.spritesheetSha256)) {
        duplicateCount += 1;
        continue;
      }
      slugs.add(pet.slug);
      hashes.add(pet.spritesheetSha256);
      pets.push(pet);
    }
  }
  pets.sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
  return {
    provider: 'Codex Avatars + Awesome Codex Pet',
    repository: CATALOG_REPOSITORY,
    repositoryUrl: CATALOG_REPOSITORY_URL,
    siteUrl: CATALOG_SITE_URL,
    guideUrl: CATALOG_GUIDE_URL,
    duplicateCount,
    sources: ordered.map((catalog) => ({
      id: catalog.id,
      provider: catalog.provider,
      repository: catalog.repository,
      repositoryUrl: catalog.repositoryUrl,
      ref: catalog.ref,
    })),
    pets,
  };
}

async function responseBuffer(response, maximumBytes, label) {
  if (!response || typeof response.arrayBuffer !== 'function') throw new Error(`${label} returned an invalid response.`);
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}.`);
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error(`${label} is too large.`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maximumBytes) throw new Error(`${label} is too large.`);
  return buffer;
}

async function fetchBuffer(fetchImpl, url, maximumBytes, label, signal) {
  const response = await fetchImpl(url, {
    method: 'GET',
    redirect: 'error',
    signal,
    headers: {
      accept: 'application/json, image/png, image/webp;q=0.9, */*;q=0.1',
      'user-agent': 'Codex-Avatars',
    },
  });
  return responseBuffer(response, maximumBytes, label);
}

async function fetchJson(fetchImpl, url, maximumBytes, label, signal) {
  const buffer = await fetchBuffer(fetchImpl, url, maximumBytes, label, signal);
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function rawPetUrl(repositoryOrRef, refOrSlug, slugOrFileName, optionalFileName) {
  const legacySignature = optionalFileName === undefined;
  const repository = safeCatalogRepository(legacySignature ? ORIGINAL_CATALOG_REPOSITORY : repositoryOrRef);
  const ref = safeCatalogRef(legacySignature ? repositoryOrRef : refOrSlug);
  const slug = safeCatalogSlug(legacySignature ? refOrSlug : slugOrFileName);
  const fileName = legacySignature ? slugOrFileName : optionalFileName;
  if (!['pet.json', 'spritesheet.webp'].includes(fileName)) throw new Error('Unsupported marketplace file.');
  return `https://raw.githubusercontent.com/${repository}/${ref}/pets/${encodeURIComponent(slug)}/${fileName}`;
}

function isPng(buffer) {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function isWebp(buffer) {
  return buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

function aggregateEntry(sourceEntries, statuses, checkedAt) {
  const catalogs = CATALOG_SOURCES
    .map((source) => sourceEntries[source.id]?.catalog)
    .filter(Boolean);
  if (catalogs.length === 0) throw new Error('No marketplace catalog is currently available.');
  const liveCount = statuses.filter((status) => status === 'network').length;
  const source = liveCount === CATALOG_SOURCES.length ? 'network' : liveCount === 0 ? 'cache' : 'mixed';
  return {
    checkedAt,
    sources: sourceEntries,
    statusBySource: Object.fromEntries(CATALOG_SOURCES.map((catalogSource, index) => [catalogSource.id, statuses[index]])),
    catalog: mergeCatalogs(catalogs),
    source,
    stale: liveCount !== CATALOG_SOURCES.length,
  };
}

class MarketplaceClient {
  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof this.fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
    this.cacheDirectory = options.cacheDirectory || null;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.maximumStaleMs = options.maximumStaleMs ?? MAX_STALE_CACHE_MS;
    this.now = options.now || Date.now;
    this.renderThumbnail = typeof options.renderThumbnail === 'function' ? options.renderThumbnail : null;
    this.memory = null;
  }

  get cachePath() {
    return this.cacheDirectory ? path.join(this.cacheDirectory, 'catalog.json') : null;
  }

  cacheSourceEntry(source, value) {
    if (!value || !Number.isFinite(Number(value.cachedAt))) return null;
    try {
      return {
        cachedAt: Number(value.cachedAt),
        manifest: value.manifest,
        metadata: value.metadata,
        catalog: normalizeCatalog(value.manifest, value.metadata, source),
      };
    } catch {
      return null;
    }
  }

  async readCache() {
    if (!this.cachePath) return {};
    try {
      const data = JSON.parse(await fs.readFile(this.cachePath, 'utf8'));
      if (Number(data.schemaVersion) === 1) {
        const legacy = this.cacheSourceEntry(ORIGINAL_CATALOG_SOURCE, data);
        return legacy ? { [ORIGINAL_CATALOG_SOURCE.id]: legacy } : {};
      }
      if (Number(data.schemaVersion) !== CACHE_SCHEMA_VERSION || !data.sources || typeof data.sources !== 'object') return {};
      return Object.fromEntries(CATALOG_SOURCES.flatMap((source) => {
        const entry = this.cacheSourceEntry(source, data.sources[source.id]);
        return entry ? [[source.id, entry]] : [];
      }));
    } catch {
      return {};
    }
  }

  async writeCache(sourceEntries) {
    if (!this.cachePath) return;
    await fs.mkdir(this.cacheDirectory, { recursive: true });
    const temporaryPath = `${this.cachePath}.${process.pid}.${randomUUID()}.tmp`;
    const sources = Object.fromEntries(Object.entries(sourceEntries).map(([id, entry]) => [id, {
      cachedAt: entry.cachedAt,
      manifest: entry.manifest,
      metadata: entry.metadata,
    }]));
    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify({ schemaVersion: CACHE_SCHEMA_VERSION, sources })}\n`, 'utf8');
      await fs.rename(temporaryPath, this.cachePath);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  }

  payload(entry, sourceOverride) {
    const fetchedAt = Math.max(...Object.values(entry.sources).map((source) => source.cachedAt));
    return {
      ...entry.catalog,
      fetchedAt,
      source: sourceOverride || entry.source,
      stale: entry.stale,
      sourceStatus: entry.statusBySource,
    };
  }

  async load(options = {}) {
    const force = Boolean(options.force);
    const now = this.now();
    if (!force && this.memory && now - this.memory.checkedAt <= this.cacheTtlMs) {
      return this.payload(this.memory, this.memory.source === 'network' ? 'memory' : this.memory.source);
    }

    const cached = await this.readCache();
    const allCacheFresh = CATALOG_SOURCES.every((source) => cached[source.id]
      && now - cached[source.id].cachedAt <= this.cacheTtlMs);
    if (!force && allCacheFresh) {
      const entry = aggregateEntry(cached, CATALOG_SOURCES.map(() => 'cache'), now);
      this.memory = entry;
      return this.payload(entry, 'cache');
    }

    const outcomes = await Promise.all(CATALOG_SOURCES.map(async (source) => {
      try {
        const [manifest, metadata] = await Promise.all([
          fetchJson(this.fetchImpl, source.installManifestUrl, MAX_CATALOG_BYTES, `${source.provider} install manifest`, options.signal),
          fetchJson(this.fetchImpl, source.metadataUrl, MAX_CATALOG_BYTES, `${source.provider} metadata`, options.signal),
        ]);
        return {
          status: 'network',
          entry: { cachedAt: now, manifest, metadata, catalog: normalizeCatalog(manifest, metadata, source) },
        };
      } catch (error) {
        const fallback = cached[source.id];
        if (fallback && now - fallback.cachedAt <= this.maximumStaleMs) return { status: 'cache', entry: fallback };
        return { status: 'missing', error };
      }
    }));
    const sourceEntries = Object.fromEntries(CATALOG_SOURCES.flatMap((source, index) => {
      const entry = outcomes[index].entry;
      return entry ? [[source.id, entry]] : [];
    }));
    if (Object.keys(sourceEntries).length === 0) {
      throw outcomes.find((outcome) => outcome.error)?.error || new Error('No marketplace catalog is currently available.');
    }
    await this.writeCache(sourceEntries);
    const entry = aggregateEntry(sourceEntries, outcomes.map((outcome) => outcome.status), now);
    this.memory = entry;
    return this.payload(entry);
  }

  async record(slug, options = {}) {
    const safeSlug = safeCatalogSlug(slug);
    const catalog = await this.load(options);
    const record = catalog.pets.find((pet) => pet.slug === safeSlug);
    if (!record) throw new Error('This Pet is no longer available in the V2 marketplace.');
    return record;
  }

  async duplicateIndex(options = {}) {
    const catalog = await this.load(options);
    if (options.requireFresh && (catalog.stale || !['network', 'memory'].includes(catalog.source))) {
      throw new Error('A live marketplace catalog is required before publication.');
    }
    const pets = [];
    const slugs = new Set();
    const hashes = new Set();
    for (const source of CATALOG_SOURCES) {
      const entry = this.memory?.sources?.[source.id];
      if (!entry) continue;
      const manifestPets = entry.manifest?.pets || {};
      const metadata = Array.isArray(entry.metadata) ? entry.metadata : [];
      for (const item of metadata) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        let slug;
        try {
          slug = safeCatalogSlug(item.slug);
        } catch {
          continue;
        }
        const spritesheetSha256 = validSha256(manifestPets[slug]?.spritesheetSha256);
        if (slugs.has(slug) || (spritesheetSha256 && hashes.has(spritesheetSha256))) continue;
        slugs.add(slug);
        if (spritesheetSha256) hashes.add(spritesheetSha256);
        pets.push({
          slug,
          name: boundedText(item.name, 120) || slug,
          author: boundedText(item.author, 120),
          authorHandle: boundedText(item.author_handle, 120),
          canonicalKey: boundedText(item.canonical_key, 180),
          spritesheetSha256,
          catalogSource: source.id,
          repository: source.repository,
        });
      }
    }
    return { pets, source: catalog.source, stale: Boolean(catalog.stale) };
  }

  async fetchPetFiles(slug, options = {}) {
    const record = await this.record(slug, options);
    const [petJson, spritesheet] = await Promise.all([
      fetchBuffer(this.fetchImpl, rawPetUrl(record.repository, record.ref, record.slug, 'pet.json'), record.petJsonBytes, 'Marketplace pet.json', options.signal),
      fetchBuffer(this.fetchImpl, rawPetUrl(record.repository, record.ref, record.slug, 'spritesheet.webp'), record.spritesheetBytes, 'Marketplace spritesheet', options.signal),
    ]);
    if (petJson.length !== record.petJsonBytes || sha256(petJson) !== record.petJsonSha256) {
      throw new Error('The downloaded Pet manifest failed its integrity check.');
    }
    if (spritesheet.length !== record.spritesheetBytes || sha256(spritesheet) !== record.spritesheetSha256) {
      throw new Error('The downloaded Pet spritesheet failed its integrity check.');
    }
    let manifest;
    try {
      manifest = JSON.parse(petJson.toString('utf8'));
    } catch {
      throw new Error('The downloaded Pet manifest is not valid JSON.');
    }
    if (safeCatalogSlug(manifest.id) !== record.slug || Number(manifest.spriteVersionNumber) !== 2) {
      throw new Error('The downloaded Pet does not match its marketplace record.');
    }
    const spritePath = typeof manifest.spritesheetPath === 'string' ? manifest.spritesheetPath : 'spritesheet.webp';
    if (spritePath !== 'spritesheet.webp') throw new Error('The downloaded Pet uses an unsupported spritesheet path.');
    return { record, petJson, spritesheet };
  }

  async thumbnail(slug, options = {}) {
    if (!this.cacheDirectory) throw new Error('The marketplace thumbnail cache is unavailable.');
    const record = await this.record(slug, options);
    const thumbnailDirectory = path.join(this.cacheDirectory, 'thumbnails');
    const cacheKey = `${record.slug}-${record.spritesheetSha256.slice(0, 12)}`;
    const previewPath = path.join(thumbnailDirectory, `${cacheKey}.png`);
    const atlasPath = path.join(thumbnailDirectory, `${cacheKey}.webp`);
    for (const [candidatePath, minimum, maximum] of [
      [previewPath, 8, MAX_THUMBNAIL_BYTES],
      [atlasPath, record.spritesheetBytes, record.spritesheetBytes],
    ]) {
      try {
        const stat = await fs.stat(candidatePath);
        if (stat.isFile() && stat.size >= minimum && stat.size <= maximum) return pathToFileURL(candidatePath).toString();
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    let buffer;
    let destinationPath = previewPath;
    try {
      buffer = await fetchBuffer(this.fetchImpl, record.previewUrl, MAX_THUMBNAIL_BYTES, 'Marketplace thumbnail', options.signal);
    } catch (error) {
      const spritesheet = await fetchBuffer(
        this.fetchImpl,
        rawPetUrl(record.repository, record.ref, record.slug, 'spritesheet.webp'),
        record.spritesheetBytes,
        'Marketplace thumbnail source',
        options.signal,
      );
      if (spritesheet.length !== record.spritesheetBytes || sha256(spritesheet) !== record.spritesheetSha256) {
        throw new Error('The marketplace thumbnail source failed its integrity check.');
      }
      let rendered = null;
      if (this.renderThumbnail) {
        try {
          rendered = Buffer.from(await this.renderThumbnail(spritesheet));
        } catch {
          rendered = null;
        }
      }
      if (rendered && rendered.length <= MAX_THUMBNAIL_BYTES && isPng(rendered)) {
        buffer = rendered;
      } else {
        buffer = spritesheet;
        destinationPath = atlasPath;
      }
    }
    if (destinationPath === previewPath && !isPng(buffer)) throw new Error('The marketplace thumbnail is not a valid PNG image.');
    if (destinationPath === atlasPath && !isWebp(buffer)) throw new Error('The marketplace thumbnail source is not a valid WebP image.');
    await fs.mkdir(thumbnailDirectory, { recursive: true });
    const temporaryPath = path.join(thumbnailDirectory, `.${record.slug}.${process.pid}.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporaryPath, buffer);
      try {
        await fs.rename(temporaryPath, destinationPath);
      } catch (error) {
        if (error.code !== 'EEXIST' && error.code !== 'EPERM') throw error;
      }
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
    return pathToFileURL(destinationPath).toString();
  }
}

module.exports = {
  CACHE_SCHEMA_VERSION,
  CATALOG_GUIDE_URL,
  CATALOG_REPOSITORY,
  CATALOG_REPOSITORY_URL,
  CATALOG_SITE_URL,
  CATALOG_SOURCES,
  INSTALL_MANIFEST_URL,
  MarketplaceClient,
  ORIGINAL_CATALOG_REPOSITORY,
  PET_METADATA_URL,
  PRIMARY_CATALOG_REPOSITORY,
  MAX_CATALOG_BYTES,
  MAX_PET_JSON_BYTES,
  MAX_SPRITESHEET_BYTES,
  mergeCatalogs,
  normalizeCatalog,
  rawPetUrl,
  responseBuffer,
  safeCatalogRef,
  safeCatalogRepository,
  safeCatalogSlug,
  sha256,
};

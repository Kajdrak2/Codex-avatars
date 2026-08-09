'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  GitHubMarketplacePublisher,
  MAX_PR_SPRITESHEET_BYTES,
  analyzeCatalogDuplicates,
  formattedJson,
  normalizeSubmissionForm,
  prepareLocalSubmission,
  suggestCanonicalKey,
} = require('../src/core/marketplace-submission.cjs');

function webpHeader(width = 1536, height = 2288, totalBytes = 30) {
  const data = Buffer.alloc(Math.max(totalBytes, 30));
  data.write('RIFF', 0, 'ascii'); data.writeUInt32LE(data.length - 8, 4); data.write('WEBPVP8X', 8, 'ascii'); data.writeUInt32LE(10, 16);
  const w = width - 1; const h = height - 1;
  data[24] = w & 0xff; data[25] = (w >> 8) & 0xff; data[26] = (w >> 16) & 0xff;
  data[27] = h & 0xff; data[28] = (h >> 8) & 0xff; data[29] = (h >> 16) & 0xff;
  return data;
}

function validForm(overrides = {}) {
  return {
    name: 'Spookie',
    petSlug: 'spookie',
    author: 'friendly-user',
    primaryCategory: 'Original Characters',
    sourceType: 'ai-generated',
    sourceNotes: '',
    canonicalKey: 'original/friendly-user/spookie',
    variantNote: '',
    description: 'A friendly rainbow ghost with sparkling glasses.',
    sourceUrl: '',
    tags: 'ghost, rainbow',
    license: 'Non-commercial use only.',
    confirmations: {
      rights: true,
      frames: true,
      directions: true,
      edges: true,
      nonCommercial: true,
      publicPullRequest: true,
    },
    ...overrides,
  };
}

test('formats marketplace JSON using the catalog Prettier layout', () => {
  const shortTags = formattedJson({ tags: ['v2', 'ai-generated'], source_type: 'ai-generated' }).toString('utf8');
  assert.match(shortTags, /"tags": \["v2", "ai-generated"\]/);
  assert.doesNotMatch(shortTags, /"tags": \[\n/);

  const longTags = formattedJson({ tags: Array.from({ length: 4 }, (_, index) => `long-marketplace-tag-${index}`) }).toString('utf8');
  assert.match(longTags, /"tags": \[\n/);
  assert.equal(JSON.parse(shortTags).tags.length, 2);
  assert.equal(JSON.parse(longTags).tags.length, 4);
});

test('normalizes a focused upstream submission and preserves explicit consent', () => {
  const result = normalizeSubmissionForm(validForm(), { githubLogin: 'friendly-user' });
  assert.equal(result.slug, 'spookie--friendly-user');
  assert.equal(result.submission.author_url, 'https://github.com/friendly-user');
  assert.deepEqual(result.submission.tags, ['ghost', 'rainbow', 'v2', 'ai-generated']);
  assert.deepEqual(result.submission.codex_install, { pet_json: 'pet.json', spritesheet: 'spritesheet.webp' });
  assert.throws(
    () => normalizeSubmissionForm(validForm({ confirmations: {} }), { githubLogin: 'friendly-user' }),
    /Every submission confirmation/,
  );
  assert.throws(
    () => normalizeSubmissionForm(validForm({ license: 'All rights reserved.' }), { githubLogin: 'friendly-user' }),
    /non-commercial/,
  );
});

test('suggests a stable canonical key immediately and refines it with the author', () => {
  assert.equal(suggestCanonicalKey({
    primaryCategory: 'Fantasy Creatures',
    author: 'Friendly User',
    name: 'Spookie Rainbow',
  }), 'fantasy/spookie-rainbow');
  assert.equal(suggestCanonicalKey({
    primaryCategory: 'Original Characters',
    author: 'Friendly User',
    name: 'Spookie Rainbow',
  }), 'original/friendly-user/spookie-rainbow');
  assert.equal(suggestCanonicalKey({ primaryCategory: 'Others', author: '', name: 'Spookie' }), 'other/spookie');
});

test('publishes GitHub author metadata only for the authenticated account', () => {
  const penName = normalizeSubmissionForm(validForm({ author: 'Spookie Studio' }), { githubLogin: 'friendly-user' });
  assert.equal(penName.submission.author, 'Spookie Studio');
  assert.equal(penName.submission.author_handle, undefined);
  assert.equal(penName.submission.author_url, undefined);
});

test('generates source notes for independent work and requires reuse details when attribution matters', () => {
  const generated = normalizeSubmissionForm(validForm(), { githubLogin: 'friendly-user' });
  assert.equal(generated.submission.source_notes, 'Independently AI-generated for this Pet; no existing spritesheet pixels were reused.');
  assert.throws(
    () => normalizeSubmissionForm(validForm({ sourceType: 'adapted-existing-asset', sourceNotes: '' }), { githubLogin: 'friendly-user' }),
    /Reuse or attribution details is required/,
  );
  const adapted = normalizeSubmissionForm(validForm({
    sourceType: 'adapted-existing-asset',
    sourceNotes: 'Adapted from an existing CC BY-NC illustration by Example Artist.',
  }), { githubLogin: 'friendly-user' });
  assert.equal(adapted.submission.source_notes, 'Adapted from an existing CC BY-NC illustration by Example Artist.');
});

test('prepares exactly three valid V2 files without modifying the local Pet', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-submit-'));
  const manifestPath = path.join(root, 'pet.json');
  const spritesheetPath = path.join(root, 'spritesheet.webp');
  await fs.writeFile(manifestPath, JSON.stringify({
    id: 'spookie-local', displayName: 'Spookie', description: 'A friendly ghost.', spriteVersionNumber: 2, spritesheetPath: 'spritesheet.webp',
  }));
  await fs.writeFile(spritesheetPath, webpHeader());
  const prepared = await prepareLocalSubmission({
    id: 'spookie-local', directory: root, manifestPath, spritesheetPath, spriteVersionNumber: 2,
  }, validForm(), { githubLogin: 'friendly-user' });
  assert.deepEqual(Object.keys(prepared.files).sort(), ['pet.json', 'spritesheet.webp', 'submission.json']);
  assert.equal(JSON.parse(prepared.files['pet.json']).id, 'spookie--friendly-user');
  assert.equal(JSON.parse(await fs.readFile(manifestPath, 'utf8')).id, 'spookie-local');
  await fs.rm(root, { recursive: true, force: true });
});

test('rejects spritesheets that exceed the upstream pull-request budget', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-submit-large-'));
  const manifestPath = path.join(root, 'pet.json');
  const spritesheetPath = path.join(root, 'spritesheet.webp');
  await fs.writeFile(manifestPath, JSON.stringify({ id: 'large', description: 'Large.', spriteVersionNumber: 2 }));
  await fs.writeFile(spritesheetPath, webpHeader(1536, 2288, MAX_PR_SPRITESHEET_BYTES + 1));
  await assert.rejects(prepareLocalSubmission({
    id: 'large', directory: root, manifestPath, spritesheetPath, spriteVersionNumber: 2,
  }, validForm(), { githubLogin: 'friendly-user' }), /5,000,000/);
  await fs.rm(root, { recursive: true, force: true });
});

test('refuses to publish files that resolve outside the selected Pet directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-submit-escape-'));
  const petDirectory = path.join(root, 'pet');
  const outsideDirectory = path.join(root, 'outside');
  await fs.mkdir(petDirectory);
  await fs.mkdir(outsideDirectory);
  const manifestPath = path.join(outsideDirectory, 'pet.json');
  const spritesheetPath = path.join(outsideDirectory, 'spritesheet.webp');
  await fs.writeFile(manifestPath, JSON.stringify({ id: 'escape', description: 'Escape.', spriteVersionNumber: 2 }));
  await fs.writeFile(spritesheetPath, webpHeader());
  await assert.rejects(prepareLocalSubmission({
    id: 'escape', directory: petDirectory, manifestPath, spritesheetPath, spriteVersionNumber: 2,
  }, validForm(), { githubLogin: 'friendly-user' }), /outside its package directory/);
  await fs.rm(root, { recursive: true, force: true });
});

test('blocks exact duplicates and requires a note for an existing canonical key', () => {
  const prepared = {
    ...normalizeSubmissionForm(validForm(), { githubLogin: 'friendly-user' }),
    spritesheetSha256: 'a'.repeat(64),
  };
  assert.throws(() => analyzeCatalogDuplicates(prepared, { pets: [{
    slug: 'existing--author', name: 'Existing', canonicalKey: 'different/key', spritesheetSha256: 'a'.repeat(64),
  }] }), /byte-identical/);
  const withoutVariant = { ...prepared, variantNote: '' };
  assert.throws(() => analyzeCatalogDuplicates(withoutVariant, { pets: [{
    slug: 'spookie--another', name: 'Spookie', canonicalKey: prepared.canonicalKey, spritesheetSha256: 'b'.repeat(64),
  }] }), /variant note/);
  const reviewed = analyzeCatalogDuplicates({ ...prepared, variantNote: 'Independent visual and animation treatment.' }, { pets: [{
    slug: 'spookie--another', name: 'Spookie', canonicalKey: prepared.canonicalKey, spritesheetSha256: 'b'.repeat(64),
  }] });
  assert.equal(reviewed.warnings.length, 1);
});

test('publishes three blobs to the user fork and opens one ready pull request', async () => {
  const calls = [];
  let blobIndex = 0;
  const hex = (character) => character.repeat(40);
  const github = {
    async api(method, endpoint, body) {
      calls.push({ method, endpoint, body });
      if (endpoint.endsWith('/git/ref/heads/main')) return { object: { sha: hex('a') } };
      if (endpoint.endsWith(`/git/commits/${hex('a')}`)) return { tree: { sha: hex('b') } };
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet') return { permissions: { push: false } };
      if (endpoint === '/repos/friendly-user/awesome-codex-pet') {
        return { fork: true, parent: { full_name: 'legeling/awesome-codex-pet' }, source: { full_name: 'legeling/awesome-codex-pet' } };
      }
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet/pulls?state=open&per_page=100') return [];
      if (endpoint.endsWith('/git/blobs')) return { sha: String(++blobIndex).repeat(40) };
      if (endpoint.endsWith('/git/trees')) return { sha: hex('c') };
      if (endpoint.endsWith('/git/commits')) return { sha: hex('d') };
      if (endpoint.endsWith('/git/refs')) return { ref: body.ref };
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet/pulls') {
        return { number: 42, html_url: 'https://github.com/Kajdrak2/awesome-codex-pet/pull/42' };
      }
      throw new Error(`Unexpected API call: ${method} ${endpoint}`);
    },
  };
  const normalized = normalizeSubmissionForm(validForm(), { githubLogin: 'friendly-user' });
  const prepared = {
    ...normalized,
    files: {
      'submission.json': Buffer.from('{}'),
      'pet.json': Buffer.from('{}'),
      'spritesheet.webp': webpHeader(),
    },
    spritesheetBytes: 30,
  };
  const publisher = new GitHubMarketplacePublisher({ github, now: () => Date.UTC(2026, 7, 9, 12, 30, 0) });
  const result = await publisher.publish(prepared, { login: 'friendly-user', warnings: [] });
  assert.equal(result.url, 'https://github.com/Kajdrak2/awesome-codex-pet/pull/42');
  assert.equal(calls.filter((call) => call.endpoint.endsWith('/git/blobs')).length, 3);
  const tree = calls.find((call) => call.endpoint.endsWith('/git/trees'));
  assert.deepEqual(tree.body.tree.map((entry) => entry.path).sort(), [
    'pets/spookie--friendly-user/pet.json',
    'pets/spookie--friendly-user/spritesheet.webp',
    'pets/spookie--friendly-user/submission.json',
  ]);
  const pull = calls.find((call) => call.endpoint.endsWith('/pulls'));
  assert.equal(pull.body.draft, false);
  assert.equal(pull.body.head.startsWith('friendly-user:codex-avatars/submit-spookie-'), true);
  assert.match(pull.body.body, /No Codex generation or review credits/);
});

test('publishes directly to the controlled fork when its owner is connected', async () => {
  const calls = [];
  let blobIndex = 0;
  const hex = (character) => character.repeat(40);
  const github = {
    async api(method, endpoint, body) {
      calls.push({ method, endpoint, body });
      if (endpoint.endsWith('/git/ref/heads/main')) return { object: { sha: hex('a') } };
      if (endpoint.endsWith(`/git/commits/${hex('a')}`)) return { tree: { sha: hex('b') } };
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet') return { permissions: { push: true } };
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet/pulls?state=open&per_page=100') return [];
      if (endpoint.endsWith('/git/blobs')) return { sha: String(++blobIndex).repeat(40) };
      if (endpoint.endsWith('/git/trees')) return { sha: hex('c') };
      if (endpoint.endsWith('/git/commits')) return { sha: hex('d') };
      if (endpoint.endsWith('/git/refs')) return { ref: body.ref };
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet/pulls') {
        return { number: 43, html_url: 'https://github.com/Kajdrak2/awesome-codex-pet/pull/43' };
      }
      throw new Error(`Unexpected API call: ${method} ${endpoint}`);
    },
  };
  const normalized = normalizeSubmissionForm(validForm({ author: 'Kajdrak2' }), { githubLogin: 'Kajdrak2' });
  const prepared = {
    ...normalized,
    files: {
      'submission.json': Buffer.from('{}'),
      'pet.json': Buffer.from('{}'),
      'spritesheet.webp': webpHeader(),
    },
    spritesheetBytes: 30,
  };
  const publisher = new GitHubMarketplacePublisher({ github, now: () => Date.UTC(2026, 7, 9, 12, 30, 0) });
  const result = await publisher.publish(prepared, { login: 'Kajdrak2', warnings: [] });
  assert.equal(result.url, 'https://github.com/Kajdrak2/awesome-codex-pet/pull/43');
  assert.equal(calls.some((call) => call.endpoint === '/repos/Kajdrak2/awesome-codex-pet/forks'), false);
  const pull = calls.find((call) => call.endpoint.endsWith('/pulls'));
  assert.equal(pull.body.head.startsWith('codex-avatars/submit-spookie-'), true);
  assert.equal(pull.body.head.includes(':'), false);
});

test('updates the newest matching open pull request instead of creating a duplicate', async () => {
  const calls = [];
  let blobIndex = 0;
  const hex = (character) => character.repeat(40);
  const existingBranch = 'codex-avatars/submit-spookie-20260809155839';
  const github = {
    async api(method, endpoint, body) {
      calls.push({ method, endpoint, body });
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet') return { permissions: { push: true } };
      if (endpoint === '/repos/Kajdrak2/awesome-codex-pet/pulls?state=open&per_page=100') {
        return [
          {
            number: 2,
            html_url: 'https://github.com/Kajdrak2/awesome-codex-pet/pull/2',
            body: 'Adds the Codex Pet v2 package `spookie--kajdrak2`.',
            base: { ref: 'main' },
            head: { ref: 'codex-avatars/submit-spookie-20260809151133', sha: hex('e'), repo: { full_name: 'Kajdrak2/awesome-codex-pet' } },
          },
          {
            number: 3,
            html_url: 'https://github.com/Kajdrak2/awesome-codex-pet/pull/3',
            body: 'Adds the Codex Pet v2 package `spookie--kajdrak2`.',
            base: { ref: 'main' },
            head: { ref: existingBranch, sha: hex('f'), repo: { full_name: 'Kajdrak2/awesome-codex-pet' } },
          },
        ];
      }
      if (endpoint.endsWith(`/git/commits/${hex('f')}`)) return { tree: { sha: hex('a') } };
      if (endpoint.endsWith('/git/blobs')) return { sha: String(++blobIndex).repeat(40) };
      if (endpoint.endsWith('/git/trees')) return { sha: hex('b') };
      if (method === 'POST' && endpoint.endsWith('/git/commits')) return { sha: hex('c') };
      if (method === 'PATCH' && endpoint.endsWith(`/git/refs/heads/${existingBranch}`)) return { object: { sha: hex('c') } };
      if (method === 'PATCH' && endpoint.endsWith('/pulls/3')) return { number: 3 };
      throw new Error(`Unexpected API call: ${method} ${endpoint}`);
    },
  };
  const normalized = normalizeSubmissionForm(validForm({ author: 'Kajdrak2' }), { githubLogin: 'Kajdrak2' });
  const prepared = {
    ...normalized,
    files: {
      'submission.json': Buffer.from('{}'),
      'pet.json': Buffer.from('{}'),
      'spritesheet.webp': webpHeader(),
    },
    spritesheetBytes: 30,
  };
  const publisher = new GitHubMarketplacePublisher({ github });
  const result = await publisher.publish(prepared, { login: 'Kajdrak2', warnings: [] });
  assert.equal(result.existing, true);
  assert.equal(result.number, 3);
  assert.equal(result.branch, existingBranch);
  assert.equal(calls.some((call) => call.method === 'POST' && call.endpoint === '/repos/Kajdrak2/awesome-codex-pet/pulls'), false);
  assert.equal(calls.some((call) => call.endpoint.endsWith('/git/ref/heads/main')), false);
  const pullUpdate = calls.find((call) => call.method === 'PATCH' && call.endpoint.endsWith('/pulls/3'));
  assert.match(pullUpdate.body.body, new RegExp(`${hex('c')}/pets/spookie--kajdrak2/spritesheet\\.webp`));
});

'use strict';

const fs = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { readWebpDimensions } = require('./avatar-library.cjs');

const UPSTREAM_OWNER = 'Kajdrak2';
const UPSTREAM_REPOSITORY = 'awesome-codex-pet';
const UPSTREAM_FULL_NAME = `${UPSTREAM_OWNER}/${UPSTREAM_REPOSITORY}`;
const UPSTREAM_BRANCH = 'main';
const ORIGINAL_FULL_NAME = `legeling/${UPSTREAM_REPOSITORY}`;
const MAX_PR_SPRITESHEET_BYTES = 5_000_000;
const MAX_PET_JSON_BYTES = 64 * 1024;
const PET_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CANONICAL_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const CATEGORIES = Object.freeze([
  'Game Characters',
  'Anime Characters',
  'Original Characters',
  'Mascots',
  'Animals',
  'Fantasy Creatures',
  'Robots',
  'Human Avatars',
  'Memes',
  'Objects & Props',
  'Others',
]);
const CANONICAL_CATEGORY_PREFIXES = Object.freeze({
  'Game Characters': 'games',
  'Anime Characters': 'anime',
  'Original Characters': 'original',
  Mascots: 'mascots',
  Animals: 'animals',
  'Fantasy Creatures': 'fantasy',
  Robots: 'robots',
  'Human Avatars': 'humans',
  Memes: 'memes',
  'Objects & Props': 'objects',
  Others: 'other',
});
const SOURCE_TYPES = Object.freeze([
  'original',
  'ai-generated',
  'commissioned',
  'fan-art',
  'adapted-existing-asset',
  'private-source',
  'github-or-project-source',
  'existing-pet-package',
  'mascot',
  'meme',
  'avatar',
  'object',
  'other',
]);
const SOURCE_TYPES_REQUIRING_NOTES = Object.freeze([
  'commissioned',
  'fan-art',
  'adapted-existing-asset',
  'private-source',
  'github-or-project-source',
  'existing-pet-package',
  'mascot',
  'meme',
  'avatar',
  'object',
  'other',
]);

function boundedText(value, field, maximum, options = {}) {
  const source = typeof value === 'string' ? value.trim() : '';
  const text = options.singleLine ? source.replace(/\s+/g, ' ') : source;
  if (!text && options.required !== false) throw new Error(`${field} is required.`);
  if (text.length > maximum) throw new Error(`${field} is too long.`);
  return text;
}

function slugify(value, maximum = 48) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, maximum)
    .replace(/-+$/g, '');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function suggestCanonicalKey(input = {}) {
  const prefix = CANONICAL_CATEGORY_PREFIXES[input.primaryCategory] || '';
  const author = slugify(input.author);
  const pet = slugify(input.petSlug || input.name);
  if (!prefix || !pet) return '';
  return input.primaryCategory === 'Original Characters' && author
    ? `${prefix}/${author}/${pet}`
    : `${prefix}/${pet}`;
}

function sourceNotesFor(sourceType, details) {
  if (sourceType === 'original') {
    return 'Original artwork created for this Pet; no existing spritesheet pixels were reused.';
  }
  if (sourceType === 'ai-generated') {
    return 'Independently AI-generated for this Pet; no existing spritesheet pixels were reused.';
  }
  return boundedText(details, 'Reuse or attribution details', 2_000);
}

function isInsideDirectory(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeTags(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  const tags = [];
  for (const item of values) {
    const tag = slugify(item, 40);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 16) break;
  }
  return tags;
}

function optionalHttpsUrl(value) {
  const source = typeof value === 'string' ? value.trim() : '';
  if (!source) return '';
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error('Source URL must be a valid public HTTPS URL.');
  }
  if (url.protocol !== 'https:' || !url.hostname) throw new Error('Source URL must be a valid public HTTPS URL.');
  return url.toString();
}

function requireConfirmations(value) {
  const confirmations = value && typeof value === 'object' ? value : {};
  for (const key of ['rights', 'frames', 'directions', 'edges', 'nonCommercial', 'publicPullRequest']) {
    if (confirmations[key] !== true) throw new Error('Every submission confirmation must be accepted.');
  }
}

function normalizeSubmissionForm(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Submission details are missing.');
  const githubLogin = boundedText(options.githubLogin, 'GitHub account', 39);
  if (!GITHUB_LOGIN_PATTERN.test(githubLogin)) throw new Error('GitHub returned an invalid account name.');
  const name = boundedText(input.name, 'Pet name', 120, { singleLine: true });
  const requestedPetSlug = boundedText(input.petSlug, 'Catalog Pet id', 80, { singleLine: true });
  const petSlug = slugify(requestedPetSlug);
  if (!petSlug || petSlug !== requestedPetSlug.toLowerCase() || !PET_SLUG_PATTERN.test(petSlug)) {
    throw new Error('Catalog Pet id must use lowercase kebab-case.');
  }
  const author = boundedText(input.author, 'Author or handle', 120, { singleLine: true }).replace(/^@/, '');
  const authorSlug = slugify(author);
  if (!authorSlug || !PET_SLUG_PATTERN.test(authorSlug)) throw new Error('Author must contain letters or numbers.');
  const slug = `${petSlug}--${authorSlug}`;
  if (slug.length > 127) throw new Error('The combined Pet and author id is too long.');

  const primaryCategory = boundedText(input.primaryCategory, 'Primary category', 120, { singleLine: true });
  if (!CATEGORIES.includes(primaryCategory)) throw new Error('Choose a valid marketplace category.');
  const sourceType = boundedText(input.sourceType, 'Source type', 80, { singleLine: true });
  if (!SOURCE_TYPES.includes(sourceType)) throw new Error('Choose a valid source type.');
  const sourceNotes = sourceNotesFor(sourceType, input.sourceNotes);
  const canonicalKey = boundedText(input.canonicalKey, 'Canonical key', 180, { singleLine: true });
  if (!CANONICAL_KEY_PATTERN.test(canonicalKey)) {
    throw new Error('Canonical key must be lowercase slash-separated kebab-case.');
  }
  const variantNote = boundedText(input.variantNote, 'Variant note', 1_000, { required: false });
  const description = boundedText(input.description, 'Description', 1_000);
  const license = boundedText(input.license, 'License or usage statement', 2_000);
  if (!/(?:non[- ]commercial|CC\s*BY-NC)/i.test(license)) {
    throw new Error('License must explicitly establish non-commercial use.');
  }
  const sourceUrl = optionalHttpsUrl(input.sourceUrl);
  const tags = normalizeTags(input.tags);
  if (!tags.includes('v2')) tags.push('v2');
  if (!tags.includes(sourceType)) tags.push(sourceType);
  requireConfirmations(input.confirmations);

  const authorMatchesGitHub = author.toLowerCase() === githubLogin.toLowerCase();
  const submission = {
    slug,
    pet_slug: petSlug,
    author_slug: authorSlug,
    name,
    author,
    ...(authorMatchesGitHub ? {
      author_handle: githubLogin,
      author_url: `https://github.com/${githubLogin}`,
    } : {}),
    primary_category: primaryCategory,
    canonical_key: canonicalKey,
    ...(variantNote ? { variant_note: variantNote } : {}),
    tags,
    source_type: sourceType,
    source_notes: sourceNotes,
    ...(sourceUrl ? { source_url: sourceUrl } : {}),
    license,
    description,
    codex_install: {
      pet_json: 'pet.json',
      spritesheet: 'spritesheet.webp',
    },
  };
  return {
    author,
    authorSlug,
    canonicalKey,
    description,
    githubLogin,
    license,
    name,
    petSlug,
    primaryCategory,
    sourceNotes,
    slug,
    sourceType,
    sourceUrl,
    submission,
    variantNote,
  };
}

function formattedJson(value) {
  const lines = JSON.stringify(value, null, 2).split('\n');
  const formatted = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const propertyArray = /^(\s*)"(?:\\.|[^"\\])*": \[$/.exec(line);
    if (!propertyArray) {
      formatted.push(line);
      continue;
    }

    const indentation = propertyArray[1];
    const itemIndentation = `${indentation}  `;
    const items = [];
    let closingIndex = index + 1;
    let primitiveArray = false;
    for (; closingIndex < lines.length; closingIndex += 1) {
      const candidate = lines[closingIndex];
      if (candidate === `${indentation}]` || candidate === `${indentation}],`) {
        primitiveArray = true;
        break;
      }
      if (!candidate.startsWith(itemIndentation)) break;
      const rawItem = candidate.trim().replace(/,$/, '');
      try {
        const parsedItem = JSON.parse(rawItem);
        if (parsedItem !== null && typeof parsedItem === 'object') break;
        items.push(rawItem);
      } catch {
        break;
      }
    }

    if (primitiveArray) {
      const inline = `${line}${items.join(', ')}${lines[closingIndex].trim()}`;
      if (inline.length <= 80) {
        formatted.push(inline);
        index = closingIndex;
        continue;
      }
    }
    formatted.push(line);
  }
  return Buffer.from(`${formatted.join('\n')}\n`, 'utf8');
}

async function prepareLocalSubmission(record, form, options = {}) {
  if (!record?.directory || !record?.manifestPath || !record?.spritesheetPath) throw new Error('The selected local Pet is unavailable.');
  if (Number(record.spriteVersionNumber) !== 2) throw new Error('Only a finished Codex Pet v2 can be submitted.');
  const normalized = normalizeSubmissionForm(form, options);
  const [realDirectory, realManifestPath, realSpritesheetPath] = await Promise.all([
    fs.realpath(record.directory),
    fs.realpath(record.manifestPath),
    fs.realpath(record.spritesheetPath),
  ]);
  if (!isInsideDirectory(realDirectory, realManifestPath) || !isInsideDirectory(realDirectory, realSpritesheetPath)) {
    throw new Error('The selected Pet resolves files outside its package directory.');
  }
  const [manifestStat, spritesheetStat, dimensions] = await Promise.all([
    fs.stat(realManifestPath),
    fs.stat(realSpritesheetPath),
    readWebpDimensions(record.spritesheetPath),
  ]);
  if (!manifestStat.isFile() || manifestStat.size > MAX_PET_JSON_BYTES) throw new Error('The selected pet.json is unexpectedly large.');
  if (!spritesheetStat.isFile() || spritesheetStat.size > MAX_PR_SPRITESHEET_BYTES) {
    throw new Error(`spritesheet.webp exceeds the marketplace pull-request limit of ${MAX_PR_SPRITESHEET_BYTES.toLocaleString('en-US')} bytes.`);
  }
  const [manifestText, spritesheet] = await Promise.all([
    fs.readFile(realManifestPath, 'utf8'),
    fs.readFile(realSpritesheetPath),
  ]);
  let localManifest;
  try {
    localManifest = JSON.parse(manifestText);
  } catch {
    throw new Error('The selected local pet.json is not valid JSON.');
  }
  if (!dimensions || dimensions.width !== 1536 || dimensions.height !== 2288) {
    throw new Error('The Pet v2 spritesheet must be a readable 1536 × 2288 WebP atlas.');
  }
  const localDescription = typeof localManifest.description === 'string' && localManifest.description.trim()
    ? localManifest.description
    : normalized.description;
  const petManifest = {
    id: normalized.slug,
    displayName: normalized.name,
    description: boundedText(localDescription, 'Pet description', 1_000),
    spriteVersionNumber: 2,
    spritesheetPath: 'spritesheet.webp',
  };
  const files = {
    'submission.json': formattedJson(normalized.submission),
    'pet.json': formattedJson(petManifest),
    'spritesheet.webp': spritesheet,
  };
  return {
    ...normalized,
    dimensions,
    files,
    petManifest,
    spritesheetBytes: spritesheet.length,
    spritesheetSha256: sha256(spritesheet),
  };
}

function searchableName(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, '');
}

function analyzeCatalogDuplicates(prepared, catalog) {
  const pets = Array.isArray(catalog?.pets) ? catalog.pets : null;
  if (!pets) throw new Error('The live marketplace catalog is required for duplicate review.');
  const errors = [];
  const warnings = [];
  const exactAsset = pets.find((pet) => pet.spritesheetSha256 === prepared.spritesheetSha256);
  if (exactAsset) errors.push(`This spritesheet is byte-identical to the existing marketplace Pet ${exactAsset.slug}.`);
  const exactSlug = pets.find((pet) => pet.slug === prepared.slug);
  if (exactSlug) errors.push(`The marketplace id ${prepared.slug} already exists.`);
  const canonicalMatches = pets.filter((pet) => pet.canonicalKey && pet.canonicalKey === prepared.canonicalKey);
  if (canonicalMatches.length > 0) {
    if (!prepared.variantNote) {
      errors.push(`Canonical key ${prepared.canonicalKey} already belongs to ${canonicalMatches.map((pet) => pet.slug).join(', ')}; add a material variant note.`);
    } else {
      warnings.push(`Related marketplace version${canonicalMatches.length > 1 ? 's' : ''}: ${canonicalMatches.map((pet) => pet.slug).join(', ')}.`);
    }
    const sameAuthor = canonicalMatches.filter((pet) => searchableName(pet.authorHandle || pet.author) === searchableName(prepared.author));
    if (sameAuthor.length > 0) warnings.push(`The same author already publishes ${sameAuthor.map((pet) => pet.slug).join(', ')} for this canonical key.`);
  }
  const nameMatches = pets.filter((pet) => searchableName(pet.name) === searchableName(prepared.name)
    && pet.canonicalKey !== prepared.canonicalKey);
  if (nameMatches.length > 0) warnings.push(`Name match to review: ${nameMatches.map((pet) => pet.slug).join(', ')}.`);
  if (errors.length > 0) {
    const error = new Error(errors.join(' '));
    error.code = 'MARKETPLACE_DUPLICATE';
    error.details = errors;
    throw error;
  }
  return { warnings };
}

function assertSha(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/i.test(value)) throw new Error(`GitHub returned an invalid ${label}.`);
  return value;
}

function encodePath(value) {
  return String(value).split('/').map(encodeURIComponent).join('/');
}

function markdownLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/@/g, '@\u200b')
    .replace(/([\\`*_{}\[\]<>|])/g, '\\$1')
    .trim();
}

function buildPullRequestBody(prepared, options = {}) {
  const rawSpritesheet = `https://raw.githubusercontent.com/${encodeURIComponent(options.repositoryOwner)}/${UPSTREAM_REPOSITORY}/${options.commitSha}/pets/${encodePath(prepared.slug)}/spritesheet.webp`;
  const duplicateNotes = (options.warnings || []).length > 0
    ? (options.warnings || []).map((warning) => `- ${warning}`).join('\n')
    : '- No blocking catalog duplicate was found by id, canonical key, name, or exact spritesheet hash.';
  return [
    `## ${markdownLine(prepared.name)}`,
    '',
    `Adds the Codex Pet v2 package \`${prepared.slug}\`.`,
    '',
    '### Provenance and usage',
    '',
    `- Author: ${markdownLine(prepared.author)}`,
    `- Final asset source: ${markdownLine(prepared.sourceType)}`,
    `- How the final pixels were made: ${markdownLine(prepared.sourceNotes)}`,
    `- Usage terms: ${markdownLine(prepared.license)}`,
    ...(prepared.sourceUrl ? [`- Public source: <${prepared.sourceUrl}>`] : []),
    '',
    '### Duplicate review',
    '',
    duplicateNotes,
    '',
    '### Codex Avatars preflight',
    '',
    '- [x] Exactly `submission.json`, `pet.json`, and `spritesheet.webp` are included.',
    '- [x] `pet.json` id matches the submission folder.',
    '- [x] Native Pet v2 contract: `1536 × 2288`, 8 columns × 11 rows, 16 look directions.',
    `- [x] Spritesheet size is ${prepared.spritesheetBytes.toLocaleString('en-US')} bytes (below the 5,000,000-byte PR limit).`,
    '- [x] Submitter confirmed frame consistency, directional review, transparent-edge review, provenance, and non-commercial terms.',
    '',
    '### Final atlas reviewed before publication',
    '',
    `![${markdownLine(prepared.name)} final Pet v2 atlas](${rawSpritesheet})`,
    '',
    '> Submitted directly from Codex Avatars. No Codex generation or review credits were used for this publication step. Protected repository CI publishes a focused green submission automatically; post-publication concerns can be reported through the public Pet reporting flow.',
  ].join('\n');
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isMarketplaceNetworkFork(repository) {
  if (!repository?.fork) return false;
  const ancestry = [repository.parent?.full_name, repository.source?.full_name].filter(Boolean);
  return ancestry.includes(UPSTREAM_FULL_NAME) || ancestry.includes(ORIGINAL_FULL_NAME);
}

function findOpenSubmissionPullRequest(pulls, prepared, targetFullName) {
  if (!Array.isArray(pulls)) throw new Error('GitHub returned an invalid pull-request list.');
  const marker = `Adds the Codex Pet v2 package \`${prepared.slug}\`.`;
  return pulls
    .filter((pull) => pull?.base?.ref === UPSTREAM_BRANCH
      && pull?.head?.repo?.full_name === targetFullName
      && typeof pull.body === 'string'
      && pull.body.includes(marker))
    .sort((left, right) => Number(right.number || 0) - Number(left.number || 0))[0] || null;
}

class GitHubMarketplacePublisher {
  constructor(options = {}) {
    if (!options.github || typeof options.github.api !== 'function') throw new Error('A GitHub API client is required.');
    this.github = options.github;
    this.now = options.now || Date.now;
    this.wait = options.wait || delay;
  }

  async ensureTargetRepository(login, onProgress) {
    const upstream = await this.github.api('GET', `/repos/${UPSTREAM_FULL_NAME}`);
    if (upstream?.permissions?.push === true) {
      return { owner: UPSTREAM_OWNER, repository: UPSTREAM_REPOSITORY, direct: true };
    }
    const forkEndpoint = `/repos/${login}/${UPSTREAM_REPOSITORY}`;
    let fork = null;
    try {
      fork = await this.github.api('GET', forkEndpoint);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    if (fork && !isMarketplaceNetworkFork(fork)) {
      throw new Error(`GitHub repository ${login}/${UPSTREAM_REPOSITORY} exists but is not part of the ${UPSTREAM_FULL_NAME} fork network.`);
    }
    if (!fork) {
      onProgress?.('creating-github-fork');
      await this.github.api('POST', `/repos/${UPSTREAM_FULL_NAME}/forks`, { default_branch_only: true });
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await this.wait(2_000);
        try {
          fork = await this.github.api('GET', forkEndpoint);
          if (isMarketplaceNetworkFork(fork)) break;
        } catch (error) {
          if (error.status !== 404) throw error;
        }
      }
    }
    if (!isMarketplaceNetworkFork(fork)) {
      throw new Error('GitHub did not finish preparing the marketplace fork. Try again in a moment.');
    }
    return { owner: login, repository: UPSTREAM_REPOSITORY, direct: false };
  }

  async publish(prepared, options = {}) {
    const login = boundedText(options.login, 'GitHub account', 39);
    if (!GITHUB_LOGIN_PATTERN.test(login)) throw new Error('GitHub returned an invalid account name.');
    const onProgress = options.onProgress;
    const target = await this.ensureTargetRepository(login, onProgress);
    const targetFullName = `${target.owner}/${target.repository}`;
    onProgress?.('checking-open-submissions');
    const openPulls = await this.github.api('GET', `/repos/${UPSTREAM_FULL_NAME}/pulls?state=open&per_page=100`);
    const existingPull = findOpenSubmissionPullRequest(openPulls, prepared, targetFullName);

    let baseTreeSha;
    let parentCommitSha;
    let branch = '';
    if (existingPull) {
      branch = boundedText(existingPull.head?.ref, 'Existing submission branch', 240, { singleLine: true });
      const expectedPrefix = `codex-avatars/submit-${prepared.petSlug}-`;
      if (!branch.startsWith(expectedPrefix) || !/^\d{14}$/.test(branch.slice(expectedPrefix.length))) {
        throw new Error('The existing submission uses an unexpected branch name.');
      }
      parentCommitSha = assertSha(existingPull.head?.sha, 'existing submission commit');
      const existingCommit = await this.github.api('GET', `/repos/${targetFullName}/git/commits/${parentCommitSha}`);
      baseTreeSha = assertSha(existingCommit?.tree?.sha, 'existing submission tree');
    } else {
      onProgress?.('reading-marketplace-branch');
      const reference = await this.github.api('GET', `/repos/${UPSTREAM_FULL_NAME}/git/ref/heads/${UPSTREAM_BRANCH}`);
      parentCommitSha = assertSha(reference?.object?.sha, 'base commit');
      const baseCommit = await this.github.api('GET', `/repos/${UPSTREAM_FULL_NAME}/git/commits/${parentCommitSha}`);
      baseTreeSha = assertSha(baseCommit?.tree?.sha, 'base tree');
    }

    onProgress?.('uploading-pet-files');
    const fileEntries = await Promise.all(Object.entries(prepared.files).map(async ([fileName, contents]) => {
      const blob = await this.github.api('POST', `/repos/${targetFullName}/git/blobs`, {
        content: contents.toString('base64'),
        encoding: 'base64',
      }, { timeoutMs: 120_000 });
      return {
        path: `pets/${prepared.slug}/${fileName}`,
        mode: '100644',
        type: 'blob',
        sha: assertSha(blob?.sha, `${fileName} blob`),
      };
    }));
    const tree = await this.github.api('POST', `/repos/${targetFullName}/git/trees`, {
      base_tree: baseTreeSha,
      tree: fileEntries,
    });
    const treeSha = assertSha(tree?.sha, 'submission tree');
    const commit = await this.github.api('POST', `/repos/${targetFullName}/git/commits`, {
      message: `${existingPull ? 'Update' : 'Add'} ${prepared.name} Codex Pet v2`,
      tree: treeSha,
      parents: [parentCommitSha],
    });
    const commitSha = assertSha(commit?.sha, 'submission commit');
    if (existingPull) {
      const number = Number(existingPull.number);
      const url = typeof existingPull.html_url === 'string' ? existingPull.html_url : '';
      if (!Number.isInteger(number) || number < 1 || !/^https:\/\/github\.com\/Kajdrak2\/awesome-codex-pet\/pull\/\d+$/.test(url)) {
        throw new Error('GitHub returned an invalid existing pull request.');
      }
      onProgress?.('updating-pull-request');
      await this.github.api('PATCH', `/repos/${targetFullName}/git/refs/heads/${branch}`, {
        sha: commitSha,
        force: false,
      });
      await this.github.api('PATCH', `/repos/${UPSTREAM_FULL_NAME}/pulls/${number}`, {
        title: `[Pet] ${markdownLine(prepared.name)} by ${markdownLine(prepared.author)}`,
        body: buildPullRequestBody(prepared, {
          commitSha,
          repositoryOwner: target.owner,
          warnings: options.warnings,
        }),
      });
      return {
        account: login,
        branch,
        commitSha,
        existing: true,
        number,
        url,
      };
    }

    const timestamp = new Date(this.now()).toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    branch = `codex-avatars/submit-${prepared.petSlug}-${timestamp}`;
    await this.github.api('POST', `/repos/${targetFullName}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: commitSha,
    });

    onProgress?.('opening-pull-request');
    const pullRequest = await this.github.api('POST', `/repos/${UPSTREAM_FULL_NAME}/pulls`, {
      title: `[Pet] ${markdownLine(prepared.name)} by ${markdownLine(prepared.author)}`,
      head: target.direct ? branch : `${login}:${branch}`,
      base: UPSTREAM_BRANCH,
      body: buildPullRequestBody(prepared, {
        commitSha,
        repositoryOwner: target.owner,
        warnings: options.warnings,
      }),
      maintainer_can_modify: true,
      draft: false,
    });
    const url = typeof pullRequest?.html_url === 'string' ? pullRequest.html_url : '';
    if (!/^https:\/\/github\.com\/Kajdrak2\/awesome-codex-pet\/pull\/\d+$/.test(url)) {
      throw new Error('GitHub created the submission but returned an invalid pull-request URL.');
    }
    return {
      account: login,
      branch,
      commitSha,
      existing: false,
      number: Number(pullRequest.number),
      url,
    };
  }
}

module.exports = {
  CANONICAL_CATEGORY_PREFIXES,
  CANONICAL_KEY_PATTERN,
  CATEGORIES,
  GITHUB_LOGIN_PATTERN,
  GitHubMarketplacePublisher,
  MAX_PR_SPRITESHEET_BYTES,
  MAX_PET_JSON_BYTES,
  ORIGINAL_FULL_NAME,
  PET_SLUG_PATTERN,
  SOURCE_TYPES,
  SOURCE_TYPES_REQUIRING_NOTES,
  UPSTREAM_BRANCH,
  UPSTREAM_FULL_NAME,
  UPSTREAM_OWNER,
  UPSTREAM_REPOSITORY,
  analyzeCatalogDuplicates,
  buildPullRequestBody,
  findOpenSubmissionPullRequest,
  formattedJson,
  isMarketplaceNetworkFork,
  normalizeSubmissionForm,
  normalizeTags,
  prepareLocalSubmission,
  sha256,
  slugify,
  sourceNotesFor,
  suggestCanonicalKey,
};

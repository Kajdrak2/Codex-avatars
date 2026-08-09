'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  FEEDBACK_BASE_URL,
  PET_REPORT_BASE_URL,
  PET_REPORT_REASONS,
  buildFeedbackUrl,
  buildPetReportUrl,
} = require('../src/core/feedback-links.cjs');

const root = path.join(__dirname, '..');

test('builds only fixed GitHub feedback URLs with a guided draft', () => {
  assert.equal(FEEDBACK_BASE_URL, 'https://github.com/Kajdrak2/Codex-avatars/issues/new');
  const url = new URL(buildFeedbackUrl({ kind: 'bug', version: '0.7.0-beta.7', language: 'en' }));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/Kajdrak2/Codex-avatars/issues/new');
  assert.equal(url.searchParams.get('labels'), 'bug');
  assert.match(url.searchParams.get('title'), /^\[Bug\]/);
  assert.match(url.searchParams.get('body'), /Codex Avatars: 0\.7\.0-beta\.7/);
  assert.match(url.searchParams.get('body'), /Steps to reproduce/);
  assert.throws(() => buildFeedbackUrl({ kind: 'other', version: '1.0.0' }), /Unsupported feedback type/);
});

test('localizes suggestion drafts and safely encodes the version', () => {
  const url = new URL(buildFeedbackUrl({ kind: 'suggestion', version: '1.0.0&labels=unsafe', language: 'fr' }));
  assert.equal(url.searchParams.getAll('labels').length, 1);
  assert.equal(url.searchParams.get('labels'), 'enhancement');
  assert.match(url.searchParams.get('body'), /Problème ou besoin/);
  assert.match(url.searchParams.get('body'), /1\.0\.0&labels=unsafe/);
});

test('ships guided GitHub issue forms for repository visitors', () => {
  for (const filename of ['bug_report.yml', 'feature_request.yml', 'config.yml']) {
    assert.equal(fs.existsSync(path.join(root, '.github', 'ISSUE_TEMPLATE', filename)), true, filename);
  }
  const bug = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'), 'utf8');
  const suggestion = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', 'feature_request.yml'), 'utf8');
  assert.match(bug, /title: "\[Bug\] "/);
  assert.match(bug, /id: reproduction/);
  assert.match(suggestion, /title: "\[Suggestion\] "/);
  assert.match(suggestion, /id: need/);
});

test('builds a fixed public Pet report from trusted catalog metadata', () => {
  const url = new URL(buildPetReportUrl({
    pet: {
      slug: 'minuit--kajdrak2',
      name: 'Minuit',
      repository: 'Kajdrak2/awesome-codex-pet',
      ref: 'main',
    },
    reason: 'copyright',
    details: 'This listing appears to reuse protected artwork without attribution.',
    version: '0.7.0-beta.11',
    language: 'en',
  }));

  assert.equal(PET_REPORT_BASE_URL, 'https://github.com/Kajdrak2/awesome-codex-pet/issues/new');
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/Kajdrak2/awesome-codex-pet/issues/new');
  assert.deepEqual(url.searchParams.getAll('labels'), ['pet-report']);
  assert.match(url.searchParams.get('title'), /^\[Pet report\] Minuit/);
  assert.match(url.searchParams.get('body'), /Catalog id: `minuit--kajdrak2`/);
  assert.match(url.searchParams.get('body'), /Copyright or attribution concern/);
  assert.match(url.searchParams.get('body'), /Codex Avatars 0\.7\.0-beta\.11/);
});

test('localizes Pet reports and rejects untrusted or incomplete payloads', () => {
  const pet = {
    slug: 'spookie--kajdrak2',
    name: 'Spookie & labels=unsafe',
    repository: 'legeling/awesome-codex-pet',
    ref: 'main',
  };
  const url = new URL(buildPetReportUrl({
    pet,
    reason: 'broken',
    details: 'La feuille de sprites ne fonctionne pas après installation.',
    version: '1.0.0&labels=unsafe',
    language: 'fr',
  }));
  assert.deepEqual(url.searchParams.getAll('labels'), ['pet-report']);
  assert.match(url.searchParams.get('body'), /Pet cassé ou invalide/);
  assert.match(url.searchParams.get('body'), /1\.0\.0&labels=unsafe/);
  assert.deepEqual([...PET_REPORT_REASONS], [
    'copyright',
    'inappropriate',
    'duplicate',
    'broken',
    'impersonation',
    'other',
  ]);
  assert.throws(() => buildPetReportUrl({ pet, reason: 'other', details: 'short' }), /explanation/);
  assert.throws(() => buildPetReportUrl({
    pet: { ...pet, repository: 'attacker/example' },
    reason: 'other',
    details: 'A sufficiently detailed explanation.',
  }), /not trusted/);
  assert.throws(() => buildPetReportUrl({
    pet,
    reason: 'labels=unsafe',
    details: 'A sufficiently detailed explanation.',
  }), /Unsupported/);
});

test('wires an in-app Pet report dialog through the restricted main-process bridge', () => {
  const markup = fs.readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src', 'renderer', 'renderer.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src', 'preload.cjs'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src', 'main.cjs'), 'utf8');
  assert.match(markup, /id="marketplace-report-dialog"/);
  assert.match(markup, /name="details"[^>]+minlength="10"[^>]+maxlength="2000"/);
  assert.match(renderer, /api\.reportMarketplacePet\(selectedReportPet\.slug/);
  assert.match(preload, /reportMarketplacePet: \(slug, payload\) => ipcRenderer\.invoke\('avatars:report-marketplace-pet'/);
  assert.match(main, /safeCatalogSlug\(rawSlug\)/);
  assert.match(main, /buildPetReportUrl\(\{/);
  assert.match(main, /ipcMain\.handle\('avatars:report-marketplace-pet'/);
});

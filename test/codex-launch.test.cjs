'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAvatarPrompt, codexNewThreadUrl } = require('../src/core/codex-launch.cjs');

test('builds an English avatar prompt and a prefilled Codex task link', () => {
  const prompt = buildAvatarPrompt({ appearance: 'A tiny copper fox', personality: 'curious', style: 'soft plush mascot' }, 'en');
  assert.match(prompt, /^Use \$create-codex-avatar/);
  assert.match(prompt, /Appearance: A tiny copper fox/);
  const url = codexNewThreadUrl(prompt);
  assert.equal(new URL(url).hostname, 'threads');
  assert.equal(new URL(url).searchParams.get('prompt'), prompt);
});

test('uses French for the selected command language and requires an appearance', () => {
  assert.match(buildAvatarPrompt({ appearance: 'Un petit renard cuivre' }, 'fr'), /^Utilise \$create-codex-avatar/);
  assert.throws(() => buildAvatarPrompt({}, 'en'), /appearance/i);
});

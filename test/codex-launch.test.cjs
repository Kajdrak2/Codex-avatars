'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAvatarPrompt, codexNewThreadUrl } = require('../src/core/codex-launch.cjs');

test('builds an English avatar prompt and a prefilled Codex task link', () => {
  const prompt = buildAvatarPrompt({ appearance: 'A tiny copper fox', personality: 'curious', style: 'soft plush mascot' }, 'en');
  assert.match(prompt, /^Use \$create-codex-avatar/);
  assert.match(prompt, /\$hatch-pet/);
  assert.match(prompt, /load_workspace_dependencies/);
  assert.match(prompt, /Pillow/);
  assert.match(prompt, /Appearance: A tiny copper fox/);
  assert.match(prompt, /three blind direction reviews/);
  assert.match(prompt, /pet\.json and spritesheet\.webp together/);
  const url = codexNewThreadUrl(prompt);
  assert.equal(new URL(url).hostname, 'threads');
  assert.equal(new URL(url).searchParams.get('prompt'), prompt);
});

test('uses French for the selected command language and requires an appearance', () => {
  const prompt = buildAvatarPrompt({ appearance: 'Un petit renard cuivre' }, 'fr');
  assert.match(prompt, /^Utilise \$create-codex-avatar/);
  assert.match(prompt, /\$hatch-pet/);
  assert.match(prompt, /load_workspace_dependencies/);
  assert.match(prompt, /trois revues de directions a l'aveugle/);
  assert.throws(() => buildAvatarPrompt({}, 'en'), /appearance/i);
});

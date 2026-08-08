'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { reconcileAvatarSelection } = require('../src/core/avatar-selection.cjs');

function settings(overrides = {}) {
  return {
    enabledAvatarIds: [], avatarSelectionInitialized: false, knownAvatarIds: [],
    avatarKnowledgeInitialized: false, autoEnableNewAvatars: true, ...overrides,
  };
}

test('first discovery enables the library and records a migration baseline', () => {
  assert.deepEqual(reconcileAvatarSelection(settings(), ['minuit']), {
    enabledAvatarIds: ['minuit'], avatarSelectionInitialized: true,
    knownAvatarIds: ['minuit'], avatarKnowledgeInitialized: true,
  });
});

test('a Pet added while the app was closed is enabled on the next initial scan', () => {
  const patch = reconcileAvatarSelection(settings({
    enabledAvatarIds: ['minuit'], avatarSelectionInitialized: true, knownAvatarIds: ['minuit'], avatarKnowledgeInitialized: true,
  }), ['minuit', 'lumen']);
  assert.deepEqual(patch, { enabledAvatarIds: ['minuit', 'lumen'], knownAvatarIds: ['minuit', 'lumen'] });
});

test('automatic enable off records but does not activate a new Pet', () => {
  const patch = reconcileAvatarSelection(settings({
    enabledAvatarIds: ['minuit'], avatarSelectionInitialized: true, knownAvatarIds: ['minuit'], avatarKnowledgeInitialized: true,
    autoEnableNewAvatars: false,
  }), ['minuit', 'lumen']);
  assert.deepEqual(patch, { knownAvatarIds: ['minuit', 'lumen'] });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveRoamingZone } = require('../src/core/roaming-zone.cjs');

const displays = [
  { id: 1, primary: true, label: 'Left', workArea: { x: -1280, y: 0, width: 1280, height: 984 } },
  { id: 2, primary: false, label: 'Main', workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
];

test('resolves all monitors into one virtual transparent surface', () => {
  const result = resolveRoamingZone({ mode: 'all' }, displays);
  assert.deepEqual(result.windowBounds, { x: -1280, y: 0, width: 3200, height: 1040 });
  assert.deepEqual(result.displayIds, ['1', '2']);
  assert.deepEqual(result.zones[1], { x: 1280, y: 0, width: 1920, height: 1040 });
});

test('falls back to the primary monitor when no selected id exists', () => {
  const result = resolveRoamingZone({ mode: 'displays', displayIds: ['missing'] }, displays);
  assert.deepEqual(result.windowBounds, displays[0].workArea);
  assert.deepEqual(result.displayIds, ['1']);
});

test('clamps a custom rectangle to the virtual desktop', () => {
  const result = resolveRoamingZone({
    mode: 'custom',
    custom: { x: 1800, y: 900, width: 900, height: 900 },
  }, displays);
  assert.deepEqual(result.windowBounds, { x: 1800, y: 900, width: 120, height: 140 });
});

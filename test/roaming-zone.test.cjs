'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  bootstrapWindowBounds,
  intersectRects,
  localRectToVirtual,
  resolveRoamingZone,
} = require('../src/core/roaming-zone.cjs');

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

test('bootstraps a spanning native window on one monitor before expansion', () => {
  const target = resolveRoamingZone({ mode: 'all' }, displays).windowBounds;
  assert.deepEqual(bootstrapWindowBounds(target, displays), displays[0].workArea);
});

test('bootstraps a custom region directly on its non-primary monitor', () => {
  const target = { x: 420, y: 180, width: 760, height: 520 };
  assert.deepEqual(bootstrapWindowBounds(target, displays), target);
});

test('intersects rectangles in virtual coordinates without losing negative origins', () => {
  assert.deepEqual(
    intersectRects({ x: -1400, y: -100, width: 400, height: 300 }, displays[0].workArea),
    { x: -1280, y: 0, width: 280, height: 200 },
  );
  assert.equal(intersectRects({ x: 2000, y: 0, width: 100, height: 100 }, displays[0].workArea), null);
});

test('translates a picker drag on the left monitor into negative desktop coordinates', () => {
  assert.deepEqual(
    localRectToVirtual(
      { x: 140, y: 80, width: 620, height: 430 },
      { x: -1280, y: 0, width: 3200, height: 1040 },
    ),
    { x: -1140, y: 80, width: 620, height: 430 },
  );
});

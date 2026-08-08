'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findZonePath,
  sharedEdge,
  zoneIndexAtPoint,
} = require('../src/renderer/screen-topology.js');

test('routes through the Windows screen layout instead of jumping across a diagonal gap', () => {
  const zones = [
    { x: 0, y: 0, width: 1920, height: 1040 },
    { x: 1920, y: 0, width: 1920, height: 1040 },
    { x: 3840, y: 300, width: 1600, height: 900 },
  ];
  assert.deepEqual(findZonePath(zones, 0, 2), [0, 1, 2]);
  assert.deepEqual(sharedEdge(zones[1], zones[2]), {
    axis: 'x', direction: 'right', boundary: 3840, start: 300, end: 1040,
  });
});

test('uses vertical adjacency when Windows stacks displays', () => {
  const zones = [
    { x: 0, y: 0, width: 1920, height: 1040 },
    { x: 400, y: 1040, width: 1920, height: 1080 },
  ];
  assert.deepEqual(sharedEdge(zones[0], zones[1]), {
    axis: 'y', direction: 'down', boundary: 1040, start: 400, end: 1920,
  });
  assert.deepEqual(findZonePath(zones, 0, 1), [0, 1]);
});

test('does not create a route across non-touching screens and identifies the dragged screen', () => {
  const zones = [
    { x: 0, y: 0, width: 1280, height: 800 },
    { x: 1600, y: 0, width: 1280, height: 800 },
  ];
  assert.equal(findZonePath(zones, 0, 1), null);
  assert.equal(zoneIndexAtPoint(zones, 1700, 400), 1);
  assert.equal(zoneIndexAtPoint(zones, 1400, 400), -1);
});

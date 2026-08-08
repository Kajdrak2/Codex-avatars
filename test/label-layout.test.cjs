'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { labelLayout } = require('../src/renderer/label-layout.js');

test('name and model/effort visibility are independent', () => {
  assert.deepEqual(labelLayout({ showLabels: false, showAgentDetails: true }, true), {
    showName: false, showDetails: true, visible: true, height: 34, space: 36, sidePadding: 18,
  });
  assert.deepEqual(labelLayout({ showLabels: true, showAgentDetails: false }, true), {
    showName: true, showDetails: false, visible: true, height: 34, space: 36, sidePadding: 18,
  });
});

test('no empty label is rendered when both options are disabled or no details exist', () => {
  assert.equal(labelLayout({ showLabels: false, showAgentDetails: false }, true).visible, false);
  assert.equal(labelLayout({ showLabels: false, showAgentDetails: true }, false).visible, false);
});

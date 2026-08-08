'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assignAvatars } = require('../src/renderer/avatar-assignment.js');

const agents = [{ id: 'main' }, { id: 'scout' }, { id: 'builder' }];
const avatars = [{ id: 'ghost' }, { id: 'owl' }, { id: 'fox' }];

test('assigns each enabled avatar once before repeating one in random mode', () => {
  const values = [...assignAvatars(agents, avatars, 'random').values()].map((avatar) => avatar.id);
  assert.equal(new Set(values).size, 3);
});

test('keeps the random-looking assignment stable for an unchanged roster', () => {
  const first = [...assignAvatars(agents, avatars, 'random').entries()];
  const second = [...assignAvatars(agents, avatars, 'random').entries()];
  assert.deepEqual(first, second);
});

test('repeats only after all enabled avatars have been assigned', () => {
  const values = [...assignAvatars([...agents, { id: 'reviewer' }, { id: 'tester' }], avatars, 'random').values()]
    .map((avatar) => avatar.id);
  assert.equal(new Set(values.slice(0, 3)).size, 3);
});

test('uses one Pet for the main agent and its subagents by default', () => {
  const sessionAgents = [
    { id: 'root-a', sessionId: 'a', isRoot: true },
    { id: 'scout-a', sessionId: 'a' },
    { id: 'root-b', sessionId: 'b', isRoot: true },
    { id: 'builder-b', sessionId: 'b' },
  ];
  const assignments = assignAvatars(sessionAgents, avatars);
  assert.equal(assignments.get('root-a').id, assignments.get('scout-a').id);
  assert.equal(assignments.get('root-b').id, assignments.get('builder-b').id);
  assert.notEqual(assignments.get('root-a').id, assignments.get('root-b').id);
});

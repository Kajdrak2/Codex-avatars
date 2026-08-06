'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentStore } = require('../src/core/agent-store.cjs');

test('tracks independent subagents and removes them after the completion animation', () => {
  const store = new AgentStore({ completionGraceMs: 100 });
  store.apply({ kind: 'session.started', sessionId: 's1', project: 'alpha', timestamp: 1 });
  store.apply({ kind: 'agent.started', sessionId: 's1', agentId: 'a1', agentType: 'reviewer', timestamp: 2 });
  store.apply({ kind: 'agent.started', sessionId: 's1', agentId: 'a2', agentType: 'tester', timestamp: 3 });

  let snapshot = store.snapshot();
  assert.equal(snapshot.sessions.length, 1);
  assert.equal(snapshot.sessions[0].agents.length, 3);
  assert.equal(snapshot.sessions[0].agents[1].id, 'a1');
  assert.equal(snapshot.sessions[0].agents[2].id, 'a2');

  store.apply({ kind: 'agent.stopped', sessionId: 's1', agentId: 'a1', agentType: 'reviewer', timestamp: 10 });
  snapshot = store.snapshot();
  assert.equal(snapshot.sessions[0].agents.find((agent) => agent.id === 'a1').status, 'done');
  assert.equal(store.cleanup(109), false);
  assert.equal(store.cleanup(110), true);
  assert.equal(store.snapshot().sessions[0].agents.some((agent) => agent.id === 'a1'), false);
});

test('marks the root agent when a session needs attention', () => {
  const store = new AgentStore();
  store.apply({ kind: 'session.attention', sessionId: 's2', project: 'beta', timestamp: 5 });
  const root = store.snapshot().sessions[0].agents[0];
  assert.equal(root.isRoot, true);
  assert.equal(root.status, 'attention');
});

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

test('records model and effort on the main agent when available', () => {
  const store = new AgentStore();
  store.apply({ kind: 'session.started', sessionId: 'root-model', model: 'gpt-5.6-sol', effort: 'high', timestamp: 1 });
  const root = store.snapshot().sessions[0].agents[0];
  assert.equal(root.model, 'gpt-5.6-sol');
  assert.equal(root.effort, 'high');
});

test('replaces the main-agent fallback with the Codex task title', () => {
  const store = new AgentStore();
  store.apply({ kind: 'session.started', sessionId: '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757', project: 'avatars', timestamp: 1 });
  let root = store.snapshot().sessions[0].agents[0];
  assert.equal(root.label, 'avatars · 8757');
  store.apply({
    kind: 'agent.metadata', sessionId: '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757',
    isRoot: true, agentLabel: 'Continue Codex Avatars', timestamp: 2,
  });
  root = store.snapshot().sessions[0].agents[0];
  assert.equal(root.label, 'Continue Codex Avatars');
});

test('replaces a generic profile with local task, model, and effort metadata', () => {
  const store = new AgentStore();
  store.apply({ kind: 'agent.started', sessionId: 's3', agentId: '019fe0d3-3d8e-7001', agentType: 'default', timestamp: 1 });
  let agent = store.snapshot().sessions[0].agents[1];
  assert.match(agent.label, /^Agent /);
  store.apply({
    kind: 'agent.metadata', sessionId: 's3', agentId: agent.id, agentLabel: 'UX scout',
    model: 'gpt-5.6-terra', effort: 'high', timestamp: 2,
  });
  agent = store.snapshot().sessions[0].agents[1];
  assert.equal(agent.label, 'UX scout');
  assert.equal(agent.model, 'gpt-5.6-terra');
  assert.equal(agent.effort, 'high');
});

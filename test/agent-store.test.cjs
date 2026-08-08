'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentStore } = require('../src/core/agent-store.cjs');

test('tracks independent subagents and retains them as bounded dormant agents after completion', () => {
  const store = new AgentStore({ completionGraceMs: 100, dormantRetentionMs: 500, maxDormantAgents: 10 });
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
  assert.equal(store.snapshot().sessions[0].agents.find((agent) => agent.id === 'a1').status, 'dormant');
  assert.equal(store.cleanup(609), false);
  assert.equal(store.cleanup(610), true);
  assert.equal(store.snapshot().sessions[0].agents.some((agent) => agent.id === 'a1'), false);
});

test('expires idle roots but reactivation clears their dormant deadline', () => {
  const store = new AgentStore({ dormantRetentionMs: 100, maxDormantAgents: 10 });
  store.apply({ kind: 'session.started', sessionId: 'sleeping', project: 'alpha', timestamp: 1 });
  store.apply({ kind: 'session.idle', sessionId: 'sleeping', project: 'alpha', timestamp: 10 });
  assert.equal(store.snapshot().sessions[0].agents[0].status, 'idle');
  store.apply({ kind: 'session.working', sessionId: 'sleeping', timestamp: 50 });
  assert.equal(store.cleanup(500), false);
  assert.equal(store.snapshot().sessions[0].agents[0].status, 'working');
});

test('does not resurrect an unknown session from delayed terminal events', () => {
  const store = new AgentStore({ dormantRetentionMs: 100 });
  assert.equal(store.apply({ kind: 'session.ended', sessionId: 'finished', timestamp: 1 }), false);
  assert.equal(store.apply({ kind: 'session.idle', sessionId: 'finished', timestamp: 2 }), false);
  assert.equal(store.apply({ kind: 'agent.stopped', sessionId: 'finished', agentId: 'child', timestamp: 3 }), false);
  assert.deepEqual(store.snapshot().sessions, []);
});

test('a subagent start wakes an idle main agent', () => {
  const store = new AgentStore({ dormantRetentionMs: 100 });
  store.apply({ kind: 'session.idle', sessionId: 'parent', timestamp: 10 });
  store.apply({ kind: 'agent.started', sessionId: 'parent', agentId: 'child', timestamp: 20 });
  const [root, child] = store.snapshot().sessions[0].agents;
  assert.equal(root.status, 'working');
  assert.equal(child.status, 'working');
  assert.equal(store.cleanup(1_000), false);
});

test('an idle root never expires while a subagent is still active', () => {
  const store = new AgentStore({ dormantRetentionMs: 100, maxDormantAgents: 10 });
  store.apply({ kind: 'agent.started', sessionId: 'mixed', agentId: 'active-child', timestamp: 10 });
  store.apply({ kind: 'session.idle', sessionId: 'mixed', timestamp: 20 });
  assert.equal(store.cleanup(1_000), false);
  const agents = store.snapshot().sessions[0].agents;
  assert.equal(agents.find((agent) => agent.isRoot).status, 'idle');
  assert.equal(agents.find((agent) => !agent.isRoot).status, 'working');
});

test('evicts the oldest dormant sessions when the cap is exceeded', () => {
  const store = new AgentStore({ dormantRetentionMs: 10_000, maxDormantAgents: 2 });
  store.apply({ kind: 'session.started', sessionId: 'oldest', timestamp: 1 });
  store.apply({ kind: 'session.started', sessionId: 'middle', timestamp: 2 });
  store.apply({ kind: 'session.started', sessionId: 'newest', timestamp: 3 });
  store.apply({ kind: 'session.idle', sessionId: 'oldest', timestamp: 10 });
  store.apply({ kind: 'session.idle', sessionId: 'middle', timestamp: 20 });
  store.apply({ kind: 'session.idle', sessionId: 'newest', timestamp: 30 });
  assert.equal(store.cleanup(30), true);
  const ids = store.snapshot().sessions.map((session) => session.id);
  assert.deepEqual(ids, ['middle', 'newest']);
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

test('prefers model and effort from the latest explicit lifecycle event', () => {
  const store = new AgentStore();
  store.apply({ kind: 'session.started', sessionId: 'current-model', model: 'gpt-5.6-terra', effort: 'medium', timestamp: 1 });
  store.apply({ kind: 'session.working', sessionId: 'current-model', model: 'gpt-5.6-sol', effort: 'high', timestamp: 2 });
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

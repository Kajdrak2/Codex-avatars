'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { reconcileAgentActivityRecords } = require('../src/core/agent-activity-reconciler.cjs');
const { AgentStore } = require('../src/core/agent-store.cjs');

function rootRecord(sessionId, activity, activityAt, project) {
  return {
    sessionId,
    agentId: sessionId,
    isRoot: true,
    activity,
    activityAt,
    project,
    metadata: { model: 'gpt-5.6-terra', effort: 'medium' },
  };
}

test('adds and independently updates multiple concurrently working root tasks', () => {
  const store = new AgentStore();
  const result = reconcileAgentActivityRecords(store, [
    rootRecord('session-one', 'working', 100, 'avatars'),
    rootRecord('session-two', 'working', 110, 'router'),
  ]);
  assert.deepEqual(result, { changed: true, discoveredRoot: true });
  let roots = store.snapshot().sessions.map((session) => session.agents.find((agent) => agent.isRoot));
  assert.equal(roots.filter((agent) => agent.status === 'working').length, 2);

  assert.deepEqual(reconcileAgentActivityRecords(store, [
    rootRecord('session-two', 'idle', 120, 'router'),
  ]), { changed: true, discoveredRoot: false });
  roots = store.snapshot().sessions.map((session) => session.agents.find((agent) => agent.isRoot));
  assert.equal(roots.filter((agent) => agent.status === 'working').length, 1);
  assert.equal(roots.find((agent) => agent.id === 'root:session-two').status, 'idle');
});

test('ignores stale activity and never creates an unknown task from a terminal state', () => {
  const store = new AgentStore();
  reconcileAgentActivityRecords(store, [rootRecord('known', 'working', 200, 'avatars')]);
  assert.deepEqual(reconcileAgentActivityRecords(store, [
    rootRecord('known', 'idle', 150, 'avatars'),
    rootRecord('unknown', 'idle', 300, 'finished'),
  ]), { changed: false, discoveredRoot: false });
  assert.deepEqual(store.snapshot().sessions.map((session) => session.id), ['known']);
  assert.equal(store.snapshot().sessions[0].agents[0].status, 'working');
});

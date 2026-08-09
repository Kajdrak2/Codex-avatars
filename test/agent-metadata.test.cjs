'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  AgentMetadataResolver,
  ThreadTitleMonitor,
  readRecentAgentActivityRecords,
  readRecentAgentRecords,
  readThreadName,
  readThreadNames,
  rolloutActivityFromRecords,
  safeThreadName,
  taskLabelFromPath,
} = require('../src/core/agent-metadata.cjs');

test('turns collaboration task paths into useful labels', () => {
  assert.equal(taskLabelFromPath('/root/ux_scout'), 'UX scout');
  assert.equal(taskLabelFromPath('/root/bug_scout'), 'Bug scout');
  assert.equal(taskLabelFromPath('/root'), null);
});

test('extracts only task, model, and effort metadata from a local rollout', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-metadata-'));
  const day = path.join(root, '2026', '08', '08');
  const id = '019fe0d3-3d8e-7001-909f-941e3f0a945e';
  await fs.mkdir(day, { recursive: true });
  await fs.writeFile(path.join(day, `rollout-test-${id}.jsonl`), [
    JSON.stringify({ type: 'session_meta', payload: { id, agent_path: '/root/ux_scout', agent_nickname: 'Boyle', secret: 'ignored' } }),
    JSON.stringify({ type: 'response_item', payload: { prompt: 'never returned' } }),
    JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5.6-terra', effort: 'high' } }),
  ].join('\n'));
  const resolver = new AgentMetadataResolver(root, { retryDelays: [0] });
  assert.deepEqual(await resolver.resolve(id), {
    label: 'UX scout', nickname: 'Boyle', model: 'gpt-5.6-terra', effort: 'high',
  });
  await fs.rm(root, { recursive: true, force: true });
});

test('hydrates recently active roots and subagents without waiting for another hook', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-recent-'));
  const day = path.join(root, '2026', '08', '08');
  const sessionId = '019fe0d3-3d8e-7001-909f-941e3f0a945e';
  const agentId = '019fe0d3-3d8e-7001-909f-941e3f0a945f';
  await fs.mkdir(day, { recursive: true });
  await fs.writeFile(path.join(day, `rollout-root-${sessionId}.jsonl`), [
    JSON.stringify({ type: 'session_meta', payload: { id: sessionId, session_id: sessionId } }),
    JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5.6-sol', effort: 'high' } }),
  ].join('\n'));
  await fs.writeFile(path.join(day, `rollout-agent-${agentId}.jsonl`), [
    JSON.stringify({ type: 'session_meta', payload: {
      id: agentId, session_id: sessionId, agent_path: '/root/ux_scout',
      source: { subagent: { thread_spawn: { parent_thread_id: sessionId, agent_path: '/root/ux_scout' } } },
    } }),
    JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5.6-terra', effort: 'medium' } }),
  ].join('\n'));
  const records = await readRecentAgentRecords(root, { maxAgeMs: 60_000 });
  assert.deepEqual(records.map((record) => ({
    sessionId: record.sessionId, agentId: record.agentId, isRoot: record.isRoot, label: record.metadata.label,
  })).sort((left, right) => Number(left.isRoot) - Number(right.isRoot)), [
    { sessionId, agentId, isRoot: false, label: 'UX scout' },
    { sessionId, agentId: sessionId, isRoot: true, label: null },
  ]);
  await fs.rm(root, { recursive: true, force: true });
});

test('reconciles two concurrently working root tasks and observes completion from rollout state', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-activity-'));
  const day = path.join(root, '2026', '08', '09');
  const first = '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757';
  const second = '019fe095-b10e-7832-8d14-f2dd72119b40';
  const firstPath = path.join(day, `rollout-first-${first}.jsonl`);
  const secondPath = path.join(day, `rollout-second-${second}.jsonl`);
  await fs.mkdir(day, { recursive: true });
  const workingRecords = (id, cwd) => [
    JSON.stringify({ timestamp: '2026-08-09T11:00:00.000Z', type: 'session_meta', payload: { id, session_id: id, cwd } }),
    JSON.stringify({ timestamp: '2026-08-09T11:00:01.000Z', type: 'turn_context', payload: { model: 'gpt-5.6-terra', effort: 'medium' } }),
    JSON.stringify({ timestamp: '2026-08-09T11:00:02.000Z', type: 'event_msg', payload: { type: 'user_message' } }),
    JSON.stringify({ timestamp: '2026-08-09T11:00:03.000Z', type: 'response_item', payload: { type: 'message', phase: 'commentary' } }),
  ].join('\n');
  await fs.writeFile(firstPath, workingRecords(first, 'C:\\Projects\\avatars'));
  await fs.writeFile(secondPath, workingRecords(second, 'C:\\Projects\\router'));

  const cache = new Map();
  let records = await readRecentAgentActivityRecords(root, {
    cache, changedOnly: true, maxAgeMs: 60_000,
  });
  assert.deepEqual(records.map((record) => ({
    id: record.sessionId, activity: record.activity, project: record.project,
  })).sort((left, right) => left.id.localeCompare(right.id)), [
    { id: first, activity: 'working', project: 'avatars' },
    { id: second, activity: 'working', project: 'router' },
  ]);
  assert.deepEqual(await readRecentAgentActivityRecords(root, {
    cache, changedOnly: true, maxAgeMs: 60_000,
  }), []);

  await fs.appendFile(secondPath, `\n${JSON.stringify({
    timestamp: '2026-08-09T11:00:04.000Z',
    type: 'event_msg',
    payload: { type: 'agent_message', phase: 'final_answer' },
  })}`);
  records = await readRecentAgentActivityRecords(root, {
    cache, changedOnly: true, maxAgeMs: 60_000,
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].sessionId, second);
  assert.equal(records[0].activity, 'idle');
  await fs.rm(root, { recursive: true, force: true });
});

test('classifies aborted turns as idle without letting trailing token counts wake them', () => {
  assert.deepEqual(rolloutActivityFromRecords([
    { timestamp: '2026-08-09T11:00:00.000Z', type: 'turn_context', payload: {} },
    { timestamp: '2026-08-09T11:00:01.000Z', type: 'event_msg', payload: { type: 'agent_reasoning' } },
    { timestamp: '2026-08-09T11:00:02.000Z', type: 'event_msg', payload: { type: 'turn_aborted' } },
    { timestamp: '2026-08-09T11:00:03.000Z', type: 'event_msg', payload: { type: 'token_count' } },
  ], 0), {
    activity: 'idle',
    activityAt: Date.parse('2026-08-09T11:00:02.000Z'),
  });
});

test('refreshes metadata from the latest turn context instead of keeping the creation context', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-latest-metadata-'));
  const day = path.join(root, '2026', '08', '08');
  const id = '019fe0d3-3d8e-7001-909f-941e3f0a945f';
  const rollout = path.join(day, `rollout-test-${id}.jsonl`);
  await fs.mkdir(day, { recursive: true });
  await fs.writeFile(rollout, [
    JSON.stringify({ type: 'session_meta', payload: { id, agent_path: '/root/scout' } }),
    JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5.6-terra', effort: 'medium' } }),
    JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5.6-sol', effort: 'high' } }),
  ].join('\n'));
  const resolver = new AgentMetadataResolver(root, { retryDelays: [0] });
  assert.deepEqual(await resolver.resolve(id), {
    label: 'Scout', nickname: null, model: 'gpt-5.6-sol', effort: 'high',
  });
  await fs.appendFile(rollout, `\n${JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5.6-terra', effort: 'low' } })}`);
  assert.deepEqual(await resolver.resolve(id, { refresh: true }), {
    label: 'Scout', nickname: null, model: 'gpt-5.6-terra', effort: 'low',
  });
  await fs.rm(root, { recursive: true, force: true });
});

test('labels a main agent from the local Codex task-title index', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-root-metadata-'));
  const sessions = path.join(root, 'sessions');
  const day = path.join(sessions, '2026', '08', '08');
  const id = '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757';
  const indexPath = path.join(root, 'session_index.jsonl');
  await fs.mkdir(day, { recursive: true });
  await fs.writeFile(indexPath, [
    JSON.stringify({ id: 'different-task', thread_name: 'Ignore me' }),
    JSON.stringify({ id, thread_name: '  Continue   Codex Avatars  ' }),
  ].join('\n'));
  await fs.writeFile(path.join(day, `rollout-test-${id}.jsonl`), [
    JSON.stringify({ type: 'session_meta', payload: { id, secret: 'ignored' } }),
    JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5.6-sol', effort: 'high' } }),
  ].join('\n'));
  const resolver = new AgentMetadataResolver(sessions, { retryDelays: [0] });
  assert.deepEqual(await resolver.resolve(id, { isRoot: true }), {
    label: 'Continue Codex Avatars', nickname: null, model: 'gpt-5.6-sol', effort: 'high',
  });
  assert.equal(await readThreadName(indexPath, id), 'Continue Codex Avatars');
  await fs.appendFile(indexPath, `\n${JSON.stringify({ id, thread_name: 'Codex Avatars' })}`);
  assert.equal((await resolver.resolve(id, { isRoot: true })).label, 'Continue Codex Avatars');
  assert.equal((await resolver.refreshThreadNames([id])).get(id), 'Codex Avatars');
  assert.equal((await resolver.resolve(id, { isRoot: true })).label, 'Codex Avatars');
  assert.equal(safeThreadName('  A\n task  '), 'A task');
  await fs.rm(root, { recursive: true, force: true });
});

test('reads the latest valid titles for multiple tasks in one pass', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-title-index-'));
  const indexPath = path.join(root, 'session_index.jsonl');
  const first = '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757';
  const second = '019fd6b6-6e4f-71f0-a2ad-e46cc2f08758';
  await fs.writeFile(indexPath, [
    JSON.stringify({ id: first, thread_name: 'Old title' }),
    '{"id":"partial',
    JSON.stringify({ id: second, thread_name: 'Second task' }),
    JSON.stringify({ id: first, thread_name: 'Renamed task' }),
  ].join('\n'));
  const titles = await readThreadNames(indexPath, [first, second, 'invalid']);
  assert.deepEqual([...titles], [[first, 'Renamed task'], [second, 'Second task']]);
  await fs.rm(root, { recursive: true, force: true });
});

test('title monitor coalesces a burst, keeps the newest read, and stops cleanly', async () => {
  const id = '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757';
  const pendingReads = [];
  const applied = [];
  let listener = null;
  let unwatched = false;
  const monitor = new ThreadTitleMonitor('session_index.jsonl', {
    interval: 25,
    getThreadIds: () => [id],
    watchFile: (filePath, options, callback) => {
      assert.equal(filePath, 'session_index.jsonl');
      assert.deepEqual(options, { interval: 25, persistent: false });
      listener = callback;
    },
    unwatchFile: (filePath, callback) => {
      assert.equal(filePath, 'session_index.jsonl');
      assert.equal(callback, listener);
      unwatched = true;
    },
    readTitles: () => new Promise((resolve) => pendingReads.push(resolve)),
    onTitles: (titles) => applied.push(titles.get(id)),
  });

  monitor.start();
  assert.equal(pendingReads.length, 1);
  const burst = Array.from({ length: 20 }, () => monitor.refresh());
  for (let index = 0; index < 20; index += 1) listener();
  assert.equal(pendingReads.length, 1);
  pendingReads[0](new Map([[id, 'Stale title']]));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pendingReads.length, 2);
  pendingReads[1](new Map([[id, 'Newest title']]));
  assert.deepEqual(await Promise.all(burst), Array(20).fill(true));
  assert.deepEqual(applied, ['Newest title']);

  monitor.close();
  assert.equal(unwatched, true);
  listener();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pendingReads.length, 2);
});

test('title monitor observes an appended Codex rename without a lifecycle event', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-title-monitor-'));
  const indexPath = path.join(root, 'session_index.jsonl');
  const id = '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757';
  await fs.writeFile(indexPath, JSON.stringify({ id, thread_name: 'Original title' }));

  let initialResolve;
  const initial = new Promise((resolve) => { initialResolve = resolve; });
  let renamedResolve;
  let renamedReject;
  const renamed = new Promise((resolve, reject) => {
    renamedResolve = resolve;
    renamedReject = reject;
  });
  const timeout = setTimeout(() => renamedReject(new Error('Timed out waiting for title refresh')), 2_000);
  const monitor = new ThreadTitleMonitor(indexPath, {
    interval: 20,
    getThreadIds: () => [id],
    onTitles: (titles) => {
      if (titles.get(id) === 'Original title') initialResolve();
      if (titles.get(id) === 'Renamed immediately') renamedResolve();
    },
  });

  try {
    monitor.start();
    await Promise.race([initial, renamed]);
    await fs.appendFile(indexPath, `\n${JSON.stringify({ id, thread_name: 'Renamed immediately' })}`);
    await renamed;
  } finally {
    clearTimeout(timeout);
    monitor.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});

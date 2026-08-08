'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  AgentMetadataResolver,
  ThreadTitleMonitor,
  readThreadName,
  readThreadNames,
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

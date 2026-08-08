'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { AgentMetadataResolver, readThreadName, safeThreadName, taskLabelFromPath } = require('../src/core/agent-metadata.cjs');

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

test('labels a main agent from the local Codex task-title index', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatar-root-metadata-'));
  const sessions = path.join(root, 'sessions');
  const day = path.join(sessions, '2026', '08', '08');
  const id = '019fd6b6-6e4f-71f0-a2ad-e46cc2f08757';
  await fs.mkdir(day, { recursive: true });
  await fs.writeFile(path.join(root, 'session_index.jsonl'), [
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
  assert.equal(await readThreadName(path.join(root, 'session_index.jsonl'), id), 'Continue Codex Avatars');
  assert.equal(safeThreadName('  A\n task  '), 'A task');
  await fs.rm(root, { recursive: true, force: true });
});

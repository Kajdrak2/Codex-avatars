'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHookEvent, projectNameFromCwd } = require('../src/core/event-normalizer.cjs');

test('normalizes a SubagentStart event without copying sensitive fields', () => {
  const event = normalizeHookEvent({
    hook_event_name: 'SubagentStart',
    session_id: 'session-1',
    turn_id: 'turn-1',
    cwd: 'C:\\Users\\demo\\project-alpha',
    agent_id: 'agent-7',
    agent_type: 'test_runner',
    prompt: 'must not escape',
    last_assistant_message: 'must not escape either',
  }, 1234);

  assert.deepEqual(event, {
    kind: 'agent.started',
    sessionId: 'session-1',
    turnId: 'turn-1',
    project: 'project-alpha',
    cwd: 'C:\\Users\\demo\\project-alpha',
    timestamp: 1234,
    agentId: 'agent-7',
    agentType: 'test_runner',
  });
  assert.equal('prompt' in event, false);
  assert.equal('last_assistant_message' in event, false);
});

test('rejects unsupported and malformed events', () => {
  assert.equal(normalizeHookEvent(null), null);
  assert.equal(normalizeHookEvent({ hook_event_name: 'PreToolUse', session_id: 's' }), null);
  assert.equal(normalizeHookEvent({ hook_event_name: 'SubagentStart', session_id: 's' }), null);
});

test('extracts project names from Windows and POSIX paths', () => {
  assert.equal(projectNameFromCwd('C:\\Work\\slime'), 'slime');
  assert.equal(projectNameFromCwd('/work/slime/'), 'slime');
  assert.equal(projectNameFromCwd(null), 'Codex');
});

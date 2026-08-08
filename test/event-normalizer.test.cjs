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
    timestamp: 1234,
    agentId: 'agent-7',
    agentType: 'test_runner',
  });
  assert.equal('prompt' in event, false);
  assert.equal('last_assistant_message' in event, false);
  assert.equal('cwd' in event, false);
});

test('accepts a pre-sanitized project name without exposing the source path', () => {
  const event = normalizeHookEvent({
    hook_event_name: 'SessionStart', session_id: 's', project: 'project-beta',
  });
  assert.equal(event.project, 'project-beta');
  assert.equal('cwd' in event, false);
});

test('rejects unsupported and malformed events', () => {
  assert.equal(normalizeHookEvent(null), null);
  assert.equal(normalizeHookEvent({ hook_event_name: 'PreToolUse', session_id: 's' }), null);
  assert.equal(normalizeHookEvent({ hook_event_name: 'SubagentStart', session_id: 's' }), null);
});

test('uses optional non-sensitive agent metadata when Codex exposes it', () => {
  const event = normalizeHookEvent({
    hook_event_name: 'SubagentStart', session_id: 's', agent_id: 'a', agent_type: 'default',
    agent_name: 'Bug scout', model: 'gpt-5.6-terra', reasoning_effort: 'medium',
  });
  assert.equal(event.agentLabel, 'Bug scout');
  assert.equal(event.model, 'gpt-5.6-terra');
  assert.equal(event.effort, 'medium');
});

test('extracts project names from Windows and POSIX paths', () => {
  assert.equal(projectNameFromCwd('C:\\Work\\slime'), 'slime');
  assert.equal(projectNameFromCwd('/work/slime/'), 'slime');
  assert.equal(projectNameFromCwd(null), 'Codex');
});

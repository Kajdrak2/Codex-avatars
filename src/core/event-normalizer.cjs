'use strict';

const path = require('node:path');

const SUPPORTED_EVENTS = new Set([
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'Stop',
  'PermissionRequest',
  'SubagentStart',
  'SubagentStop',
]);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function projectNameFromCwd(cwd) {
  const value = nonEmptyString(cwd);
  if (!value) return 'Codex';

  const normalized = value.replace(/[\\/]+$/, '');
  return path.win32.basename(normalized) || path.posix.basename(normalized) || 'Codex';
}

/**
 * Converts a Codex hook payload into the deliberately small internal protocol.
 * Prompt text, tool arguments, transcripts, and assistant messages are never
 * copied into the returned event.
 */
function normalizeHookEvent(payload, timestamp = Date.now()) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const hookName = nonEmptyString(payload.hook_event_name ?? payload.hookEventName);
  const sessionId = nonEmptyString(payload.session_id ?? payload.sessionId);
  if (!hookName || !sessionId || !SUPPORTED_EVENTS.has(hookName)) return null;

  const cwd = nonEmptyString(payload.cwd);
  const base = {
    sessionId,
    turnId: nonEmptyString(payload.turn_id ?? payload.turnId),
    project: projectNameFromCwd(cwd),
    cwd,
    timestamp,
  };

  switch (hookName) {
    case 'SessionStart':
      return { ...base, kind: 'session.started' };
    case 'SessionEnd':
      return { ...base, kind: 'session.ended' };
    case 'UserPromptSubmit':
      return { ...base, kind: 'session.working' };
    case 'Stop':
      return { ...base, kind: 'session.idle' };
    case 'PermissionRequest':
      return { ...base, kind: 'session.attention' };
    case 'SubagentStart': {
      const agentId = nonEmptyString(payload.agent_id ?? payload.agentId);
      if (!agentId) return null;
      return {
        ...base,
        kind: 'agent.started',
        agentId,
        agentType: nonEmptyString(payload.agent_type ?? payload.agentType) || 'subagent',
      };
    }
    case 'SubagentStop': {
      const agentId = nonEmptyString(payload.agent_id ?? payload.agentId);
      if (!agentId) return null;
      return {
        ...base,
        kind: 'agent.stopped',
        agentId,
        agentType: nonEmptyString(payload.agent_type ?? payload.agentType) || 'subagent',
      };
    }
    default:
      return null;
  }
}

module.exports = {
  normalizeHookEvent,
  projectNameFromCwd,
  SUPPORTED_EVENTS,
};

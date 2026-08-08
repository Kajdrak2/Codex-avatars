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

function agentMetadata(payload) {
  const result = {};
  const agentLabel = nonEmptyString(payload.agent_name ?? payload.agentName ?? payload.task_name ?? payload.taskName);
  const model = nonEmptyString(payload.model);
  const effort = nonEmptyString(payload.reasoning_effort ?? payload.reasoningEffort ?? payload.effort);
  if (agentLabel) result.agentLabel = agentLabel;
  if (model) result.model = model;
  if (effort) result.effort = effort;
  return result;
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

  const projectSource = nonEmptyString(payload.project) || nonEmptyString(payload.cwd);
  const base = {
    sessionId,
    turnId: nonEmptyString(payload.turn_id ?? payload.turnId),
    project: projectNameFromCwd(projectSource),
    timestamp,
  };

  switch (hookName) {
    case 'SessionStart':
      return { ...base, kind: 'session.started', ...agentMetadata(payload) };
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
        ...agentMetadata(payload),
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
        ...agentMetadata(payload),
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

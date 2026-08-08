'use strict';

const { COMPLETION_GRACE_MS } = require('./constants.cjs');

function titleFromType(type) {
  return String(type || 'subagent')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function copyAgent(agent) {
  return {
    id: agent.id,
    type: agent.type,
    label: agent.label,
    nickname: agent.nickname || null,
    model: agent.model || null,
    effort: agent.effort || null,
    status: agent.status,
    isRoot: agent.isRoot,
    startedAt: agent.startedAt,
    updatedAt: agent.updatedAt,
  };
}

function fallbackAgentLabel(agentId, type) {
  const normalized = String(type || 'subagent').trim().toLowerCase();
  if (normalized && !['default', 'subagent'].includes(normalized)) return titleFromType(type);
  const suffix = String(agentId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return suffix ? `Agent ${suffix}` : 'Agent';
}

function fallbackRootLabel(sessionId, project) {
  const base = String(project || 'Codex').trim() || 'Codex';
  const suffix = String(sessionId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return suffix ? `${base} · ${suffix}` : base;
}

class AgentStore {
  constructor(options = {}) {
    this.sessions = new Map();
    this.completionGraceMs = options.completionGraceMs ?? COMPLETION_GRACE_MS;
  }

  apply(event) {
    if (!event || !event.kind || !event.sessionId) return false;
    const session = this.#ensureSession(event);
    const timestamp = event.timestamp ?? Date.now();

    switch (event.kind) {
      case 'session.started':
      case 'session.working':
        session.status = 'working';
        session.endedAt = null;
        this.#setRootStatus(session, 'working', timestamp);
        this.#setRootMetadata(session, event);
        break;
      case 'session.idle':
        session.status = 'idle';
        this.#setRootStatus(session, 'idle', timestamp);
        break;
      case 'session.attention':
        session.status = 'attention';
        this.#setRootStatus(session, 'attention', timestamp);
        break;
      case 'session.ended':
        session.status = 'done';
        session.endedAt = timestamp;
        for (const agent of session.agents.values()) {
          agent.status = 'done';
          agent.updatedAt = timestamp;
          agent.removeAt = timestamp + this.completionGraceMs;
        }
        break;
      case 'agent.started': {
        const existing = session.agents.get(event.agentId);
        session.status = 'working';
        session.agents.set(event.agentId, {
          id: event.agentId,
          type: event.agentType || existing?.type || 'subagent',
          label: event.agentLabel || existing?.label
            || fallbackAgentLabel(event.agentId, event.agentType || existing?.type),
          nickname: event.agentNickname || existing?.nickname || null,
          model: event.model || existing?.model || null,
          effort: event.effort || existing?.effort || null,
          status: 'working',
          isRoot: false,
          startedAt: existing?.startedAt ?? timestamp,
          updatedAt: timestamp,
          removeAt: null,
        });
        break;
      }
      case 'agent.stopped': {
        const existing = session.agents.get(event.agentId);
        session.agents.set(event.agentId, {
          id: event.agentId,
          type: event.agentType || existing?.type || 'subagent',
          label: event.agentLabel || existing?.label
            || fallbackAgentLabel(event.agentId, event.agentType || existing?.type),
          nickname: event.agentNickname || existing?.nickname || null,
          model: event.model || existing?.model || null,
          effort: event.effort || existing?.effort || null,
          status: 'done',
          isRoot: false,
          startedAt: existing?.startedAt ?? timestamp,
          updatedAt: timestamp,
          removeAt: timestamp + this.completionGraceMs,
        });
        break;
      }
      case 'agent.metadata': {
        const agentKey = event.isRoot ? `root:${event.sessionId}` : event.agentId;
        const existing = session.agents.get(agentKey);
        if (!existing) return false;
        if (event.agentLabel) existing.label = event.agentLabel;
        if (event.agentNickname) existing.nickname = event.agentNickname;
        if (event.model) existing.model = event.model;
        if (event.effort) existing.effort = event.effort;
        existing.updatedAt = timestamp;
        break;
      }
      default:
        return false;
    }

    session.updatedAt = timestamp;
    if (event.turnId) session.turnId = event.turnId;
    return true;
  }

  cleanup(timestamp = Date.now()) {
    let changed = false;

    for (const [sessionId, session] of this.sessions) {
      for (const [agentId, agent] of session.agents) {
        if (!agent.isRoot && agent.removeAt && agent.removeAt <= timestamp) {
          session.agents.delete(agentId);
          changed = true;
        }
      }

      const root = session.agents.get(`root:${sessionId}`);
      const hasSubagents = [...session.agents.values()].some((agent) => !agent.isRoot);
      if (session.endedAt && !hasSubagents && root?.removeAt <= timestamp) {
        this.sessions.delete(sessionId);
        changed = true;
      }
    }

    return changed;
  }

  removeSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  snapshot() {
    return {
      sessions: [...this.sessions.values()]
        .sort((a, b) => a.startedAt - b.startedAt)
        .map((session) => ({
          id: session.id,
          project: session.project,
          status: session.status,
          startedAt: session.startedAt,
          updatedAt: session.updatedAt,
          agents: [...session.agents.values()]
            .sort((a, b) => Number(b.isRoot) - Number(a.isRoot) || a.startedAt - b.startedAt)
            .map(copyAgent),
        })),
    };
  }

  #ensureSession(event) {
    const timestamp = event.timestamp ?? Date.now();
    let session = this.sessions.get(event.sessionId);

    if (!session) {
      session = {
        id: event.sessionId,
        project: event.project || 'Codex',
        status: 'working',
        startedAt: timestamp,
        updatedAt: timestamp,
        endedAt: null,
        turnId: event.turnId || null,
        agents: new Map(),
      };
      session.agents.set(`root:${event.sessionId}`, {
        id: `root:${event.sessionId}`,
        type: 'main',
        label: event.agentLabel || fallbackRootLabel(event.sessionId, event.project),
        nickname: null,
        model: null,
        effort: null,
        status: 'working',
        isRoot: true,
        startedAt: timestamp,
        updatedAt: timestamp,
        removeAt: null,
      });
      this.sessions.set(event.sessionId, session);
    } else {
      if (event.project) session.project = event.project;
    }

    return session;
  }

  #setRootStatus(session, status, timestamp) {
    const root = session.agents.get(`root:${session.id}`);
    if (!root) return;
    root.status = status;
    root.updatedAt = timestamp;
    root.removeAt = status === 'done' ? timestamp + this.completionGraceMs : null;
  }

  #setRootMetadata(session, event) {
    const root = session.agents.get(`root:${session.id}`);
    if (!root) return;
    if (event.agentLabel) root.label = event.agentLabel;
    if (event.model) root.model = event.model;
    if (event.effort) root.effort = event.effort;
  }
}

module.exports = {
  AgentStore,
  fallbackAgentLabel,
  fallbackRootLabel,
  titleFromType,
};

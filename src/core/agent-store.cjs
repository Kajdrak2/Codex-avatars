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
    status: agent.status,
    isRoot: agent.isRoot,
    startedAt: agent.startedAt,
    updatedAt: agent.updatedAt,
  };
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
          label: titleFromType(event.agentType || existing?.type || 'subagent'),
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
          label: titleFromType(event.agentType || existing?.type || 'subagent'),
          status: 'done',
          isRoot: false,
          startedAt: existing?.startedAt ?? timestamp,
          updatedAt: timestamp,
          removeAt: timestamp + this.completionGraceMs,
        });
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

  snapshot() {
    return {
      sessions: [...this.sessions.values()]
        .sort((a, b) => a.startedAt - b.startedAt)
        .map((session) => ({
          id: session.id,
          project: session.project,
          cwd: session.cwd,
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
        cwd: event.cwd || null,
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
        label: 'Main agent',
        status: 'working',
        isRoot: true,
        startedAt: timestamp,
        updatedAt: timestamp,
        removeAt: null,
      });
      this.sessions.set(event.sessionId, session);
    } else {
      if (event.project) session.project = event.project;
      if (event.cwd) session.cwd = event.cwd;
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
}

module.exports = {
  AgentStore,
  titleFromType,
};

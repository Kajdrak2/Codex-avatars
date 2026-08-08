'use strict';

const {
  COMPLETION_GRACE_MS,
  DORMANT_RETENTION_MS,
  MAX_DORMANT_AGENTS,
} = require('./constants.cjs');

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
    this.dormantRetentionMs = options.dormantRetentionMs ?? DORMANT_RETENTION_MS;
    this.maxDormantAgents = options.maxDormantAgents ?? MAX_DORMANT_AGENTS;
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
          agent.dormantAt = null;
          agent.removeAt = timestamp + this.completionGraceMs;
        }
        break;
      case 'agent.started': {
        const existing = session.agents.get(event.agentId);
        session.status = 'working';
        session.endedAt = null;
        this.#setRootStatus(session, 'working', timestamp);
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
          dormantAt: null,
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
          dormantAt: null,
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

    for (const session of this.sessions.values()) {
      for (const agent of session.agents.values()) {
        if (agent.status === 'done' && agent.removeAt && agent.removeAt <= timestamp) {
          agent.status = 'dormant';
          agent.updatedAt = timestamp;
          agent.dormantAt = timestamp;
          agent.removeAt = null;
          changed = true;
        }
      }
      if (session.endedAt && [...session.agents.values()].every((agent) => agent.status === 'dormant')) {
        session.status = 'dormant';
      }
    }

    const dormant = this.#dormantEntries();
    for (const entry of dormant) {
      if (entry.dormantAt + this.dormantRetentionMs <= timestamp) {
        changed = this.#removeDormantEntry(entry) || changed;
      }
    }

    const retained = this.#dormantEntries().sort((left, right) => right.dormantAt - left.dormantAt);
    for (const entry of retained.slice(Math.max(0, this.maxDormantAgents))) {
      changed = this.#removeDormantEntry(entry) || changed;
    }

    return changed;
  }

  removeSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  hasAgent(sessionId, agentId, isRoot = false) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.agents.has(isRoot ? `root:${sessionId}` : agentId);
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
        dormantAt: null,
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
    root.dormantAt = status === 'idle' ? timestamp : null;
    root.removeAt = status === 'done' ? timestamp + this.completionGraceMs : null;
  }

  #dormantEntries() {
    const entries = [];
    for (const [sessionId, session] of this.sessions) {
      for (const [agentId, agent] of session.agents) {
        if (!['idle', 'dormant'].includes(agent.status)) continue;
        if (agent.isRoot && [...session.agents.values()].some((peer) => (
          !peer.isRoot && !['idle', 'dormant'].includes(peer.status)
        ))) continue;
        entries.push({
          sessionId,
          agentId,
          isRoot: agent.isRoot,
          dormantAt: agent.isRoot
            ? Math.max(...[...session.agents.values()]
              .filter((peer) => ['idle', 'dormant'].includes(peer.status))
              .map((peer) => peer.dormantAt ?? peer.updatedAt))
            : (agent.dormantAt ?? agent.updatedAt),
        });
      }
    }
    return entries;
  }

  #removeDormantEntry(entry) {
    const session = this.sessions.get(entry.sessionId);
    if (!session) return false;
    if (entry.isRoot) return this.sessions.delete(entry.sessionId);
    return session.agents.delete(entry.agentId);
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

'use strict';

function reconcileAgentActivityRecords(store, records) {
  if (!store || typeof store.snapshot !== 'function' || typeof store.apply !== 'function') {
    throw new TypeError('A compatible AgentStore is required.');
  }

  let changed = false;
  let discoveredRoot = false;
  for (const record of records || []) {
    if (!record?.sessionId || !record?.agentId) continue;
    const metadata = record.metadata || {};
    const snapshot = store.snapshot();
    const session = snapshot.sessions.find((candidate) => candidate.id === record.sessionId);
    const existing = session?.agents.find((agent) => (
      record.isRoot ? agent.isRoot : agent.id === record.agentId
    ));
    if (existing && record.activityAt < existing.updatedAt) continue;

    if (record.isRoot) {
      if (!existing && record.activity !== 'working') continue;
      const desiredStatus = record.activity === 'working' ? 'working' : 'idle';
      const needsUpdate = !existing
        || existing.status !== desiredStatus
        || (metadata.model && existing.model !== metadata.model)
        || (metadata.effort && existing.effort !== metadata.effort)
        || (record.project && session?.project !== record.project);
      if (!needsUpdate) continue;
      discoveredRoot ||= !existing;
      changed = store.apply({
        kind: record.activity === 'working' ? 'session.working' : 'session.idle',
        sessionId: record.sessionId,
        project: record.project || 'Codex',
        model: metadata.model || null,
        effort: metadata.effort || null,
        timestamp: record.activityAt,
      }) || changed;
      continue;
    }

    if (!existing && record.activity !== 'working') continue;
    const desiredStatus = record.activity === 'working' ? 'working' : 'done';
    const needsUpdate = !existing
      || existing.status !== desiredStatus
      || (metadata.label && existing.label !== metadata.label)
      || (metadata.nickname && existing.nickname !== metadata.nickname)
      || (metadata.model && existing.model !== metadata.model)
      || (metadata.effort && existing.effort !== metadata.effort);
    if (!needsUpdate) continue;
    changed = store.apply({
      kind: record.activity === 'working' ? 'agent.started' : 'agent.stopped',
      sessionId: record.sessionId,
      agentId: record.agentId,
      agentType: 'subagent',
      agentLabel: metadata.label || null,
      agentNickname: metadata.nickname || null,
      model: metadata.model || null,
      effort: metadata.effort || null,
      timestamp: record.activityAt,
    }) || changed;
  }

  return { changed, discoveredRoot };
}

module.exports = { reconcileAgentActivityRecords };

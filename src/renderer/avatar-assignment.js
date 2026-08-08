(function avatarAssignmentModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CodexAvatarAssignment = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function stableHash(value) {
    let result = 2166136261;
    for (const character of String(value)) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function shuffled(items, seed, kind) {
    return [...items].sort((left, right) => {
      const leftScore = stableHash(`${seed}:${kind}:${left.id}`);
      const rightScore = stableHash(`${seed}:${kind}:${right.id}`);
      return leftScore - rightScore || String(left.id).localeCompare(String(right.id));
    });
  }

  function assignAvatars(agents, avatars, mode = 'master') {
    if (!avatars.length) return new Map();
    if (mode === 'master') {
      const groups = new Map();
      for (const agent of agents) {
        const groupId = agent.sessionId || agent.id;
        if (!groups.has(groupId)) groups.set(groupId, []);
        groups.get(groupId).push(agent);
      }
      const groupOrder = shuffled([...groups.keys()].map((id) => ({ id })), [...groups.keys()].sort().join('|'), 'session');
      const avatarOrder = shuffled(avatars, groupOrder.map((group) => group.id).join('|'), 'avatar');
      const assignments = new Map();
      groupOrder.forEach((group, index) => {
        const avatar = avatarOrder[index % avatarOrder.length];
        groups.get(group.id).forEach((agent) => assignments.set(agent.id, avatar));
      });
      return assignments;
    }
    const seed = agents.map((agent) => agent.id).sort().join('|');
    const agentOrder = shuffled(agents, seed, 'agent');
    const avatarOrder = shuffled(avatars, seed, 'avatar');
    const assignments = new Map();
    agentOrder.forEach((agent, index) => assignments.set(agent.id, avatarOrder[index % avatarOrder.length]));
    return assignments;
  }

  return { assignAvatars };
}));

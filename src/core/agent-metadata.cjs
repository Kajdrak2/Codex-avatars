'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,127}$/;
const UPPERCASE_WORDS = new Set(['ai', 'api', 'cli', 'css', 'html', 'qa', 'ui', 'ux']);

function taskLabelFromPath(agentPath) {
  if (typeof agentPath !== 'string' || !agentPath.trim()) return null;
  const segment = agentPath.trim().split('/').filter(Boolean).at(-1);
  if (!segment || segment.toLowerCase() === 'root') return null;
  const words = segment.split(/[_-]+/).filter(Boolean);
  if (words.length === 0) return null;
  return words.map((word, index) => {
    const lower = word.toLowerCase();
    if (UPPERCASE_WORDS.has(lower)) return lower.toUpperCase();
    return index === 0 ? `${lower[0].toUpperCase()}${lower.slice(1)}` : lower;
  }).join(' ');
}

function safeThreadName(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.slice(0, 96);
}

function metadataFromRecords(sessionMeta, turnContext) {
  if (!sessionMeta && !turnContext) return null;
  const spawn = sessionMeta?.source?.subagent?.thread_spawn || {};
  const agentPath = sessionMeta?.agent_path || spawn.agent_path || null;
  const configured = turnContext?.collaboration_mode?.settings || {};
  const model = turnContext?.model || configured.model || null;
  const effort = turnContext?.effort || turnContext?.reasoning_effort
    || configured.reasoning_effort || null;
  return {
    label: taskLabelFromPath(agentPath),
    nickname: sessionMeta?.agent_nickname || spawn.agent_nickname || null,
    model: typeof model === 'string' && model.trim() ? model.trim() : null,
    effort: typeof effort === 'string' && effort.trim() ? effort.trim() : null,
  };
}

async function readMetadataFile(filePath) {
  let sessionMeta = null;
  let turnContext = null;
  let lines = 0;
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      lines += 1;
      if (!line.includes('"type":"session_meta"') && !line.includes('"type":"turn_context"')) {
        if (lines >= 600 && sessionMeta) break;
        continue;
      }
      try {
        const record = JSON.parse(line);
        if (record.type === 'session_meta') sessionMeta = record.payload || null;
        if (record.type === 'turn_context') turnContext = record.payload || null;
      } catch {
        // A file can be observed while Codex is still appending its current line.
      }
      if (sessionMeta && turnContext) break;
    }
  } finally {
    reader.close();
    input.destroy();
  }
  return metadataFromRecords(sessionMeta, turnContext);
}

async function readThreadName(filePath, threadId) {
  if (typeof threadId !== 'string' || !SAFE_ID.test(threadId)) return null;
  let title = null;
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      if (!line.includes(threadId)) continue;
      try {
        const record = JSON.parse(line);
        if (record.id === threadId) title = safeThreadName(record.thread_name);
      } catch {
        // The index may be observed while Codex is appending its current line.
      }
    }
  } finally {
    reader.close();
    input.destroy();
  }
  return title;
}

async function findRolloutFile(directory, agentId, depth = 0) {
  if (depth > 4) return null;
  let entries;
  try {
    entries = await fsp.readdir(directory, { withFileTypes: true });
  } catch {
    return null;
  }

  const expectedSuffix = `-${agentId}.jsonl`;
  const file = entries.find((entry) => entry.isFile() && entry.name.endsWith(expectedSuffix));
  if (file) return path.join(directory, file.name);

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => right.name.localeCompare(left.name));
  for (const entry of directories) {
    const result = await findRolloutFile(path.join(directory, entry.name), agentId, depth + 1);
    if (result) return result;
  }
  return null;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class AgentMetadataResolver {
  constructor(sessionsRoot, options = {}) {
    this.sessionsRoot = sessionsRoot;
    this.threadIndexPath = options.threadIndexPath || path.join(path.dirname(sessionsRoot), 'session_index.jsonl');
    this.retryDelays = options.retryDelays || [0, 120, 420, 1_000];
    this.fileCache = new Map();
    this.metadataCache = new Map();
  }

  async resolve(agentId, options = {}) {
    if (typeof agentId !== 'string' || !SAFE_ID.test(agentId)) return null;
    const isRoot = Boolean(options.isRoot);
    const cacheKey = `${isRoot ? 'root' : 'agent'}:${agentId}`;
    const cached = this.metadataCache.get(cacheKey);
    if (cached) return { ...cached };

    let partial = null;
    for (const wait of this.retryDelays) {
      if (wait > 0) await delay(wait);
      let threadLabel = null;
      if (isRoot) {
        try {
          threadLabel = await readThreadName(this.threadIndexPath, agentId);
        } catch {
          // Older Codex builds may not expose the local session title index.
        }
        if (threadLabel) partial = { ...(partial || {}), label: threadLabel };
      }
      let filePath = this.fileCache.get(agentId) || null;
      if (!filePath) {
        filePath = await findRolloutFile(this.sessionsRoot, agentId);
        if (filePath) this.fileCache.set(agentId, filePath);
      }
      if (!filePath) continue;
      try {
        const metadata = await readMetadataFile(filePath);
        if (metadata) partial = { ...metadata, label: threadLabel || metadata.label };
        if (partial?.model && (!isRoot || partial.label)) {
          this.metadataCache.set(cacheKey, partial);
          return { ...partial };
        }
      } catch {
        // Metadata enrichment is optional and must never disrupt the overlay.
      }
    }
    return partial ? { ...partial } : null;
  }
}

module.exports = {
  AgentMetadataResolver,
  findRolloutFile,
  metadataFromRecords,
  readMetadataFile,
  readThreadName,
  safeThreadName,
  taskLabelFromPath,
};

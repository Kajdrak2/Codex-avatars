'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');
const { projectNameFromCwd } = require('./event-normalizer.cjs');

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
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      if (!line.includes('"type":"session_meta"') && !line.includes('"type":"turn_context"')) continue;
      try {
        const record = JSON.parse(line);
        if (record.type === 'session_meta') sessionMeta = record.payload || null;
        if (record.type === 'turn_context') turnContext = record.payload || null;
      } catch {
        // A file can be observed while Codex is still appending its current line.
      }
    }
  } finally {
    reader.close();
    input.destroy();
  }
  return metadataFromRecords(sessionMeta, turnContext);
}

async function readThreadNames(filePath, threadIds) {
  const expectedIds = new Set();
  for (const threadId of threadIds || []) {
    if (typeof threadId === 'string' && SAFE_ID.test(threadId)) expectedIds.add(threadId);
  }
  const titles = new Map();
  if (expectedIds.size === 0) return titles;
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      try {
        const record = JSON.parse(line);
        if (!expectedIds.has(record.id)) continue;
        const title = safeThreadName(record.thread_name);
        if (title) titles.set(record.id, title);
      } catch {
        // The index may be observed while Codex is appending its current line.
      }
    }
  } finally {
    reader.close();
    input.destroy();
  }
  return titles;
}

async function readThreadName(filePath, threadId) {
  if (typeof threadId !== 'string' || !SAFE_ID.test(threadId)) return null;
  return (await readThreadNames(filePath, [threadId])).get(threadId) || null;
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

async function findRecentRolloutFiles(directory, cutoff, depth = 0, files = []) {
  if (depth > 4) return files;
  let entries;
  try {
    entries = await fsp.readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await findRecentRolloutFiles(entryPath, cutoff, depth + 1, files);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    try {
      const stats = await fsp.stat(entryPath);
      if (stats.mtimeMs >= cutoff) files.push({
        path: entryPath,
        modifiedAt: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      // A rollout can be replaced while Codex rotates local session files.
    }
  }
  return files;
}

function rolloutActivityFromRecords(records, fallbackTimestamp = Date.now()) {
  let activity = null;
  let activityAt = null;

  const setActivity = (next, timestamp) => {
    activity = next;
    const parsed = Date.parse(timestamp || '');
    activityAt = Number.isFinite(parsed) ? parsed : fallbackTimestamp;
  };

  for (const record of records || []) {
    if (!record || typeof record !== 'object') continue;
    const payload = record.payload || {};

    if (record.type === 'session_meta' || record.type === 'turn_context') {
      setActivity('working', record.timestamp);
      continue;
    }

    if (record.type === 'event_msg') {
      if (payload.type === 'user_message') {
        setActivity('working', record.timestamp);
      } else if (payload.type === 'agent_message') {
        setActivity(payload.phase === 'final_answer' ? 'idle' : 'working', record.timestamp);
      } else if (['turn_aborted', 'task_complete', 'task_failed'].includes(payload.type)) {
        setActivity('idle', record.timestamp);
      } else if (['agent_reasoning', 'patch_apply_begin', 'patch_apply_end', 'web_search_begin', 'web_search_end'].includes(payload.type)) {
        setActivity('working', record.timestamp);
      }
      continue;
    }

    if (record.type !== 'response_item') continue;
    if (payload.type === 'message') {
      setActivity(payload.phase === 'final_answer' ? 'idle' : 'working', record.timestamp);
    } else if (['reasoning', 'custom_tool_call', 'custom_tool_call_output'].includes(payload.type)) {
      setActivity('working', record.timestamp);
    }
  }

  return { activity, activityAt };
}

async function readFirstSessionMeta(filePath) {
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      try {
        const record = JSON.parse(line);
        if (record.type === 'session_meta') return record.payload || null;
      } catch {
        // The first line can be observed while Codex is creating the rollout.
      }
    }
  } finally {
    reader.close();
    input.destroy();
  }
  return null;
}

async function readTailRecords(filePath, size, maxBytes = 1024 * 1024) {
  const length = Math.min(Math.max(0, size), maxBytes);
  if (length === 0) return [];
  const start = Math.max(0, size - length);
  const handle = await fsp.open(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);
    let text = buffer.subarray(0, bytesRead).toString('utf8');
    if (start > 0) {
      const newline = text.indexOf('\n');
      if (newline < 0) return [];
      text = text.slice(newline + 1);
    }
    const records = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        // Ignore a partial first or final line while Codex is appending.
      }
    }
    return records;
  } finally {
    await handle.close();
  }
}

async function readRecentAgentActivityRecords(sessionsRoot, options = {}) {
  const maxAgeMs = options.maxAgeMs ?? 30 * 60_000;
  const maxRecords = options.maxRecords ?? 128;
  const tailBytes = options.tailBytes ?? 1024 * 1024;
  const cache = options.cache instanceof Map ? options.cache : null;
  const changedOnly = Boolean(options.changedOnly && cache);
  const files = await findRecentRolloutFiles(sessionsRoot, Date.now() - maxAgeMs);
  const records = [];

  for (const file of files.sort((left, right) => right.modifiedAt - left.modifiedAt).slice(0, maxRecords)) {
    const fingerprint = `${file.size}:${file.modifiedAt}`;
    const cached = cache?.get(file.path);
    if (cached?.fingerprint === fingerprint) {
      if (!changedOnly && cached.record) records.push({ ...cached.record });
      continue;
    }

    const sessionMeta = await readFirstSessionMeta(file.path);
    const spawn = sessionMeta?.source?.subagent?.thread_spawn || null;
    const sessionId = sessionMeta?.session_id || spawn?.parent_thread_id || null;
    const agentId = sessionMeta?.id || null;
    if (!SAFE_ID.test(String(sessionId || '')) || !SAFE_ID.test(String(agentId || ''))) continue;

    const tail = await readTailRecords(file.path, file.size, tailBytes);
    const latestTurnContext = [...tail].reverse().find((record) => record?.type === 'turn_context')?.payload || null;
    const metadata = metadataFromRecords(sessionMeta, latestTurnContext) || {};
    const state = rolloutActivityFromRecords(tail, file.modifiedAt);
    const record = {
      filePath: file.path,
      sessionId,
      agentId,
      isRoot: !spawn,
      project: projectNameFromCwd(sessionMeta?.cwd),
      modifiedAt: file.modifiedAt,
      size: file.size,
      activity: state.activity || 'working',
      activityAt: state.activityAt || file.modifiedAt,
      metadata,
    };
    cache?.set(file.path, { fingerprint, record });
    records.push(record);
  }

  return records;
}

async function readRecentAgentRecords(sessionsRoot, options = {}) {
  const maxAgeMs = options.maxAgeMs ?? 120_000;
  const maxRecords = options.maxRecords ?? 16;
  const files = await findRecentRolloutFiles(sessionsRoot, Date.now() - maxAgeMs);
  const records = [];
  for (const file of files.sort((left, right) => right.modifiedAt - left.modifiedAt).slice(0, maxRecords)) {
    let sessionMeta = null;
    const input = fs.createReadStream(file.path, { encoding: 'utf8' });
    const reader = readline.createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of reader) {
        if (!line.includes('"type":"session_meta"')) continue;
        try {
          const record = JSON.parse(line);
          sessionMeta = record.payload || null;
        } catch {
          // Ignore a partially appended record.
        }
        break;
      }
    } finally {
      reader.close();
      input.destroy();
    }
    const spawn = sessionMeta?.source?.subagent?.thread_spawn || null;
    const sessionId = sessionMeta?.session_id || spawn?.parent_thread_id || null;
    const agentId = sessionMeta?.id || null;
    if (!SAFE_ID.test(String(sessionId || '')) || !SAFE_ID.test(String(agentId || ''))) continue;
    const metadata = await readMetadataFile(file.path);
    records.push({
      sessionId,
      agentId,
      isRoot: !spawn,
      modifiedAt: file.modifiedAt,
      metadata: metadata || {},
    });
  }
  return records;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class AgentMetadataResolver {
  constructor(sessionsRoot, options = {}) {
    this.sessionsRoot = sessionsRoot;
    this.threadIndexPath = options.threadIndexPath || path.join(path.dirname(sessionsRoot), 'session_index.jsonl');
    // The first read is immediate. The two short retries absorb a concurrent
    // Codex append without making a freshly launched companion feel delayed.
    this.retryDelays = options.retryDelays || [0, 80, 240];
    this.fileCache = new Map();
    this.metadataCache = new Map();
  }

  async resolve(agentId, options = {}) {
    if (typeof agentId !== 'string' || !SAFE_ID.test(agentId)) return null;
    const isRoot = Boolean(options.isRoot);
    const cacheKey = `${isRoot ? 'root' : 'agent'}:${agentId}`;
    const cached = this.metadataCache.get(cacheKey);
    if (cached && !options.refresh) return { ...cached };

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

  async refreshThreadNames(agentIds) {
    const titles = await readThreadNames(this.threadIndexPath, agentIds);
    for (const [agentId, label] of titles) {
      const cacheKey = `root:${agentId}`;
      const cached = this.metadataCache.get(cacheKey);
      if (cached) this.metadataCache.set(cacheKey, { ...cached, label });
    }
    return titles;
  }
}

class ThreadTitleMonitor {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.interval = options.interval ?? 250;
    this.getThreadIds = options.getThreadIds || (() => []);
    this.onTitles = options.onTitles || (() => {});
    this.readTitles = options.readTitles || ((threadIds) => readThreadNames(filePath, threadIds));
    this.watchFile = options.watchFile || fs.watchFile;
    this.unwatchFile = options.unwatchFile || fs.unwatchFile;
    this.generation = 0;
    this.started = false;
    this.refreshRequested = false;
    this.refreshPromise = null;
    this.listener = () => { void this.refresh(); };
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.watchFile(this.filePath, {
      interval: this.interval,
      persistent: false,
    }, this.listener);
    void this.refresh();
  }

  refresh() {
    if (!this.started) return Promise.resolve(false);
    this.refreshRequested = true;
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.#drainRefreshes()
      .finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  async #drainRefreshes() {
    let applied = false;
    while (this.started && this.refreshRequested) {
      this.refreshRequested = false;
      const generation = ++this.generation;
      try {
        const threadIds = [...new Set(this.getThreadIds())];
        if (threadIds.length === 0) continue;
        const titles = await this.readTitles(threadIds);
        if (!this.started || generation !== this.generation) return applied;
        // A newer request arrived while reading. Skip this result and consume
        // one fresh snapshot instead of opening another concurrent stream.
        if (this.refreshRequested) continue;
        await this.onTitles(titles);
        applied = true;
      } catch {
        // Title refresh is opportunistic and must never disrupt the overlay.
      }
    }
    return applied;
  }

  close() {
    if (!this.started) return;
    this.started = false;
    this.refreshRequested = false;
    this.generation += 1;
    this.unwatchFile(this.filePath, this.listener);
  }
}

module.exports = {
  AgentMetadataResolver,
  ThreadTitleMonitor,
  findRolloutFile,
  readRecentAgentActivityRecords,
  readRecentAgentRecords,
  metadataFromRecords,
  readMetadataFile,
  readThreadName,
  readThreadNames,
  safeThreadName,
  taskLabelFromPath,
  rolloutActivityFromRecords,
};

'use strict';

const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const AdmZip = require('adm-zip');

const GITHUB_CLI_VERSION = '2.97.0';
const GITHUB_CLI_ARCHIVE = `gh_${GITHUB_CLI_VERSION}_windows_amd64.zip`;
const GITHUB_CLI_DOWNLOAD_URL = `https://github.com/cli/cli/releases/download/v${GITHUB_CLI_VERSION}/${GITHUB_CLI_ARCHIVE}`;
const GITHUB_CLI_ARCHIVE_SHA256 = '35d7fe05c4dd1411ffda1e73dfc7c6f44b75c936ca51fa6595c657fdc0350cec';
const GITHUB_CLI_EXECUTABLE_SHA256 = 'e2efa10a5d2ce93cac9bc4b676932b62947c0967c01c8f2c3a9cb4437ad358d3';
const GITHUB_DEVICE_AUTHORIZATION_URL = 'https://github.com/login/device';
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const MAX_PROCESS_OUTPUT_BYTES = 10 * 1024 * 1024;
const TOKEN_PATTERN = /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|bearer\s+[A-Za-z0-9._~-]{20,})/gi;

function isInsideDirectory(directory, candidate) {
  const relative = path.relative(path.resolve(directory), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function sanitizeOutput(value) {
  return String(value || '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(TOKEN_PATTERN, '[redacted]')
    .trim();
}

function normalizeGitHubDeviceCode(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized) ? normalized : '';
}

function safeEnvironment(baseEnvironment, configDirectory) {
  const environment = { ...baseEnvironment, NO_COLOR: '1' };
  for (const key of ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN', 'GH_HOST']) {
    delete environment[key];
  }
  if (configDirectory) environment.GH_CONFIG_DIR = configDirectory;
  return environment;
}

function githubCancelledError() {
  const error = new Error('GitHub connection was cancelled.');
  error.code = 'GITHUB_CANCELLED';
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw githubCancelledError();
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function hashFile(filePath) {
  const digest = createHash('sha256');
  await new Promise((resolve, reject) => {
    const input = createReadStream(filePath);
    input.on('data', (chunk) => digest.update(chunk));
    input.on('error', reject);
    input.on('end', resolve);
  });
  return digest.digest('hex');
}

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function pathCandidates(environment = process.env) {
  const candidates = [];
  for (const root of [environment.LOCALAPPDATA, environment.ProgramFiles, environment['ProgramFiles(x86)']]) {
    if (root) candidates.push(path.join(root, 'Programs', 'GitHub CLI', 'gh.exe'), path.join(root, 'GitHub CLI', 'gh.exe'));
  }
  for (const directory of String(environment.PATH || '').split(path.delimiter).filter(Boolean)) {
    candidates.push(path.join(directory.replace(/^"|"$/g, ''), 'gh.exe'));
  }
  return [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
}

function runProcess(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(githubCancelledError());
      return;
    }
    let settled = false;
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let timer = null;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const abort = () => {
      child.kill();
      finish(githubCancelledError());
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    const timeoutMs = options.timeoutMs ?? 60_000;
    timer = setTimeout(() => {
      child.kill();
      const error = new Error('GitHub did not respond before the operation timed out.');
      error.code = 'GITHUB_TIMEOUT';
      finish(error);
    }, timeoutMs);

    function finish(error, value) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(value);
    }

    const processControl = {
      writeInput(value) {
        if (settled || child.stdin.destroyed) return false;
        child.stdin.write(String(value ?? ''));
        return true;
      },
      endInput(value = '') {
        if (settled || child.stdin.destroyed) return false;
        child.stdin.end(String(value ?? ''));
        return true;
      },
    };

    function append(previous, chunk) {
      const next = Buffer.concat([previous, Buffer.from(chunk)]);
      if (next.length > (options.maximumOutputBytes ?? MAX_PROCESS_OUTPUT_BYTES)) {
        child.kill();
        const error = new Error('GitHub returned an unexpectedly large response.');
        error.code = 'GITHUB_OUTPUT_TOO_LARGE';
        finish(error);
        return previous;
      }
      options.onOutput?.(sanitizeOutput(chunk), processControl);
      return next;
    }

    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    child.on('error', (error) => finish(error));
    child.on('close', (code) => {
      if (settled) return;
      const result = {
        code,
        stdout: sanitizeOutput(stdout.toString('utf8')),
        stderr: sanitizeOutput(stderr.toString('utf8')),
      };
      if (code === 0) {
        finish(null, result);
        return;
      }
      const message = result.stderr || result.stdout || `GitHub CLI exited with code ${code}.`;
      const error = new Error(message.slice(0, 2_000));
      error.code = 'GITHUB_CLI_ERROR';
      const statusMatch = message.match(/HTTP\s+(\d{3})/i);
      if (statusMatch) error.status = Number(statusMatch[1]);
      finish(error);
    });

    child.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') finish(error);
    });
    if (Object.prototype.hasOwnProperty.call(options, 'input')) {
      child.stdin.end(options.input ?? '');
    } else if (!options.keepStdinOpen) {
      child.stdin.end();
    }
  });
}

async function responseBuffer(response, maximumBytes = MAX_DOWNLOAD_BYTES) {
  if (!response?.ok) throw new Error(`GitHub CLI download returned HTTP ${response?.status || 'unknown'}.`);
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error('GitHub CLI download is unexpectedly large.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maximumBytes) throw new Error('GitHub CLI download is unexpectedly large.');
  return buffer;
}

class GitHubCli {
  constructor(options = {}) {
    if (!options.toolDirectory) throw new Error('A GitHub CLI tool directory is required.');
    this.toolDirectory = path.resolve(options.toolDirectory);
    this.configDirectory = path.resolve(options.configDirectory || path.join(this.toolDirectory, 'config'));
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.processRunner = options.processRunner || runProcess;
    this.environment = options.environment || process.env;
    this.platform = options.platform || process.platform;
    this.resolved = null;
    this.provisioning = null;
  }

  get managedDirectory() {
    return path.join(this.toolDirectory, GITHUB_CLI_VERSION);
  }

  get managedExecutable() {
    return path.join(this.managedDirectory, 'gh.exe');
  }

  commandEnvironment(record) {
    const configDirectory = Object.prototype.hasOwnProperty.call(record || {}, 'configDirectory')
      ? record.configDirectory
      : (record?.managed ? this.configDirectory : null);
    return safeEnvironment(this.environment, configDirectory);
  }

  async verifiedManagedRecord() {
    if (!await isFile(this.managedExecutable)) return null;
    if (await hashFile(this.managedExecutable) !== GITHUB_CLI_EXECUTABLE_SHA256) return null;
    return {
      executable: this.managedExecutable,
      managed: true,
      version: GITHUB_CLI_VERSION,
      configDirectory: this.configDirectory,
    };
  }

  async locate() {
    if (this.resolved) return this.resolved;
    for (const candidate of pathCandidates(this.environment)) {
      if (!await isFile(candidate)) continue;
      try {
        const result = await this.processRunner(candidate, ['--version'], {
          env: safeEnvironment(this.environment),
          timeoutMs: 8_000,
        });
        const version = result.stdout.match(/gh version\s+([0-9.]+)/i)?.[1] || '';
        this.resolved = { executable: candidate, managed: false, version, configDirectory: null };
        return this.resolved;
      } catch {
        // Ignore broken PATH candidates and continue to the verified managed copy.
      }
    }
    const managed = await this.verifiedManagedRecord();
    if (managed) {
      this.resolved = managed;
      return managed;
    }
    return null;
  }

  async provision(options = {}) {
    if (this.platform !== 'win32') throw new Error('Direct GitHub submission is currently available on Windows only.');
    if (typeof this.fetchImpl !== 'function') throw new Error('GitHub CLI cannot be downloaded in this environment.');
    options.onProgress?.('downloading-github-cli');
    throwIfAborted(options.signal);
    const timeoutSignal = AbortSignal.timeout(120_000);
    const downloadSignal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    let response;
    try {
      response = await this.fetchImpl(GITHUB_CLI_DOWNLOAD_URL, {
        method: 'GET',
        redirect: 'follow',
        headers: { accept: 'application/octet-stream', 'user-agent': 'Codex-Avatars' },
        signal: downloadSignal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw githubCancelledError();
      throw error;
    }
    let archiveBuffer;
    try {
      archiveBuffer = await responseBuffer(response);
    } catch (error) {
      if (options.signal?.aborted) throw githubCancelledError();
      throw error;
    }
    throwIfAborted(options.signal);
    if (hashBuffer(archiveBuffer) !== GITHUB_CLI_ARCHIVE_SHA256) {
      throw new Error('The downloaded GitHub CLI archive failed its SHA-256 integrity check.');
    }

    const archive = new AdmZip(archiveBuffer);
    const executableEntry = archive.getEntries().find((entry) => /(?:^|\/)bin\/gh\.exe$/i.test(entry.entryName.replace(/\\/g, '/')));
    const licenseEntry = archive.getEntries().find((entry) => /(?:^|\/)LICENSE$/i.test(entry.entryName.replace(/\\/g, '/')));
    if (!executableEntry || executableEntry.isDirectory) throw new Error('The GitHub CLI archive has no executable.');
    const executableBuffer = executableEntry.getData();
    if (hashBuffer(executableBuffer) !== GITHUB_CLI_EXECUTABLE_SHA256) {
      throw new Error('The GitHub CLI executable failed its SHA-256 integrity check.');
    }

    throwIfAborted(options.signal);
    await fs.mkdir(this.toolDirectory, { recursive: true });
    const stagingDirectory = path.join(this.toolDirectory, `.github-cli-${randomUUID()}`);
    if (!isInsideDirectory(this.toolDirectory, stagingDirectory)) throw new Error('Unsafe GitHub CLI staging path.');
    try {
      await fs.mkdir(stagingDirectory);
      await fs.writeFile(path.join(stagingDirectory, 'gh.exe'), executableBuffer);
      if (licenseEntry && !licenseEntry.isDirectory) await fs.writeFile(path.join(stagingDirectory, 'LICENSE'), licenseEntry.getData());
      await fs.writeFile(path.join(stagingDirectory, 'integrity.json'), `${JSON.stringify({
        version: GITHUB_CLI_VERSION,
        source: GITHUB_CLI_DOWNLOAD_URL,
        archiveSha256: GITHUB_CLI_ARCHIVE_SHA256,
        executableSha256: GITHUB_CLI_EXECUTABLE_SHA256,
      }, null, 2)}\n`, 'utf8');
      if (!isInsideDirectory(this.toolDirectory, this.managedDirectory)) throw new Error('Unsafe GitHub CLI destination path.');
      await fs.rm(this.managedDirectory, { recursive: true, force: true });
      await fs.rename(stagingDirectory, this.managedDirectory);
    } finally {
      await fs.rm(stagingDirectory, { recursive: true, force: true });
    }

    const record = await this.verifiedManagedRecord();
    if (!record) throw new Error('The verified GitHub CLI could not be installed.');
    const versionResult = await this.processRunner(record.executable, ['--version'], {
      env: this.commandEnvironment(record),
      signal: options.signal,
      timeoutMs: 8_000,
    });
    if (!versionResult.stdout.includes(GITHUB_CLI_VERSION)) throw new Error('The installed GitHub CLI version is not the expected version.');
    this.resolved = record;
    return record;
  }

  async ensure(options = {}) {
    throwIfAborted(options.signal);
    const existing = await this.locate();
    if (existing) return existing;
    if (!this.provisioning) this.provisioning = this.provision(options).finally(() => { this.provisioning = null; });
    return this.provisioning;
  }

  async status() {
    const primary = await this.locate();
    const managed = await this.verifiedManagedRecord();
    const records = [];
    const keys = new Set();
    const add = (record) => {
      if (!record) return;
      const key = `${path.resolve(record.executable)}\0${record.configDirectory || ''}`.toLowerCase();
      if (keys.has(key)) return;
      keys.add(key);
      records.push(record);
    };
    add(primary);
    if (managed) {
      add({ ...managed, configDirectory: null, sharedConfig: true });
      add(managed);
    }
    if (records.length === 0) return { installed: false, connected: false, login: '' };
    const checks = await Promise.all(records.map(async (record) => {
      try {
        const result = await this.processRunner(record.executable, ['api', 'user', '--jq', '.login'], {
          env: this.commandEnvironment(record),
          timeoutMs: 5_000,
        });
        const login = result.stdout.trim();
        if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login)) throw new Error('GitHub returned an invalid account name.');
        return { record, login };
      } catch {
        return null;
      }
    }));
    const authenticated = checks.find(Boolean);
    if (authenticated) {
      this.resolved = authenticated.record;
      return {
        installed: true,
        connected: true,
        login: authenticated.login,
        managed: authenticated.record.managed,
        sharedConfig: Boolean(authenticated.record.sharedConfig),
        version: authenticated.record.version,
      };
    }
    this.resolved = primary || managed;
    const record = this.resolved;
    return { installed: true, connected: false, login: '', managed: record.managed, version: record.version };
  }

  async connect(options = {}) {
    const record = await this.ensure(options);
    const current = await this.status();
    if (current.connected) return current;
    options.onProgress?.('waiting-for-github-authorization');
    let output = '';
    let reportedDeviceCode = '';
    let promptSubmitted = false;
    await this.processRunner(record.executable, [
      'auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web', '--clipboard', '--skip-ssh-key',
    ], {
      env: this.commandEnvironment(record),
      keepStdinOpen: true,
      signal: options.signal,
      timeoutMs: 5 * 60_000,
      onOutput: (chunk, control) => {
        output = `${output}${chunk}`.slice(-8_000);
        const code = normalizeGitHubDeviceCode(output.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/)?.[1]);
        if (code) {
          if (code !== reportedDeviceCode) {
            reportedDeviceCode = code;
            options.onDeviceCode?.(code);
          }
          if (!promptSubmitted && control?.endInput) {
            promptSubmitted = true;
            control.endInput('\n');
          }
        }
      },
    });
    const connected = await this.status();
    if (!connected.connected) throw new Error('GitHub authorization did not complete.');
    return connected;
  }

  async api(method, endpoint, body, options = {}) {
    const verb = String(method || 'GET').toUpperCase();
    if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(verb)) throw new Error('Unsupported GitHub API method.');
    if (typeof endpoint !== 'string' || !/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/?-]+$/.test(endpoint)) {
      throw new Error('Unsafe GitHub API endpoint.');
    }
    const record = await this.ensure(options);
    const args = [
      'api', '--hostname', 'github.com', '--method', verb,
      '-H', 'Accept: application/vnd.github+json',
      '-H', 'X-GitHub-Api-Version: 2022-11-28',
      endpoint,
    ];
    let input = '';
    if (body !== undefined) {
      args.push('--input', '-');
      input = JSON.stringify(body);
    }
    const result = await this.processRunner(record.executable, args, {
      env: this.commandEnvironment(record),
      input,
      timeoutMs: options.timeoutMs ?? 90_000,
      maximumOutputBytes: options.maximumOutputBytes ?? MAX_PROCESS_OUTPUT_BYTES,
    });
    if (!result.stdout) return null;
    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new Error('GitHub returned an invalid API response.');
    }
  }
}

module.exports = {
  GITHUB_CLI_ARCHIVE,
  GITHUB_CLI_ARCHIVE_SHA256,
  GITHUB_CLI_DOWNLOAD_URL,
  GITHUB_CLI_EXECUTABLE_SHA256,
  GITHUB_CLI_VERSION,
  GITHUB_DEVICE_AUTHORIZATION_URL,
  GitHubCli,
  hashBuffer,
  isInsideDirectory,
  normalizeGitHubDeviceCode,
  pathCandidates,
  responseBuffer,
  runProcess,
  safeEnvironment,
  sanitizeOutput,
};

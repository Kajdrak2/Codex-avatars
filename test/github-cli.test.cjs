'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const {
  GitHubCli,
  normalizeGitHubDeviceCode,
  responseBuffer,
  runProcess,
  safeEnvironment,
  sanitizeOutput,
} = require('../src/core/github-cli.cjs');

test('normalizes only GitHub one-time device codes', () => {
  assert.equal(normalizeGitHubDeviceCode(' abcd-ef12 '), 'ABCD-EF12');
  assert.equal(normalizeGitHubDeviceCode('ABCD-EFGH extra'), '');
  assert.equal(normalizeGitHubDeviceCode('github_pat_not-a-device-code'), '');
});

test('removes ambient GitHub tokens and redacts token-shaped output', () => {
  const environment = safeEnvironment({
    PATH: 'C:\\Tools',
    GH_TOKEN: 'ghp_123456789012345678901234567890',
    GITHUB_TOKEN: 'github_pat_123456789012345678901234567890',
  }, 'C:\\App\\github');
  assert.equal(environment.GH_TOKEN, undefined);
  assert.equal(environment.GITHUB_TOKEN, undefined);
  assert.equal(environment.GH_CONFIG_DIR, 'C:\\App\\github');
  assert.doesNotMatch(sanitizeOutput('Bearer abcdefghijklmnopqrstuvwxyz123456'), /abcdefghijklmnopqrstuvwxyz/);
});

test('rejects oversized GitHub CLI downloads before installation', async () => {
  const response = new Response(Buffer.from('tiny'), { headers: { 'content-length': '999' } });
  await assert.rejects(responseBuffer(response, 10), /unexpectedly large/i);
});

test('uses a verified CLI session for JSON API calls without exposing a token', async () => {
  const calls = [];
  const cli = new GitHubCli({
    toolDirectory: path.join(os.tmpdir(), 'codex-avatars-gh-test'),
    environment: { PATH: '', GH_TOKEN: 'ghp_123456789012345678901234567890' },
    processRunner: async (executable, args, options) => {
      calls.push({ executable, args, options });
      return { code: 0, stdout: JSON.stringify({ ok: true }), stderr: '' };
    },
  });
  cli.resolved = { executable: 'C:\\verified\\gh.exe', managed: true, version: '2.97.0' };
  assert.deepEqual(await cli.api('POST', '/repos/example/project/git/blobs', { content: 'abc' }), { ok: true });
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].options.input), { content: 'abc' });
  assert.equal(calls[0].options.env.GH_TOKEN, undefined);
  assert.equal(calls[0].args.includes('--input'), true);
  await assert.rejects(cli.api('POST', 'https://evil.example/api', {}), /Unsafe GitHub API endpoint/);
});

test('browser login reports the device code and returns the authenticated account', async () => {
  let userChecks = 0;
  const deviceCodes = [];
  const loginInput = [];
  let loginCall = null;
  const cli = new GitHubCli({
    toolDirectory: path.join(os.tmpdir(), 'codex-avatars-gh-login-test'),
    environment: { PATH: '' },
    processRunner: async (_executable, args, options) => {
      if (args[0] === 'api') {
        userChecks += 1;
        if (userChecks === 1) throw new Error('not logged in');
        return { code: 0, stdout: 'friendly-user', stderr: '' };
      }
      loginCall = { args, options };
      const control = {
        endInput: (value) => loginInput.push(value),
      };
      options.onOutput?.('First copy your one-time code: ABCD-', control);
      options.onOutput?.('EFGH', control);
      return { code: 0, stdout: '', stderr: '' };
    },
  });
  cli.resolved = { executable: 'C:\\verified\\gh.exe', managed: true, version: '2.97.0' };
  const status = await cli.connect({ onDeviceCode: (code) => deviceCodes.push(code) });
  assert.equal(status.connected, true);
  assert.equal(status.login, 'friendly-user');
  assert.deepEqual(deviceCodes, ['ABCD-EFGH']);
  assert.equal(loginCall.args.includes('--clipboard'), true);
  assert.equal(loginCall.options.keepStdinOpen, true);
  assert.deepEqual(loginInput, ['\n']);
});

test('waits for the GitHub device code before pressing Enter for the browser flow', async () => {
  const script = [
    "process.stdout.write('First copy your one-time code: WXYZ-1234')",
    "process.stdin.once('data', (chunk) => {",
    "  if (chunk.toString().includes('\\n')) process.stdout.write(' browser flow started')",
    "  else process.exitCode = 2",
    '})',
  ].join(';');
  let combined = '';
  const result = await runProcess(process.execPath, ['-e', script], {
    keepStdinOpen: true,
    timeoutMs: 5_000,
    onOutput(chunk, control) {
      combined += chunk;
      if (/WXYZ-1234/.test(combined)) control.endInput('\n');
    },
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /browser flow started/);
});

test('a pending GitHub process can be cancelled immediately', async () => {
  const controller = new AbortController();
  const operation = runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    signal: controller.signal,
    timeoutMs: 5_000,
  });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(operation, (error) => error.code === 'GITHUB_CANCELLED');
});

test('cancels the first managed CLI download instead of leaving connection pending', async () => {
  const controller = new AbortController();
  let observedSignal = null;
  const cli = new GitHubCli({
    toolDirectory: path.join(os.tmpdir(), 'codex-avatars-gh-download-cancel-test'),
    environment: { PATH: '' },
    platform: 'win32',
    fetchImpl: async (_url, options) => {
      observedSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    },
  });
  cli.locate = async () => null;
  const operation = cli.connect({ signal: controller.signal });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(operation, (error) => error.code === 'GITHUB_CANCELLED');
  assert.equal(observedSignal.aborted, true);
});

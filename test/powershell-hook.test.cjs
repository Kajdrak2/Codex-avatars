'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEventServer } = require('../src/core/pipe-server.cjs');

test('PowerShell hook forwards only allowlisted metadata', { skip: process.platform !== 'win32' }, async (context) => {
  const received = [];
  const pipeName = `codex-avatars-powershell-test-${process.pid}-${Date.now()}`;
  const server = createEventServer((payload) => received.push(payload), { pipeName });
  await server.listen();
  context.after(() => server.close());

  const scriptPath = path.join(__dirname, '..', 'scripts', 'codex-hook.ps1');
  const child = spawn('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-PipeName', pipeName,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  const exit = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });

  child.stdin.end(JSON.stringify({
    hook_event_name: 'SubagentStart',
    session_id: 'session-safe',
    turn_id: 'turn-safe',
    cwd: 'C:\\Projects\\safe',
    agent_id: 'agent-safe',
    agent_type: 'reviewer',
    agent_name: 'Safe reviewer',
    model: 'gpt-5.6-terra',
    reasoning_effort: 'medium',
    prompt: 'secret prompt',
    tool_input: { command: 'secret command' },
    last_assistant_message: 'secret answer',
  }));

  assert.equal(await exit, 0);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.deepEqual(received, [{
    hook_event_name: 'SubagentStart',
    session_id: 'session-safe',
    turn_id: 'turn-safe',
    project: 'safe',
    agent_id: 'agent-safe',
    agent_type: 'reviewer',
    agent_name: 'Safe reviewer',
    model: 'gpt-5.6-terra',
    reasoning_effort: 'medium',
  }]);
});

import net from 'node:net';

const endpoint = process.platform === 'win32'
  ? '\\\\.\\pipe\\codex-avatars-v1'
  : '/tmp/codex-avatars-v1.sock';

const sessionId = `manual-demo-${Date.now()}`;
const events = [
  { hook_event_name: 'SessionStart', session_id: sessionId, cwd: 'C:\\Projects\\demo' },
  { hook_event_name: 'SubagentStart', session_id: sessionId, cwd: 'C:\\Projects\\demo', agent_id: `${sessionId}-a`, agent_type: 'reviewer' },
  { hook_event_name: 'SubagentStart', session_id: sessionId, cwd: 'C:\\Projects\\demo', agent_id: `${sessionId}-b`, agent_type: 'test_runner' },
];

const socket = net.createConnection(endpoint);
socket.on('connect', () => {
  for (const event of events) socket.write(`${JSON.stringify(event)}\n`);
  socket.end();
});
socket.on('error', (error) => {
  process.stderr.write(`Codex Avatars is not listening: ${error.message}\n`);
  process.exitCode = 1;
});

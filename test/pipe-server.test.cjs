'use strict';

const net = require('node:net');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEventServer } = require('../src/core/pipe-server.cjs');

test('accepts newline-delimited local events', async (context) => {
  const received = [];
  const pipeName = `codex-avatars-test-${process.pid}-${Date.now()}`;
  const server = createEventServer((payload) => received.push(payload), { pipeName });
  await server.listen();
  context.after(() => server.close());

  await new Promise((resolve, reject) => {
    const socket = net.createConnection(server.endpoint);
    socket.once('error', reject);
    socket.once('connect', () => {
      socket.end('{"hello":"world"}\n');
    });
    socket.once('close', resolve);
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(received, [{ hello: 'world' }]);
});

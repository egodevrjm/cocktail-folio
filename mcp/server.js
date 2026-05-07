#!/usr/bin/env node
import readline from 'node:readline';
import { handleRpcRequest, parseRpcJSON, rpcResponse } from './protocol.js';

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', async (line) => {
  if (!line.trim()) return;

  try {
    const response = await handleRpcRequest(parseRpcJSON(line));
    if (response) send(response);
  } catch (error) {
    send(rpcResponse(null, null, error));
  }
});

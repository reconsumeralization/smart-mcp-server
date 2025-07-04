/**
 * @fileoverview On-Premise A2A Agent Toolkit
 *
 * This script demonstrates how an agent running on a local or SME machine can
 * register with a central A2A server, maintain a persistent connection, and
 * communicate with other agents in the network.
 */

import { io } from 'socket.io-client';
import fetch from 'node-fetch';
import fs from 'fs';
import readline from 'readline';

const CONFIG_PATH = './examples/agent.config.json';

let agentId = null;
let apiKey = null;
let socket = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  // 1. Load Configuration
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.error(`❌ Could not load configuration from ${CONFIG_PATH}.`);
    console.error(error.message);
    process.exit(1);
  }

  const { serverUrl, agentCard } = config;

  // 2. Register with the Server
  try {
    console.log(`🚀 Registering with server at ${serverUrl}...`);
    const res = await fetch(`${serverUrl}/a2a/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentCard),
    });

    if (!res.ok) {
      throw new Error(`Registration failed: ${res.status} ${res.statusText}`);
    }

    const credentials = await res.json();
    agentId = credentials.agentId;
    apiKey = credentials.apiKey;
    console.log(`✅ Agent registered successfully!`);
    console.log(`   - Agent ID: ${agentId}`);
    console.log(`   - API Key:  ${apiKey.substring(0, 8)}...`);

  } catch (error) {
    console.error('❌ Could not register with the server.');
    console.error(error.message);
    process.exit(1);
  }

  // 3. Connect to WebSocket Server
  console.log('🔌 Connecting to WebSocket server...');
  socket = io(serverUrl, {
    auth: {
      agentId,
      apiKey
    }
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connection established.');
    promptForMessage();
  });

  socket.on('authenticated', () => {
    console.log('🔒 Agent authenticated with WebSocket server.');
  });
  
  socket.on('unauthorized', (data) => {
    console.error(`❌ Unauthorized: ${data.message}`);
  });

  socket.on('a2a-message', (message) => {
    console.log('\n📩 Received A2A message:');
    console.log(JSON.stringify(message, null, 2));
    promptForMessage();
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Connection to server lost.');
  });
  
  socket.on('connect_error', (err) => {
    console.error(`❌ Connection Error: ${err.message}`);
  });
}

function promptForMessage() {
    rl.question('💬 Enter message (format: recipient_id::message_text): ', (input) => {
    const [recipientAgentId, ...messageParts] = input.split('::');
    const text = messageParts.join('::').trim();

    if (!recipientAgentId || !text) {
      console.log('Invalid format. Please use recipient_id::message_text');
      promptForMessage();
      return;
    }
    
    const message = {
        recipientAgentId,
        payload: {
            text
        }
    };

    socket.emit('a2a-message', message);
    console.log('✉️  Message sent.');
    promptForMessage();
  });
}

async function gracefulShutdown() {
  console.log('\n👋 Shutting down...');
  rl.close();
  if (socket) {
    socket.disconnect();
  }
  if (agentId && apiKey) {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        console.log('Deregistering agent...');
        await fetch(`${config.serverUrl}/a2a/agents/unregister`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId, apiKey }),
        });
        console.log('Agent deregistered.');
    } catch (error) {
        console.error('Could not deregister agent.', error.message);
    }
  }
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

main(); 
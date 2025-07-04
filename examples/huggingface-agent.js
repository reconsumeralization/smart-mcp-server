/**
 * @fileoverview Hugging Face AI Agent for A2A Communication
 *
 * This script acts as a dummy AI agent that registers with the central Smart MCP Server,
 * maintains a persistent WebSocket connection, and uses the Hugging Face Inference API
 * for text generation in response to A2A messages.
 */

import { io } from 'socket.io-client';
import fetch from 'node-fetch';
import fs from 'fs';
import readline from 'readline';

const CONFIG_PATH = './examples/agent.huggingface.config.json';

let agentId = null;
let apiKey = null;
let socket = null;
let config = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  // 1. Load Configuration
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.error(`❌ Could not load configuration from ${CONFIG_PATH}.`);
    console.error(error.message);
    process.exit(1);
  }

  const { serverUrl, agentCard, huggingFaceApiUrl, huggingFaceModel } = config;

  // Ensure Hugging Face API key is set in environment variables
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    console.error("❌ HF_TOKEN environment variable is not set. Please set it to your Hugging Face API key.");
    process.exit(1);
  }

  // 2. Register with the Server
  try {
    console.log(`🚀 Registering Hugging Face Agent with server at ${serverUrl}...`);
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
  });

  socket.on('authenticated', () => {
    console.log('🔒 Hugging Face Agent authenticated with WebSocket server.');
    console.log('Waiting for messages...');
  });
  
  socket.on('unauthorized', (data) => {
    console.error(`❌ Unauthorized: ${data.message}`);
  });

  socket.on('a2a-message', async (message) => {
    console.log('\n📩 Received A2A message:');
    console.log(JSON.stringify(message, null, 2));

    const senderAgentId = message.senderAgentId;
    const prompt = message.payload?.text;

    if (prompt) {
      console.log(`Generating response for prompt: "${prompt}"...`);
      try {
        const generatedText = await generateTextWithHuggingFace(prompt, huggingFaceApiUrl, huggingFaceModel, hfToken);
        const responsePayload = { text: generatedText };
        
        console.log(`Generated response: "${generatedText.substring(0, 50)}..."`);
        sendMessageToAgent(senderAgentId, 'a2a-message', { senderAgentId: agentId, ...responsePayload });
        console.log('✉️  Response sent.');

      } catch (error) {
        console.error('❌ Error generating text with Hugging Face:', error.message);
        sendMessageToAgent(senderAgentId, 'a2a-message', { senderAgentId: agentId, error: 'Failed to generate text.' });
      }
    } else {
      console.log('No text payload in message, ignoring.');
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Connection to server lost.');
  });
  
  socket.on('connect_error', (err) => {
    console.error(`❌ Connection Error: ${err.message}`);
  });
}

/**
 * Sends a message to a specific agent via WebSocket.
 * This function is a client-side wrapper for the server's sendMessageToAgent.
 */
function sendMessageToAgent(recipientAgentId, event, data) {
  if (socket && socket.connected) {
    socket.emit(event, { recipientAgentId, payload: data });
  } else {
    console.error('❌ WebSocket is not connected. Cannot send message.');
  }
}

/**
 * Generates text using the Hugging Face Inference API.
 * @param {string} prompt - The text prompt.
 * @param {string} apiUrl - The base URL for the Hugging Face Inference API.
 * @param {string} model - The Hugging Face model ID.
 * @param {string} hfToken - The Hugging Face API token.
 * @returns {Promise<string>} - The generated text.
 */
async function generateTextWithHuggingFace(prompt, apiUrl, model, hfToken) {
  const response = await fetch(`${apiUrl}${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hfToken}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 100,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Hugging Face API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`);
  }

  const result = await response.json();
  // The structure of the response might vary based on the model and API endpoint
  // For text-generation task, it's usually an array with a 'generated_text' field.
  return result[0]?.generated_text || "No text generated.";
}

async function gracefulShutdown() {
  console.log('\n👋 Shutting down Hugging Face Agent...');
  rl.close();
  if (socket) {
    socket.disconnect();
  }
  if (agentId && apiKey && config && config.serverUrl) {
    try {
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
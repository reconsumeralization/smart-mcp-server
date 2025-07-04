/**
 * @fileoverview WebSocket Manager for A2A Communication
 *
 * This module handles the real-time, bidirectional communication layer for the
 * Agent-to-Agent (A2A) protocol, allowing on-premise and cloud agents to connect
 * and exchange messages securely.
 */

import logger from './logger.js';

// Using a Map to store connected agents: { socketId -> { agentId, socket } }
const connectedAgents = new Map();
// Using a Map for quick agentId to socketId lookup: { agentId -> socketId }
const agentSocketMap = new Map();

let io = null;

/**
 * Initializes the WebSocket manager and attaches it to the Socket.IO server.
 * @param {object} socketIoServer - The Socket.IO server instance.
 */
export function initializeWebSocketManager(socketIoServer) {
  io = socketIoServer;

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    // Set a timeout for authentication
    const authTimeout = setTimeout(() => {
      socket.emit('unauthorized', { message: 'Authentication timeout' });
      socket.disconnect(true);
    }, 5000); // 5 seconds to authenticate

    socket.on('authenticate', (data) => {
      const { agentId, apiKey } = data;

      // In a real implementation, you would validate the apiKey against the one
      // stored during registration. For this demonstration, we'll assume a
      // function `isValidApiKey` exists.
      if (isValidApiKey(agentId, apiKey)) {
        clearTimeout(authTimeout);
        logger.info(`Agent authenticated: ${agentId} (Socket: ${socket.id})`);

        connectedAgents.set(socket.id, { agentId, socket });
        agentSocketMap.set(agentId, socket.id);

        socket.emit('authenticated', { message: 'Successfully authenticated.' });

        // Join a room for this agent to allow direct messaging
        socket.join(agentId);

      } else {
        socket.emit('unauthorized', { message: 'Invalid API key or Agent ID' });
        socket.disconnect(true);
      }
    });

    socket.on('a2a-message', (message) => {
      const sender = connectedAgents.get(socket.id);
      if (!sender) {
        return socket.emit('unauthorized', { message: 'You must be authenticated to send messages.' });
      }

      const { recipientAgentId, payload } = message;
      logger.info(`A2A message from ${sender.agentId} to ${recipientAgentId}`);
      sendMessageToAgent(recipientAgentId, 'a2a-message', { senderAgentId: sender.agentId, ...payload });
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      if (connectedAgents.has(socket.id)) {
        const agent = connectedAgents.get(socket.id);
        agentSocketMap.delete(agent.agentId);
        connectedAgents.delete(socket.id);
        logger.info(`Agent logged off: ${agent.agentId}`);
      }
    });
  });
}

/**
 * Sends a message to a specific agent if they are connected via WebSocket.
 * @param {string} agentId - The recipient agent's ID.
 * @param {string} event - The event name to emit.
 * @param {object} data - The data to send.
 * @returns {boolean} - True if the message was sent, false otherwise.
 */
export function sendMessageToAgent(agentId, event, data) {
  const socketId = agentSocketMap.get(agentId);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit(event, data);
    logger.info(`Sent WebSocket message to agent ${agentId} (Event: ${event})`);
    return true;
  } else {
    logger.warn(`Could not send WebSocket message: Agent ${agentId} not connected.`);
    return false;
  }
}

/**
 * A placeholder function to validate an agent's API key.
 * In a real implementation, this would check against a secure store.
 * For now, we will assume it's valid if it exists.
 * @param {string} agentId - The agent's ID.
 * @param {string} apiKey - The agent's API key.
 * @returns {boolean} - True if the key is valid, false otherwise.
 */
function isValidApiKey(agentId, apiKey) {
  // This is a placeholder. You need to implement proper validation.
  // For now, we'll just check if they are not empty.
  return !!agentId && !!apiKey;
} 
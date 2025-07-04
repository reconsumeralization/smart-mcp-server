/**
 * @fileoverview WebSocket Manager for A2A Communication
 *
 * This module handles the real-time, bidirectional communication layer for the
 * Agent-to-Agent (A2A) protocol, allowing on-premise and cloud agents to connect
 * and exchange messages securely.
 */

import logger from './logger.js';

let io = null;

export function initializeWebSocketManager(socketIoServer) {
  if (io) {
    logger.warn('WebSocket Manager already initialized.');
    return;
  }
  io = socketIoServer;
  logger.info('WebSocket Manager initialized and ready.');

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    // Example: send a welcome message
    socket.emit('message', 'Welcome to the MCP Dashboard WebSocket!');
  });
}

export function emitEvent(eventName, data) {
  if (!io) {
    logger.error('WebSocket Manager not initialized. Cannot emit event.');
    return;
  }
  logger.debug(`Emitting event: ${eventName}`);
  io.emit(eventName, data);
}

export function getConnectedClientsCount() {
  if (!io) {
    return 0;
  }
  return io.engine.clientsCount;
} 
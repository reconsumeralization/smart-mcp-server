import { logger } from '../logger.js';
import { getDriver, listDrivers } from '../models/index.js';

/**
 * Handles the core logic for different arrow types (generateText, streamText, embedding, capabilities).
 * This module is designed to be consumed by other services (e.g., MCP Gateway Service).
 * It does not run as a standalone server.
 */

/**
 * Process an incoming {{companyName}} "arrow" for core functionalities.
 * @param {object} arrow - The arrow object.
 * @returns {Promise<object>}
 */
export async function processArrow(arrow) {
  try {
    switch (arrow.type) {
      case 'generateText': {
        const driver = getDriver(arrow.payload.driver);
        logger.info(`generateText via ${driver.name}`);
        const { text } = await driver.generate(arrow.payload);
        return { type: 'result', payload: { text } };
      }
      case 'streamText': {
        const driver = getDriver(arrow.payload.driver);
        logger.info(`streamText via ${driver.name}`);
        const chunks = [];
        for await (const chunk of driver.stream(arrow.payload)) {
          chunks.push(chunk.text);
        }
        return { type: 'result', payload: { text: chunks.join('') } };
      }
      case 'embedding': {
        const driver = getDriver(arrow.payload.driver);
        logger.info(`embedding via ${driver.name}`);
        const vector = await driver.embedding(arrow.payload);
        return { type: 'result', payload: { vector } };
      }
      case 'capabilities': {
        return {
          type: 'result',
          payload: {
            drivers: listDrivers(),
            // tools: listTools() // Tools are now managed by the Tool Execution Service
          }
        };
      }
      default:
        return { type: 'error', payload: { message: `Unknown arrow type ${arrow.type} for core processor.` } };
    }
  } catch (err) {
    logger.error('Core Arrow Processor error', err);
    return { type: 'error', payload: { message: err.message } };
  }
}

/**
 * Get core capabilities provided by this processor.
 * @returns {object}
 */
export function getCoreCapabilities() {
  return {
    name: 'core-arrow-processor',
    capabilities: {
      generateText: listDrivers(),
      // toolCall: listTools().map(t => t.id) // Tools are managed externally
    }
  };
} 
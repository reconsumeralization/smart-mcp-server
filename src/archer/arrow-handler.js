import logger from '../logger.js';
import { getDriver, listDrivers } from '../models/index.js';
import { callTool, listTools } from '../registry/index.js';

/**
 * Handle an incoming {{companyName}} "arrow".
 * @param {import('./types').Arrow} arrow
 * @returns {Promise<import('./types').Arrow>}
 */
export async function handleArrow(arrow) {
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
      case 'tool.call': {
        const result = await callTool(arrow.payload.toolName, arrow.payload.args);
        return { type: 'result', payload: result };
      }
      case 'capabilities': {
        return {
          type: 'result',
          payload: {
            drivers: listDrivers(),
            tools: listTools()
          }
        };
      }
      default:
        return { type: 'error', payload: { message: `Unknown arrow type ${arrow.type}` } };
    }
  } catch (err) {
    logger.error('Arrow error', err);
    return { type: 'error', payload: { message: err.message } };
  }
}

export function getCapabilities() {
  return {
    name: 'smart-mcp-server',
    capabilities: {
      generateText: listDrivers(),
      toolCall: listTools().map(t => t.id)
    }
  };
} 
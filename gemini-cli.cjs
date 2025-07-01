#!/usr/bin/env node

// Gemini CLI converted to CommonJS file that is compatible with the project's "type": "module" setting.
// It dynamically imports the ES-module logger at runtime.

const GeminiCliAgent = require('./src/lib/agents/GeminiCliAgent.cjs');
const dotenv = require('dotenv');

dotenv.config();

// Fallback logging until the real logger is available
function earlyError(...args) {
  // eslint-disable-next-line no-console
  console.error(...args);
}
function earlyInfo(...args) {
  // eslint-disable-next-line no-console
  console.info(...args);
}

if (!process.env.GEMINI_API_KEY) {
  earlyError('❌ Error: GEMINI_API_KEY environment variable is required');
  earlyInfo('💡 Please set your Gemini API key in the .env file:');
  earlyInfo('   GEMINI_API_KEY=your_api_key_here');
  process.exit(1);
}

let logger;
async function getLogger() {
  if (!logger) {
    const mod = await import('./src/logger.js');
    logger = mod.default;
  }
  return logger;
}

async function main() {
  const log = await getLogger();
  log.info('🌟 Smart MCP Server - Gemini CLI Assistant');
  log.info('='.repeat(50));

  const agent = new GeminiCliAgent();

  try {
    await agent.initialize();
  } catch (error) {
    const log = await getLogger();
    log.error('❌ Failed to start Gemini CLI Agent:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  const log = await getLogger();
  log.info('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  const log = await getLogger();
  log.info('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch(async (error) => {
  const log = await getLogger();
  log.error('❌ Unexpected error:', error);
  process.exit(1);
}); 
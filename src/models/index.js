import GeminiDriver from './drivers/gemini-driver.js';
import OpenAIDriver from './drivers/openai-driver.js';
import AnthropicDriver from './drivers/anthropic-driver.js';
import GeminiCliDriver from './drivers/gemini-cli-driver.js';

const registry = {
  gemini:   () => new GeminiDriver(),
  openai:   () => new OpenAIDriver(),
  anthropic:() => new AnthropicDriver(),
  'gemini-cli': () => new GeminiCliDriver()
};

let cached;

export function getDriver (id = process.env.LLM_DRIVER || 'gemini') {
  if (cached && cached.name === id) return cached;
  const factory = registry[id];
  if (!factory) throw new Error(`Unknown LLM driver "${id}"`);
  cached = factory();
  return cached;
}

export function listDrivers () {
  return Object.keys(registry);
} 
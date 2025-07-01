import OpenAI from 'openai';
import ModelDriver from '../ModelDriver.js';

/**
 * Helper function to safely get environment variables with proper error handling
 * Based on best practices from https://claytonerrington.com/blog/nodejs-environment-variable-checks/
 * and https://chrisrich.io/typescript-manage-process-env-variables/
 */
function getRequiredEnvVar(key, description = '') {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    const message = description 
      ? `Configuration error: '${key}' is required - ${description}`
      : `Configuration error: '${key}' is required`;
    throw new Error(message);
  }
  return value.trim();
}

function getOptionalEnvVar(key, defaultValue = null) {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

export default class OpenAIDriver extends ModelDriver {
  constructor () {
    super();
    this.name = getOptionalEnvVar('OPENAI_MODEL', 'gpt-4o-mini');
    const apiKey = getRequiredEnvVar('OPENAI_API_KEY', 'OpenAI API key for authentication');
    this.client = new OpenAI({ apiKey });
  }

  async validate () {
    try {
      await this.client.models.retrieve(this.name);
      return true;
    } catch (error) {
      throw new Error(`OpenAI validation failed: ${error.message}`);
    }
  }

  async generate ({ prompt, temperature = 0.7, maxTokens = 1024 }) {
    const resp = await this.client.chat.completions.create({
      model: this.name,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    });
    return { text: resp.choices[0].message.content };
  }

  async *stream ({ prompt, temperature = 0.7 }) {
    const stream = await this.client.chat.completions.create({
      model: this.name,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      stream: true
    });
    for await (const chunk of stream) {
      if (chunk.choices[0].delta.content)
        yield { text: chunk.choices[0].delta.content };
    }
  }

  async embedding ({ text }) {
    const { data } = await this.client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return data[0].embedding;
  }
} 
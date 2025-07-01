import Anthropic from '@anthropic-ai/sdk';
import ModelDriver from '../ModelDriver.js';

/**
 * Helper function to safely get environment variables with proper error handling
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

export default class AnthropicDriver extends ModelDriver {
  constructor () {
    super();
    this.name = getOptionalEnvVar('ANTHROPIC_MODEL', 'claude-3-haiku-20240307');
    this.embeddingModel = getOptionalEnvVar('ANTHROPIC_EMBEDDING_MODEL', 'claude-3-sonnet-20240229');
    const apiKey = getRequiredEnvVar('ANTHROPIC_API_KEY', 'Anthropic API key for authentication');
    this.client = new Anthropic({ apiKey });
  }

  async validate () {
    try {
      // Anthropic does not provide a model list API, so we do a quick ping.
      const pong = await this.client.messages.create({
        model: this.name,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      });
      if (!pong) return false;
      return true;
    } catch (err) {
      // Re-throw with a more helpful message.
      throw new Error(`Anthropic validation failed: ${err.message}`);
    }
  }

  async generate ({ prompt, temperature = 0.7, maxTokens = 1024 }) {
    const resp = await this.client.messages.create({
      model: this.name,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    });
    return { text: resp.content[0].text };
  }

  async *stream ({ prompt, temperature = 0.7, maxTokens = 4096 }) {
    const stream = await this.client.messages.stream({
      model: this.name,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield { text: chunk.delta.text };
      }
    }
  }

  async embedding ({ text }) {
    // NOTE: Anthropic does not have a dedicated embedding endpoint as of my last update.
    // The recommended approach is to use a model to generate a document vector.
    // This is a placeholder implementation and may need to be updated.
    // See: https://docs.anthropic.com/en/docs/build-with-claude/use-cases/question-answering
    const response = await this.client.messages.create({
      model: this.embeddingModel,
      max_tokens: 1024, // Placeholder, adjust as needed
      messages: [
        {
          role: 'user',
          content: `Please generate a document vector embedding for the following text. The embedding should be a single, dense vector that captures the semantic meaning of the text.
Text: "${text}"`
        }
      ]
    });

    // This is a simulated response. You would need to parse the actual model output
    // to extract a vector if the model is trained for this task.
    const vectorText = response.content[0].text.trim();
    try {
      // Assuming the model returns a JSON string array of numbers
      return JSON.parse(vectorText);
    } catch (e) {
      // Fallback for non-JSON output: hash the string to get a pseudo-embedding
      // THIS IS NOT A REAL EMBEDDING AND SHOULD BE REPLACED
      let hash = 0;
      for (let i = 0; i < vectorText.length; i++) {
        const char = vectorText.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
      }
      return [hash];
    }
  }
} 
// A minimal interface every model driver must implement.
// Concrete drivers may expose more methods (e.g., tool-calling) but these are the
// core capabilities the Smart-MCP code relies on.

/**
 * @typedef {Object} GenerateOptions
 * @property {string}  prompt               – user prompt or system-augmented prompt
 * @property {number} [temperature]         – 0-1 sampling temperature
 * @property {number} [topP]
 * @property {number} [maxTokens]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {Object} EmbeddingOptions
 * @property {string} text
 */

export default class ModelDriver {
  /** human-readable identifier (e.g. "gemini-pro") */
  name = 'abstract-driver';

  /**
   * Synchronous probe – return true if creds / health-check pass.
   * Can throw to signal configuration error.
   */
  async validate () {
    throw new Error('validate() not implemented');
  }

  /**
   * Generate a single completion.
   * Must return { text: string }
   * @param {GenerateOptions} opts
   */
  async generate (opts) {
    throw new Error('generate() not implemented');
  }

  /**
   * Streamed generation. Async iterable of { text: string }
   * Not every backend supports streaming – fallback to generate().
   */
  async *stream (opts) {
    yield await this.generate(opts);
  }

  /**
   * Return a vector embedding for the given text.
   * @param {EmbeddingOptions} opts
   */
  async embedding (opts) {
    throw new Error('embedding() not implemented');
  }
} 
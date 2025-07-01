import { spawn, execSync } from 'child_process';
import { writeFileSync, existsSync, unlink } from 'fs';
import os from 'os';
import path from 'path';
import ModelDriver from '../ModelDriver.js';
import logger from '../../logger.js';

/**
 * Driver that wraps the official / open-source `gemini` CLI.
 * Requires the binary to be available on the $PATH (install with `npm i -g @google/gemini-cli` or the official installer).
 * Set LLM_DRIVER=gemini-cli to activate.
 */
export default class GeminiCliDriver extends ModelDriver {
  constructor () {
    super();
    this.name = 'gemini-cli';
    this.model = process.env.GEMINI_CLI_MODEL || 'gemini-2.5-pro';
    // Validate early (throws if binary missing)
    this.validate();
  }

  async validate () {
    try {
      execSync('gemini --version', { stdio: 'ignore' });
      return true;
    } catch (err) {
      logger.error('gemini CLI validation failed', err);
      throw new Error('gemini CLI executable not found in PATH – install with "npm i -g @google/gemini-cli" or the official installer');
    }
  }

  async generate ({ prompt, temperature, maxTokens, ...rest }) {
    let promptArg = prompt;
    let tmpPath;
    // If prompt is huge (>20k chars) write to temp file and pass @file to CLI to avoid OS arg length limits
    if (typeof prompt === 'string' && prompt.length > 20000) {
      try {
        tmpPath = path.join(os.tmpdir(), `mcp_prompt_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
        writeFileSync(tmpPath, prompt, 'utf8');
        promptArg = `@${tmpPath}`;
        logger.debug?.(`GeminiCLI large prompt written to ${tmpPath}`);
      } catch (err) {
        logger.warn?.('Failed to write large prompt to temp file, falling back to inline', err);
      }
    }

    const args = ['prompt', promptArg, '--json'];
    if (this.model) args.push('--model', this.model);
    if (typeof temperature === 'number') args.push('--temperature', String(temperature));
    if (typeof maxTokens === 'number') args.push('--max-tokens', String(maxTokens));

    return new Promise((resolve, reject) => {
      const proc = spawn('gemini', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => { stdout += d; });
      proc.stderr.on('data', d => { stderr += d; });
      proc.on('error', err => reject(err));
      proc.on('close', code => {
        if (code !== 0) return reject(new Error(stderr.trim() || `gemini CLI exited with code ${code}`));
        let text = stdout.trim();
        try {
          const parsed = JSON.parse(text);
          /* The official CLI replies {"text":"..."} */
          if (typeof parsed === 'object' && parsed !== null) {
            text = parsed.text || parsed.response || text;
          }
        } catch (_) { /* stdout was plain text */ }
        resolve({ text });
      });

      proc.on('close', () => {
        if (tmpPath && existsSync(tmpPath)) {
          unlink(tmpPath, () => {});
        }
      });
    });
  }

  async *stream (opts) {
    // Fallback: no streaming support – generate once.
    yield await this.generate(opts);
  }

  async embedding ({ text }) {
    const args = ['embed', 'content', text, '--json'];
    if (this.model) args.push('--model', this.model);

    return new Promise((resolve, reject) => {
      const proc = spawn('gemini', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      proc.stdout.on('data', d => { out += d; });
      proc.stderr.on('data', d => { err += d; });
      proc.on('error', err => reject(err));
      proc.on('close', code => {
        if (code !== 0) return reject(new Error(err.trim() || `gemini CLI exited with code ${code}`));
        try {
          const parsed = JSON.parse(out.trim());
          if (Array.isArray(parsed)) return resolve(parsed);
          if (parsed?.embedding) return resolve(parsed.embedding);
          return resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse embedding output'));
        }
      });
    });
  }
} 
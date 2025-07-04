import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import logger from '../logger.js';
import { registerTool } from './index.js';

const toolsDir = path.resolve(process.cwd(), 'src/tools');

export async function autoLoadTools() {
  const files = await fs.readdir(toolsDir);
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    try {
      const moduleUrl = pathToFileURL(path.join(toolsDir, file)).href;
      const mod = await import(moduleUrl);

      // Check for default export (e.g., class instances)
      if (mod.default && typeof mod.default === 'object') {
        Object.entries(mod.default).forEach(([key, fn]) => {
          if (typeof fn === 'function' && key.startsWith('mcp_')) {
            registerTool({ id: key, description: `${file}:${key}`, handler: fn.bind(mod.default) });
          }
        });
      }

      // Also check for named exports (existing logic)
      Object.entries(mod).forEach(([key, fn]) => {
        if (typeof fn === 'function' && key.startsWith('mcp_')) {
          registerTool({ id: key, description: `${file}:${key}`, handler: fn });
        }
      });
    } catch (err) {
      logger.warn(`Could not load tool from ${file}: ${err.message}`);
    }
  }
} 
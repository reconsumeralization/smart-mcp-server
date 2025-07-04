import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_FILE = path.join(__dirname, '..', 'data', 'memory.json');

class MemoryStore {
  constructor() {
    this.memory = {
      entities: {},
      relations: [],
      observations: [],
    };
    this._initialized = false;
  }

  async _ensureInitialized() {
    if (!this._initialized) {
      await this._load();
      this._initialized = true;
    }
  }

  async _load() {
    try {
      await fs.mkdir(path.dirname(MEMORY_FILE), { recursive: true });
      const data = await fs.readFile(MEMORY_FILE, 'utf-8');
      this.memory = JSON.parse(data);
      logger.info('MemoryStore loaded from file.');
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No existing memory file found. Starting fresh.');
        await this._save();
      } else {
        logger.error('Failed to load memory from file', { error });
        throw error;
      }
    }
  }

  async _save() {
    try {
      await fs.writeFile(MEMORY_FILE, JSON.stringify(this.memory, null, 2));
    } catch (error) {
      logger.error('Failed to save memory to file', { error });
      throw error;
    }
  }

  // === Entity Management ===
  async addEntity(id, data) {
    await this._ensureInitialized();
    if (this.memory.entities[id]) {
      // Merge data for existing entities
      Object.assign(this.memory.entities[id], data);
    } else {
      this.memory.entities[id] = data;
    }
    await this._save();
    return this.memory.entities[id];
  }

  async getEntity(id) {
    await this._ensureInitialized();
    return this.memory.entities[id] || null;
  }

  async listEntities() {
    await this._ensureInitialized();
    return this.memory.entities;
  }

  async deleteEntity(id) {
    await this._ensureInitialized();
    if (this.memory.entities[id]) {
      delete this.memory.entities[id];
      // Also remove relations connected to this entity
      this.memory.relations = this.memory.relations.filter(
        (r) => r.source !== id && r.target !== id
      );
      await this._save();
      return true;
    }
    return false;
  }

  // === Relation Management ===
  async addRelation(sourceId, targetId, type) {
    await this._ensureInitialized();
    const relation = { source: sourceId, target: targetId, type };
    this.memory.relations.push(relation);
    await this._save();
    return relation;
  }

  async findRelations({ source, target, type }) {
    await this._ensureInitialized();
    return this.memory.relations.filter(
      (r) =>
        (!source || r.source === source) &&
        (!target || r.target === target) &&
        (!type || r.type === type)
    );
  }

  // === Observation Management ===
  async addObservation(text) {
    await this._ensureInitialized();
    const observation = { text, timestamp: new Date().toISOString() };
    this.memory.observations.push(observation);
    await this._save();
    return observation;
  }
}

const memoryStore = new MemoryStore();
export default memoryStore;

import memoryStore from '../lib/memory-store.js';
import { logger } from '../logger.js';

/**
 * Creates a new entity or updates an existing one in the memory store (upsert).
 * Returns a Mermaid diagram (bidirectional, drag-and-drop ready) for GUI use.
 * @param {object} params - The parameters for creating an entity.
 * @param {string} params.id - The unique ID for the entity.
 * @param {object} params.data - The data to store for the entity.
 * @returns {Promise<object>} The result of the operation, including a Mermaid diagram and GUI metadata.
 */
export async function mcp_memory_create_entity({ id, data }) {
  logger.info('Executing mcp_memory_create_entity', { id, data });
  try {
    const entity = await memoryStore.addEntity(id, data);
    // Find all relations where this entity is source or target (bidirectional)
    const relations = await memoryStore.findRelations({ source: id });
    const reverseRelations = await memoryStore.findRelations({ target: id });
    const allRelations = [...relations, ...reverseRelations];
    const mermaid = generateEntityMermaidDiagramBidirectional(id, allRelations);
    // GUI metadata for drag-and-drop
    const gui = {
      draggable: true,
      nodeId: id,
      type: 'entity',
      relations: allRelations.map((r) => ({
        source: r.source,
        target: r.target,
        type: r.type,
        bidirectional: isBidirectional(r, allRelations),
      })),
    };
    return { success: true, entity, mermaid, gui };
  } catch (error) {
    logger.error('mcp_memory_create_entity failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves an entity from the memory store.
 * Returns a Mermaid diagram (bidirectional, drag-and-drop ready) for GUI use.
 * @param {object} params - The parameters for getting an entity.
 * @param {string} params.id - The ID of the entity to retrieve.
 * @returns {Promise<object>} The result of the operation, including a Mermaid diagram and GUI metadata.
 */
export async function mcp_memory_get_entity({ id }) {
  logger.info('Executing mcp_memory_get_entity', { id });
  try {
    const entity = await memoryStore.getEntity(id);
    if (!entity) {
      return { success: false, error: 'Entity not found' };
    }
    // Find all relations where this entity is source or target (bidirectional)
    const relations = await memoryStore.findRelations({ source: id });
    const reverseRelations = await memoryStore.findRelations({ target: id });
    const allRelations = [...relations, ...reverseRelations];
    const mermaid = generateEntityMermaidDiagramBidirectional(id, allRelations);
    // GUI metadata for drag-and-drop
    const gui = {
      draggable: true,
      nodeId: id,
      type: 'entity',
      relations: allRelations.map((r) => ({
        source: r.source,
        target: r.target,
        type: r.type,
        bidirectional: isBidirectional(r, allRelations),
      })),
    };
    return { success: true, entity, mermaid, gui };
  } catch (error) {
    logger.error('mcp_memory_get_entity failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Lists all entities in the memory store.
 * @returns {Promise<object>} The result of the operation.
 */
export async function mcp_memory_list_entities() {
  logger.info('Executing mcp_memory_list_entities');
  try {
    const entities = await memoryStore.listEntities();
    return { success: true, entities };
  } catch (error) {
    logger.error('mcp_memory_list_entities failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Deletes an entity from the memory store.
 * @param {object} params - The parameters for deleting an entity.
 * @param {string} params.id - The ID of the entity to delete.
 * @returns {Promise<object>} The result of the operation.
 */
export async function mcp_memory_delete_entity({ id }) {
  logger.info('Executing mcp_memory_delete_entity', { id });
  try {
    const wasDeleted = await memoryStore.deleteEntity(id);
    if (!wasDeleted) {
      return { success: false, error: 'Entity not found' };
    }
    return { success: true, message: `Entity ${id} deleted successfully.` };
  } catch (error) {
    logger.error('mcp_memory_delete_entity failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new relation between two entities.
 * Returns a Mermaid diagram (bidirectional, drag-and-drop ready) for GUI use.
 * @param {object} params - The parameters for creating a relation.
 * @param {string} params.source - The ID of the source entity.
 * @param {string} params.target - The ID of the target entity.
 * @param {string} params.type - The type of the relation.
 * @returns {Promise<object>} The result of the operation, including a Mermaid diagram and GUI metadata.
 */
export async function mcp_memory_create_relation({ source, target, type }) {
  logger.info('Executing mcp_memory_create_relation', { source, target, type });
  try {
    const relation = await memoryStore.addRelation(source, target, type);
    // Find all relations for the source and target (bidirectional)
    const relations = await memoryStore.findRelations({ source });
    const reverseRelations = await memoryStore.findRelations({
      target: source,
    });
    const allRelations = [...relations, ...reverseRelations];
    const mermaid = generateEntityMermaidDiagramBidirectional(
      source,
      allRelations
    );
    // GUI metadata for drag-and-drop
    const gui = {
      draggable: true,
      nodeId: source,
      type: 'entity',
      relations: allRelations.map((r) => ({
        source: r.source,
        target: r.target,
        type: r.type,
        bidirectional: isBidirectional(r, allRelations),
      })),
    };
    return { success: true, relation, mermaid, gui };
  } catch (error) {
    logger.error('mcp_memory_create_relation failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Finds relations in the memory store based on criteria.
 * Returns a Mermaid diagram (bidirectional, drag-and-drop ready) for GUI use.
 * @param {object} params - The search criteria.
 * @param {string} [params.source] - The ID of the source entity.
 * @param {string} [params.target] - The ID of the target entity.
 * @param {string} [params.type] - The type of the relation.
 * @returns {Promise<object>} The result of the operation, including a Mermaid diagram and GUI metadata.
 */
export async function mcp_memory_find_relations({ source, target, type }) {
  logger.info('Executing mcp_memory_find_relations', { source, target, type });
  try {
    const relations = await memoryStore.findRelations({ source, target, type });
    // Find reverse relations for bidirectionality
    let reverseRelations = [];
    if (source)
      reverseRelations = reverseRelations.concat(
        await memoryStore.findRelations({ target: source })
      );
    if (target)
      reverseRelations = reverseRelations.concat(
        await memoryStore.findRelations({ source: target })
      );
    const allRelations = [...relations, ...reverseRelations];
    const mermaid = generateRelationsMermaidDiagramBidirectional(allRelations);
    // GUI metadata for drag-and-drop
    const gui = {
      draggable: true,
      type: 'relation-set',
      relations: allRelations.map((r) => ({
        source: r.source,
        target: r.target,
        type: r.type,
        bidirectional: isBidirectional(r, allRelations),
      })),
    };
    return { success: true, relations: allRelations, mermaid, gui };
  } catch (error) {
    logger.error('mcp_memory_find_relations failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Adds an unstructured observation to the memory store.
 * Returns a Mermaid diagram (drag-and-drop ready) for GUI use.
 * @param {object} params - The parameters for the observation.
 * @param {string} params.text - The text of the observation.
 * @returns {Promise<object>} The result of the operation, including a Mermaid diagram and GUI metadata.
 */
export async function mcp_memory_add_observation({ text }) {
  logger.info('Executing mcp_memory_add_observation', { text });
  try {
    const observation = await memoryStore.addObservation(text);
    // Auto-generate Mermaid diagram for the observation
    const mermaid = generateObservationMermaidDiagram(observation);
    // GUI metadata for drag-and-drop
    const gui = {
      draggable: true,
      nodeId: `obs_${observation.id || Date.now()}`,
      type: 'observation',
    };
    return { success: true, observation, mermaid, gui };
  } catch (error) {
    logger.error('mcp_memory_add_observation failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Generates a Mermaid diagram for an entity and its direct relations (bidirectional, DnD GUI ready).
 * @param {string} entityId
 * @param {Array} relations
 * @returns {string} Mermaid diagram (flowchart)
 */
function generateEntityMermaidDiagramBidirectional(entityId, relations = []) {
  let diagram = 'graph TD\n';
  diagram += `  ${sanitizeMermaidId(entityId)}["${entityId}"]\n`;
  // Track which edges are bidirectional
  const edgeSet = new Set();
  for (const rel of relations) {
    const key = `${rel.source}->${rel.target}:${rel.type}`;
    const reverseKey = `${rel.target}->${rel.source}:${rel.type}`;
    if (edgeSet.has(reverseKey)) {
      // Already drawn as bidirectional
      continue;
    }
    const isBi = relations.some(
      (r) =>
        r.source === rel.target &&
        r.target === rel.source &&
        r.type === rel.type
    );
    if (isBi) {
      diagram += `  ${sanitizeMermaidId(rel.source)} <==|${rel.type}|==> ${sanitizeMermaidId(rel.target)}\n`;
      edgeSet.add(key);
      edgeSet.add(reverseKey);
    } else {
      diagram += `  ${sanitizeMermaidId(rel.source)} --|${rel.type}|--> ${sanitizeMermaidId(rel.target)}\n`;
      edgeSet.add(key);
    }
  }
  return diagram;
}

/**
 * Generates a Mermaid diagram for a set of relations (bidirectional, DnD GUI ready).
 * @param {Array} relations
 * @returns {string} Mermaid diagram (flowchart)
 */
function generateRelationsMermaidDiagramBidirectional(relations = []) {
  let diagram = 'graph TD\n';
  const nodes = new Set();
  const edgeSet = new Set();
  for (const rel of relations) {
    nodes.add(rel.source);
    nodes.add(rel.target);
    const key = `${rel.source}->${rel.target}:${rel.type}`;
    const reverseKey = `${rel.target}->${rel.source}:${rel.type}`;
    if (edgeSet.has(reverseKey)) {
      continue;
    }
    const isBi = relations.some(
      (r) =>
        r.source === rel.target &&
        r.target === rel.source &&
        r.type === rel.type
    );
    if (isBi) {
      diagram += `  ${sanitizeMermaidId(rel.source)} <==|${rel.type}|==> ${sanitizeMermaidId(rel.target)}\n`;
      edgeSet.add(key);
      edgeSet.add(reverseKey);
    } else {
      diagram += `  ${sanitizeMermaidId(rel.source)} --|${rel.type}|--> ${sanitizeMermaidId(rel.target)}\n`;
      edgeSet.add(key);
    }
  }
  for (const node of nodes) {
    diagram += `  ${sanitizeMermaidId(node)}["${node}"]\n`;
  }
  return diagram;
}

/**
 * Generates a Mermaid diagram for an observation node (DnD GUI ready).
 * @param {object} observation
 * @returns {string} Mermaid diagram (flowchart)
 */
function generateObservationMermaidDiagram(observation) {
  let diagram = 'graph TD\n';
  diagram += `  obs_${observation.id || Date.now()}["Observation: ${observation.text.replace(/"/g, "'")}"]\n`;
  return diagram;
}

/**
 * Checks if a relation is bidirectional in the given set.
 * @param {object} rel
 * @param {Array} allRelations
 * @returns {boolean}
 */
function isBidirectional(rel, allRelations) {
  return allRelations.some(
    (r) =>
      r.source === rel.target && r.target === rel.source && r.type === rel.type
  );
}

/**
 * Sanitizes a string for use as a Mermaid node ID.
 * @param {string} id
 * @returns {string}
 */
function sanitizeMermaidId(id) {
  return String(id).replace(/[^a-zA-Z0-9_]/g, '_');
}

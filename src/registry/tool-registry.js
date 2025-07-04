const registeredTools = new Map(); // Stores { handler, metadata }
import { toolMetadata } from './tool-metadata.js'; // Import tool metadata

console.log("Initializing tool registry..."); // Added log to confirm initialization

export function registerTool(toolId, handler, metadata) {
  if (registeredTools.has(toolId)) {
    console.warn(`Attempted to re-register tool: ${toolId}. Ignoring.`);
  }
  registeredTools.set(toolId, { handler, metadata });
}

export function getTool(toolId) {
  const toolEntry = registeredTools.get(toolId);
  if (!toolEntry) {
    throw new Error(`Tool not found: ${toolId}`);
  }
  return toolEntry.handler;
}

export function getToolMetadata(toolId) {
  const toolEntry = registeredTools.get(toolId);
  if (!toolEntry) {
    throw new Error(`Tool metadata not found for tool: ${toolId}`);
  }
  return toolEntry.metadata;
}

export async function executeTool(toolId, payload) {
  const handler = getTool(toolId);
  console.log(`Executing tool: ${toolId} with payload:`, payload);
  return handler(payload);
}

export function listAllTools() {
  return Array.from(registeredTools.values()).map(entry => entry.metadata);
}

// Initialize tools from metadata
toolMetadata.forEach(tool => {
  registerTool(tool.toolId, () => { console.log(`Tool ${tool.toolId} handler called. This should be handled by Tool Execution Service.`); }, tool);
}); 
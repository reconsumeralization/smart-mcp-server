// Simple in-memory tool registry. Each tool must expose
//   id:     unique string
//   handler(args): Promise<any>
//   description:  optional string

const _tools = new Map();

export function registerTool({ id, description = '', handler }) {
  if (!id || typeof handler !== 'function') {
    throw new Error('registerTool expects { id, handler }');
  }
  _tools.set(id, { id, description, handler });
}

export function listTools() {
  return Array.from(_tools.values()).map(({ id, description }) => ({ id, description }));
}

export async function callTool(id, args = {}) {
  const tool = _tools.get(id);
  if (!tool) throw new Error(`Unknown tool ${id}`);
  return tool.handler(args);
} 
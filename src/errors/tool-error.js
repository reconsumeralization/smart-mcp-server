class ToolError extends Error {
  constructor(message, toolId) {
    super(message);
    this.name = 'ToolError';
    this.toolId = toolId;
  }
}

export default ToolError; 
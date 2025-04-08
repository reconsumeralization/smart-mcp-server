import { McpServer } from '@modelcontextprotocol/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name (ESM workaround)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the MCP server
const server = new McpServer({
  name: "Smart MCP Gateway",
  description: "Context-aware MCP server that intelligently manages tool presentation",
  version: "1.0.0",
});

// Configuration for connected MCP servers
const CONNECTED_SERVERS = [
  { 
    id: "filesystem",
    name: "Filesystem",
    category: "system",
    priority: 3
  },
  { 
    id: "memory",
    name: "Memory",
    category: "reasoning",
    priority: 5
  },
  { 
    id: "github",
    name: "GitHub",
    category: "development",
    priority: 4
  },
  { 
    id: "sequential-thinking",
    name: "Sequential Thinking",
    category: "reasoning",
    priority: 5
  },
  { 
    id: "win-cli",
    name: "Windows CLI",
    category: "system",
    priority: 4
  },
  { 
    id: "playwright",
    name: "Playwright",
    category: "testing",
    priority: 3
  },
  { 
    id: "web-research",
    name: "Web Research",
    category: "research",
    priority: 3
  },
  { 
    id: "brave-search",
    name: "Brave Search",
    category: "research",
    priority: 3
  }
];

// Tool categories with descriptions
const CATEGORIES = {
  "system": "System access and file operations",
  "reasoning": "Advanced reasoning and memory capabilities",
  "development": "Software development tools and integrations",
  "testing": "Testing and browser automation",
  "research": "Web research and information gathering"
};

// Map to store tools from each server
const toolsMap = new Map();

// Initialize tools for categories
for (const category of Object.keys(CATEGORIES)) {
  toolsMap.set(category, []);
}

// Tool selection config
const MAX_TOOLS_PER_REQUEST = 38; // Leave room for our own tools
const DEFAULT_MAX_PER_CATEGORY = 8;

// Create a tool that helps select other tools based on the task
server.addTool({
  name: "select_tools_for_task",
  description: "Analyzes the current task and selects the most appropriate MCP tools to use",
  parameters: {
    type: "object",
    required: ["task_description", "categories"],
    properties: {
      task_description: {
        type: "string",
        description: "Description of the task you need to perform"
      },
      categories: {
        type: "array",
        description: "Categories of tools to prioritize",
        items: {
          type: "string",
          enum: Object.keys(CATEGORIES)
        }
      },
      max_tools: {
        type: "integer",
        description: "Maximum number of tools to return (default: 38)",
        default: MAX_TOOLS_PER_REQUEST
      }
    }
  },
  handler: async ({ task_description, categories = [], max_tools = MAX_TOOLS_PER_REQUEST }) => {
    // Calculate how many tools to select from each category
    const categoryWeights = {};
    
    // Initialize with base weights
    for (const cat of Object.keys(CATEGORIES)) {
      categoryWeights[cat] = categories.includes(cat) ? 3 : 1;
    }
    
    // Adjust weights based on task description
    const lowerTask = task_description.toLowerCase();
    if (lowerTask.includes("file") || lowerTask.includes("directory")) categoryWeights["system"] += 2;
    if (lowerTask.includes("git") || lowerTask.includes("code") || lowerTask.includes("repository")) categoryWeights["development"] += 2;
    if (lowerTask.includes("search") || lowerTask.includes("find information")) categoryWeights["research"] += 2;
    if (lowerTask.includes("test") || lowerTask.includes("browser") || lowerTask.includes("screenshot")) categoryWeights["testing"] += 2;
    if (lowerTask.includes("plan") || lowerTask.includes("think") || lowerTask.includes("reason")) categoryWeights["reasoning"] += 2;
    
    // Normalize weights to determine tool counts
    const totalWeight = Object.values(categoryWeights).reduce((sum, weight) => sum + weight, 0);
    const toolAllocation = {};
    
    for (const [cat, weight] of Object.entries(categoryWeights)) {
      // Allocate tools proportionally to weights
      toolAllocation[cat] = Math.min(
        Math.max(Math.floor((weight / totalWeight) * max_tools), 1),
        toolsMap.get(cat).length,
        DEFAULT_MAX_PER_CATEGORY
      );
    }
    
    // Ensure we don't exceed max_tools
    let totalAllocated = Object.values(toolAllocation).reduce((sum, count) => sum + count, 0);
    if (totalAllocated > max_tools) {
      // Reduce proportionally
      const reductionFactor = max_tools / totalAllocated;
      for (const cat of Object.keys(toolAllocation)) {
        toolAllocation[cat] = Math.max(1, Math.floor(toolAllocation[cat] * reductionFactor));
      }
      totalAllocated = Object.values(toolAllocation).reduce((sum, count) => sum + count, 0);
    }
    
    // Select tools based on allocation
    const selectedTools = [];
    for (const [cat, count] of Object.entries(toolAllocation)) {
      // Sort by priority and take top count
      const catTools = toolsMap.get(cat);
      const selected = catTools
        .sort((a, b) => b.priority - a.priority)
        .slice(0, count);
      
      selectedTools.push(...selected);
    }
    
    // Add remaining tools if we have space
    if (selectedTools.length < max_tools) {
      const remainingSpace = max_tools - selectedTools.length;
      const allTools = Array.from(toolsMap.values()).flat();
      const selectedIds = new Set(selectedTools.map(t => t.id));
      
      const additionalTools = allTools
        .filter(tool => !selectedIds.has(tool.id))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, remainingSpace);
      
      selectedTools.push(...additionalTools);
    }
    
    // Return the selected tools
    return {
      selected_tools: selectedTools.map(t => t.name),
      tool_count: selectedTools.length,
      category_distribution: Object.fromEntries(
        Object.entries(toolAllocation).map(([cat, count]) => [cat, count])
      )
    };
  }
});

// Create a tool that lists available categories
server.addTool({
  name: "list_tool_categories",
  description: "Lists all available tool categories and their descriptions",
  parameters: {
    type: "object",
    properties: {}
  },
  handler: async () => {
    return {
      categories: Object.entries(CATEGORIES).map(([id, description]) => ({
        id,
        description,
        tool_count: toolsMap.get(id)?.length || 0
      }))
    };
  }
});

// Function to connect to another MCP server and fetch its tools
async function connectToServer(serverConfig) {
  try {
    console.log(`Connecting to server: ${serverConfig.name}`);
    
    // This would normally connect to the actual MCP server
    // For this example, we'll simulate by adding mock tools
    const toolCount = Math.floor(Math.random() * 10) + 5; // 5-15 tools per server
    
    const mockTools = [];
    for (let i = 1; i <= toolCount; i++) {
      mockTools.push({
        id: `${serverConfig.id}_tool_${i}`,
        name: `${serverConfig.name} Tool ${i}`,
        description: `A tool from ${serverConfig.name} server`,
        category: serverConfig.category,
        priority: serverConfig.priority
      });
    }
    
    // Store these tools in our map
    const existingTools = toolsMap.get(serverConfig.category) || [];
    toolsMap.set(serverConfig.category, [...existingTools, ...mockTools]);
    
    console.log(`Added ${mockTools.length} tools from ${serverConfig.name}`);
  } catch (error) {
    console.error(`Error connecting to ${serverConfig.name}:`, error);
  }
}

// Connect to all configured servers on startup
async function initializeConnections() {
  for (const serverConfig of CONNECTED_SERVERS) {
    await connectToServer(serverConfig);
  }
  
  // Log the total number of tools
  const totalTools = Array.from(toolsMap.values()).reduce((sum, tools) => sum + tools.length, 0);
  console.log(`Total tools available: ${totalTools}`);
  
  // Log tools per category
  for (const [category, tools] of toolsMap.entries()) {
    console.log(`Category ${category}: ${tools.length} tools`);
  }
}

// Start the server
async function startServer() {
  // Connect to all configured servers
  await initializeConnections();
  
  // Start the MCP server
  const port = process.env.PORT || 3000;
  await server.start({ port });
  console.log(`Server running on port ${port}`);
}

startServer().catch(console.error); 
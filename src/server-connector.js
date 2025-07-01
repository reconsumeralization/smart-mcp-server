import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default locations to look for MCP server configs
const CONFIG_LOCATIONS = [
  path.join(__dirname, '.vscode', 'mcp.json'),
  path.join(__dirname, 'config', 'mcp-servers.json'),
  process.env.MCP_CONFIG_PATH,
].filter(Boolean);

// Default server configs if none found
const DEFAULT_SERVERS = [
  {
    id: 'filesystem',
    name: 'Filesystem Tools',
    url: 'http://localhost:3001',
    category: 'filesystem',
    description: 'Tools for working with files and directories',
  },
  {
    id: 'github',
    name: 'GitHub Tools',
    url: 'http://localhost:3002',
    category: 'github',
    description: 'Tools for GitHub interactions',
  },
  {
    id: 'memory',
    name: 'Memory Tools',
    url: 'http://localhost:3003',
    category: 'memory',
    description: 'Tools for knowledge graph and memory operations',
  },
  {
    id: 'win-cli',
    name: 'Windows CLI Tools',
    url: 'http://localhost:3004',
    category: 'terminal',
    description: 'Tools for Windows command line operations',
  },
  {
    id: 'ai',
    name: 'AI Tools',
    url: 'http://localhost:3005',
    category: 'ai',
    description: 'AI-assisted tools like sequential thinking',
  },
];

/**
 * Get MCP server configurations
 * @returns {Promise<Array>} Array of server configs
 */
export async function getMcpServerConfigs() {
  // Try to load from config files
  for (const location of CONFIG_LOCATIONS) {
    try {
      const configContent = await fs.readFile(location, 'utf8');
      const config = JSON.parse(configContent);

      if (config.servers && Array.isArray(config.servers)) {
        logger.info(`Loaded server configs from ${location}`);
        return config.servers;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn(`Error reading config from ${location}:`, {
          error: error.message,
        });
      }
    }
  }

  // No valid configs found, use defaults
  logger.info('Using default server configurations');
  return DEFAULT_SERVERS;
}

/**
 * Fetch tools from a server
 * @param {Object} server Server configuration
 * @returns {Promise<Array>} Array of tools
 */
export async function fetchToolsFromServer(server) {
  try {
    // For demo purposes, simulate a tool fetch for localhost servers
    if (server.url.includes('localhost')) {
      return simulateToolsForServer(server);
    }

    const response = await fetch(`${server.url}/tools`, {
      headers: {
        Accept: 'application/json',
        'X-API-Key':
          server.apiKey || process.env[`${server.id.toUpperCase()}_API_KEY`],
      },
    });

    if (!response.ok) {
      throw new Error(
        `Server responded with ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.tools || [];
  } catch (error) {
    logger.error(`Error fetching tools from ${server.url}:`, {
      error: error.message,
    });
    // For testing, still return simulated tools even if real fetch fails
    if (server.url.includes('localhost')) {
      return simulateToolsForServer(server);
    }
    return [];
  }
}

/**
 * Simulate tools for a specific server (for testing)
 * @param {Object} server Server configuration
 * @returns {Array} Simulated tools
 */
function simulateToolsForServer(server) {
  const tools = [];

  // Generate tools based on server category
  switch (server.category) {
    case 'filesystem':
      tools.push(
        createTool(
          'read_file',
          'Read File',
          'Read the contents of a file',
          server.category,
          {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'The path to the file to read.',
              },
            },
            required: ['filePath'],
          }
        ),
        createTool(
          'write_file',
          'Write File',
          'Write content to a file',
          server.category,
          {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'The path to the file to write.',
              },
              content: {
                type: 'string',
                description: 'The content to write to the file.',
              },
            },
            required: ['filePath', 'content'],
          }
        ),
        createTool(
          'list_dir',
          'List Directory',
          'List contents of a directory',
          server.category
        ),
        createTool(
          'file_search',
          'Search Files',
          'Search for files by name or content',
          server.category
        ),
        createTool(
          'delete_file',
          'Delete File',
          'Delete a file from the filesystem',
          server.category
        )
      );
      break;

    case 'github':
      tools.push(
        createTool(
          'github_search_repositories',
          'Search GitHub Repositories',
          'Search GitHub repositories by query',
          server.category,
          {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query for repositories.',
              },
            },
            required: ['query'],
          }
        ),
        createTool(
          'github_get_file_contents',
          'Get File Contents',
          'Retrieve file contents from a GitHub repository',
          server.category
        ),
        createTool(
          'github_create_issue',
          'Create Issue',
          'Create a new issue in a GitHub repository',
          server.category
        ),
        createTool(
          'github_list_commits',
          'List Commits',
          'List commits in a GitHub repository',
          server.category
        ),
        createTool(
          'github_create_pull_request',
          'Create Pull Request',
          'Create a new pull request',
          server.category
        )
      );
      break;

    case 'memory':
      tools.push(
        createTool(
          'memory_create_entities',
          'Create Entities',
          'Create new entities in knowledge graph',
          server.category
        ),
        createTool(
          'memory_create_relations',
          'Create Relations',
          'Create relations between entities',
          server.category
        ),
        createTool(
          'memory_search_nodes',
          'Search Knowledge Graph',
          'Search for nodes in knowledge graph',
          server.category
        ),
        createTool(
          'memory_read_graph',
          'Read Knowledge Graph',
          'Read the entire knowledge graph',
          server.category
        ),
        createTool(
          'memory_delete_entities',
          'Delete Entities',
          'Delete entities from knowledge graph',
          server.category
        )
      );
      break;

    case 'terminal':
      tools.push(
        createTool(
          'win_cli_execute_command',
          'Execute Command',
          'Execute a command in specified shell',
          server.category
        ),
        createTool(
          'win_cli_get_command_history',
          'Get Command History',
          'Get history of executed commands',
          server.category
        ),
        createTool(
          'win_cli_ssh_execute',
          'Execute SSH Command',
          'Execute command on remote host via SSH',
          server.category
        ),
        createTool(
          'win_cli_get_current_directory',
          'Get Current Directory',
          'Get current working directory',
          server.category
        )
      );
      break;

    case 'ai':
      tools.push(
        createTool(
          'sequential_thinking',
          'Sequential Thinking',
          'Break down complex problems with step-by-step thinking',
          server.category
        ),
        createTool(
          'web_search',
          'Web Search',
          'Search the web for information',
          server.category
        )
      );
      break;

    default:
      // Generic tools for unknown server types
      tools.push(
        createTool(
          `${server.id}_tool1`,
          'Generic Tool 1',
          'Generic tool description',
          server.category
        ),
        createTool(
          `${server.id}_tool2`,
          'Generic Tool 2',
          'Generic tool description',
          server.category
        )
      );
  }

  return tools;
}

/**
 * Create a tool object
 * @param {string} id Tool ID
 * @param {string} name Tool name
 * @param {string} description Tool description
 * @param {string} category Tool category
 * @returns {Object} Tool object
 */
function createTool(id, name, description, category, parameters = {}) {
  return {
    id,
    name,
    description,
    category,
    tokenCost: Math.floor(Math.random() * 10) + 1,
    isConnected: true,
    capabilities: {
      sampling: true,
      contextAggregation: true,
      securityBoundaries: true,
      notificationSupport: false,
      version: '1.0.0',
    },
    securityPolicy: {
      allowedContextTypes: ['*'],
      maxTokensPerRequest: 1000,
      rateLimits: {
        requests: 100,
        timeWindow: 60,
      },
      auditLogging: true,
    },
    mcpActions: [
      {
        name: id,
        description,
        parameters: parameters,
      },
    ],
  };
}

export default {
  getMcpServerConfigs,
  fetchToolsFromServer,
};

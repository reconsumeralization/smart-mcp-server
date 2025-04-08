import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Map to track server processes
const serverProcesses = new Map();

// Map tools to their server configurations
const toolServerMap = new Map();

// Register a tool with its server
export function registerTool(toolId, serverConfig) {
  toolServerMap.set(toolId, serverConfig);
}

// Start a server process if not already running
async function ensureServerRunning(serverConfig) {
  const { id, config } = serverConfig;
  
  if (serverProcesses.has(id) && serverProcesses.get(id).running) {
    return true;
  }
  
  if (config.type === 'stdio') {
    try {
      console.log(`Starting server process for ${id}...`);
      
      // Build command and arguments
      const command = config.command;
      const args = config.args || [];
      
      // Setup environment variables
      const env = { ...process.env, ...(config.env || {}) };
      
      // Spawn the process
      const proc = spawn(command, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Process stdout and stderr
      proc.stdout.on('data', (data) => {
        console.log(`[${id}] stdout: ${data}`);
      });
      
      proc.stderr.on('data', (data) => {
        console.error(`[${id}] stderr: ${data}`);
      });
      
      // Handle process exit
      proc.on('close', (code) => {
        console.log(`[${id}] process exited with code ${code}`);
        if (serverProcesses.has(id)) {
          serverProcesses.set(id, { proc: null, running: false });
        }
      });
      
      // Store the process
      serverProcesses.set(id, { proc, running: true });
      
      // Wait a bit for the server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
    } catch (error) {
      console.error(`Error starting server ${id}:`, error);
      return false;
    }
  } else if (config.type === 'sse') {
    // For SSE servers, we just need to validate the URL
    serverProcesses.set(id, { running: true });
    return true;
  }
  
  return false;
}

// Execute a tool on its server
export async function executeToolProxy(toolId, params) {
  const serverConfig = toolServerMap.get(toolId);
  if (!serverConfig) {
    throw new Error(`No server found for tool: ${toolId}`);
  }
  
  const { id, config } = serverConfig;
  
  // Ensure the server is running
  const serverRunning = await ensureServerRunning(serverConfig);
  if (!serverRunning) {
    throw new Error(`Failed to start server for tool: ${toolId}`);
  }
  
  // For this example, we'll simulate the execution rather than actually calling the server
  console.log(`Executing tool ${toolId} on server ${id} with params:`, params);
  
  // Determine tool type and customize response
  if (toolId.includes('github')) {
    return simulateGithubTool(toolId, params);
  } else if (toolId.includes('memory')) {
    return simulateMemoryTool(toolId, params);
  } else if (toolId.includes('win_cli')) {
    return simulateWinCliTool(toolId, params);
  } else if (toolId.includes('file')) {
    return simulateFilesystemTool(toolId, params);
  } else {
    // Generic response
    return {
      status: 'success',
      message: `Tool ${toolId} executed successfully`,
      result: `Simulated result for ${toolId}`
    };
  }
}

// Simulate various tool responses
function simulateGithubTool(toolId, params) {
  if (toolId.includes('search')) {
    return {
      status: 'success',
      items: [
        { name: 'example-repo-1', description: 'Example repository 1' },
        { name: 'example-repo-2', description: 'Example repository 2' }
      ],
      total_count: 2
    };
  } else if (toolId.includes('list')) {
    return {
      status: 'success',
      items: [
        { number: 1, title: 'Example Issue 1', state: 'open' },
        { number: 2, title: 'Example Issue 2', state: 'closed' }
      ]
    };
  } else {
    return {
      status: 'success',
      message: 'GitHub operation completed'
    };
  }
}

function simulateMemoryTool(toolId, params) {
  if (toolId.includes('create')) {
    return {
      status: 'success',
      created: true,
      message: 'Items created in memory'
    };
  } else if (toolId.includes('read') || toolId.includes('search')) {
    return {
      status: 'success',
      nodes: [
        { id: 'node1', type: 'concept', name: 'Example Node 1' },
        { id: 'node2', type: 'entity', name: 'Example Node 2' }
      ],
      edges: [
        { from: 'node1', to: 'node2', type: 'related_to' }
      ]
    };
  } else {
    return {
      status: 'success',
      message: 'Memory operation completed'
    };
  }
}

function simulateWinCliTool(toolId, params) {
  if (toolId.includes('execute_command')) {
    return {
      status: 'success',
      output: 'Command executed successfully\nOutput line 1\nOutput line 2',
      exitCode: 0
    };
  } else if (toolId.includes('get_command_history')) {
    return {
      status: 'success',
      history: [
        { command: 'dir', output: '...', timestamp: new Date().toISOString(), exitCode: 0 },
        { command: 'echo test', output: 'test', timestamp: new Date().toISOString(), exitCode: 0 }
      ]
    };
  } else {
    return {
      status: 'success',
      message: 'CLI operation completed'
    };
  }
}

function simulateFilesystemTool(toolId, params) {
  if (toolId.includes('read_file')) {
    return {
      status: 'success',
      content: 'This is the content of the simulated file.\nLine 2\nLine 3',
      path: params.path || '/simulated/path.txt'
    };
  } else if (toolId.includes('list_directory')) {
    return {
      status: 'success',
      entries: [
        { name: 'file1.txt', type: 'file', size: 1024 },
        { name: 'file2.txt', type: 'file', size: 2048 },
        { name: 'subfolder', type: 'directory' }
      ],
      path: params.path || '/simulated/directory'
    };
  } else {
    return {
      status: 'success',
      message: 'Filesystem operation completed'
    };
  }
}

// Clean up processes on exit
process.on('exit', () => {
  for (const [id, { proc }] of serverProcesses.entries()) {
    if (proc) {
      console.log(`Terminating server process for ${id}...`);
      proc.kill();
    }
  }
});

export default {
  registerTool,
  executeToolProxy
}; 
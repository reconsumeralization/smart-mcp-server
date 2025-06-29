import { spawn } from 'child_process';
import { URL, fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Map to keep track of server processes
const serverProcesses = new Map();
// Map to store tool to server configuration
const toolServerMap = new Map();

// Register a tool with its server configuration
export function registerTool(toolId, serverConfig) {
  toolServerMap.set(toolId, serverConfig);
}

// Ensure server for the tool is running
export async function ensureServerRunning(toolId) {
  const serverConfig = toolServerMap.get(toolId);
  
  if (!serverConfig) {
    throw new Error(`No server configuration found for tool: ${toolId}`);
  }
  
  const serverKey = `${serverConfig.type}-${serverConfig.command}`;
  
  if (serverProcesses.has(serverKey) && serverProcesses.get(serverKey).process) {
    return serverProcesses.get(serverKey);
  }
  
  console.log(`Starting server for tool: ${toolId}`);
  
  try {
    if (serverConfig.type === 'stdio') {
      const process = spawn(serverConfig.command, serverConfig.args || [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      process.on('error', (error) => {
        console.error(`Error starting server for ${toolId}:`, error);
        serverProcesses.delete(serverKey);
      });
      
      process.stdout.on('data', (data) => {
        console.log(`Server stdout (${toolId}): ${data}`);
      });
      
      process.stderr.on('data', (data) => {
        console.error(`Server stderr (${toolId}): ${data}`);
      });
      
      const serverInfo = { process, type: 'stdio' };
      serverProcesses.set(serverKey, serverInfo);
      return serverInfo;
    } else if (serverConfig.type === 'sse') {
      // For SSE type servers, we would start a long-running process
      // and maintain an event source connection
      // This is simplified for the example
      const serverInfo = { url: serverConfig.url, type: 'sse' };
      serverProcesses.set(serverKey, serverInfo);
      return serverInfo;
    } else {
      throw new Error(`Unsupported server type: ${serverConfig.type}`);
    }
  } catch (error) {
    console.error(`Failed to start server for ${toolId}:`, error);
    throw error;
  }
}

// Execute tool through appropriate server
export async function executeToolProxy(toolId, parameters) {
  try {
    const serverConfig = toolServerMap.get(toolId);
    if (!serverConfig) {
      throw new Error(`No server configuration found for tool: ${toolId}`);
    }

    // Ensure the server is running if it's a managed process (e.g., stdio type)
    if (serverConfig.type === 'stdio') {
      await ensureServerRunning(toolId);
    }

    // Construct the URL for tool execution. Assuming tools expose an /execute endpoint.
    // This might need to be more dynamic based on how tools are exposed by their servers.
    const toolExecutionUrl = `${serverConfig.url}/execute`; 

    console.log(`Executing tool ${toolId} on ${toolExecutionUrl} with parameters:`, parameters);

    const response = await fetch(toolExecutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolId: toolId, // Pass the toolId to the server if it needs it
        parameters: parameters,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Tool execution failed with status ${response.status}: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(`Tool ${toolId} execution successful:`, result);
    return result;

  } catch (error) {
    console.error(`Error executing tool ${toolId}:`, error);
    return {
      status: 'error',
      error: error.message
    };
  }
}

// Simulate GitHub tool execution
function simulateGithubTool(toolId, parameters) {
  const action = toolId.replace('mcp_github_', '');
  
  return {
    status: 'success',
    data: {
      action,
      simulated: true,
      parameters,
      result: `Simulated GitHub ${action} operation completed successfully.`
    }
  };
}

// Simulate memory tool execution
function simulateMemoryTool(toolId, parameters) {
  const action = toolId.replace('mcp_memory_', '');
  
  return {
    status: 'success',
    data: {
      action,
      simulated: true,
      parameters,
      result: `Simulated memory ${action} operation completed successfully.`
    }
  };
}

// Simulate Windows CLI tool execution
function simulateWinCliTool(toolId, parameters) {
  const action = toolId.replace('mcp_win_cli_', '');
  
  return {
    status: 'success',
    data: {
      action,
      simulated: true,
      parameters,
      output: `Simulated Windows CLI ${action} command executed successfully.`
    }
  };
}

// Simulate filesystem tool execution
function simulateFilesystemTool(toolId, parameters) {
  let result;
  
  switch (toolId) {
    case 'read_file':
      result = {
        content: 'Simulated file content for ' + (parameters.target_file || 'unknown file'),
        lineCount: 10
      };
      break;
    case 'write_file':
      result = {
        success: true,
        file: parameters.target_file || 'unknown file'
      };
      break;
    case 'list_dir':
      result = {
        items: [
          { name: 'file1.txt', type: 'file' },
          { name: 'file2.js', type: 'file' },
          { name: 'dir1', type: 'directory' }
        ]
      };
      break;
    default:
      result = {
        success: true,
        operation: toolId
      };
  }
  
  return {
    status: 'success',
    data: result
  };
}

// Clean up resources when process exits
['SIGINT', 'SIGTERM', 'exit'].forEach(signal => {
  process.on(signal, () => {
    console.log('Cleaning up server processes...');
    serverProcesses.forEach((info, key) => {
      if (info.process && typeof info.process.kill === 'function') {
        info.process.kill();
      }
    });
  });
});

export default {
  registerTool,
  executeToolProxy
}; 
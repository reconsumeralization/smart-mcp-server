import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  server: '\x1b[36m', // Cyan
  client: '\x1b[32m', // Green
  error: '\x1b[31m',  // Red
  info: '\x1b[33m',   // Yellow
  reset: '\x1b[0m'    // Reset
};

// Track processes
let serverProcess = null;
let clientProcess = null;

// Start the server
function startServer() {
  console.log(`${colors.info}Starting Smart MCP Server...${colors.reset}`);
  
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`${colors.server}[SERVER] ${data.toString().trim()}${colors.reset}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`${colors.error}[SERVER ERROR] ${data.toString().trim()}${colors.reset}`);
  });
  
  serverProcess.on('close', (code) => {
    console.log(`${colors.info}Server process exited with code ${code}${colors.reset}`);
    serverProcess = null;
    
    // Kill client if server exits
    if (clientProcess) {
      clientProcess.kill();
    }
  });
  
  // Wait for server to start before launching client
  return new Promise((resolve) => {
    // Simple detection of server start by looking for a specific log message
    const serverStartTimeout = setTimeout(() => {
      console.log(`${colors.info}Server startup timeout - assuming it's ready${colors.reset}`);
      resolve();
    }, 5000);
    
    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Server running on port')) {
        clearTimeout(serverStartTimeout);
        console.log(`${colors.info}Server is ready. Starting client...${colors.reset}`);
        resolve();
      }
    });
  });
}

// Start the test client
function startClient() {
  console.log(`${colors.info}Starting Smart MCP Test Client...${colors.reset}`);
  
  clientProcess = spawn('node', ['test-client.js'], {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit'
  });
  
  clientProcess.on('close', (code) => {
    console.log(`${colors.info}Client process exited with code ${code}${colors.reset}`);
    clientProcess = null;
    
    // Ask if the user wants to continue testing or exit
    if (serverProcess) {
      rl.question('Client closed. Do you want to restart the client? (y/n) ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          startClient();
        } else {
          cleanup();
          rl.close();
        }
      });
    }
  });
}

// Clean up processes
function cleanup() {
  console.log(`${colors.info}Cleaning up processes...${colors.reset}`);
  
  if (clientProcess) {
    clientProcess.kill();
    clientProcess = null;
  }
  
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(`${colors.info}Received SIGINT. Cleaning up...${colors.reset}`);
  cleanup();
  rl.close();
});

process.on('SIGTERM', () => {
  console.log(`${colors.info}Received SIGTERM. Cleaning up...${colors.reset}`);
  cleanup();
  rl.close();
});

// Run the test
async function runTest() {
  try {
    // Start server first
    await startServer();
    
    // Give the server a moment to fully initialize
    setTimeout(() => {
      // Start client
      startClient();
    }, 1000);
    
  } catch (error) {
    console.error(`${colors.error}Error running test: ${error.message}${colors.reset}`);
    cleanup();
    rl.close();
  }
}

// Start the test
console.log(`${colors.info}=== Smart MCP Server Test ====${colors.reset}`);
runTest().catch(error => {
  console.error(`${colors.error}Unhandled error: ${error.message}${colors.reset}`);
  cleanup();
  rl.close();
  process.exit(1);
}); 
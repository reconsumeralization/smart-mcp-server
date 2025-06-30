/* eslint-disable no-console */
import fetch from 'node-fetch';
import { createInterface } from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Server URL (default to localhost:3000)
const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask questions
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Fetch all tools from the server
async function fetchTools(query = '') {
  try {
    const url = query
      ? `${SERVER_URL}/tools?query=${encodeURIComponent(query)}`
      : `${SERVER_URL}/tools`;

    console.log(`Fetching tools from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data.tools || [];
  } catch (error) {
    console.error('Error fetching tools:', error.message);
    return [];
  }
}

// Fetch categories from the server
async function fetchCategories() {
  try {
    const response = await fetch(`${SERVER_URL}/categories`);
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return [];
  }
}

// Execute a tool
async function executeTool(toolId, params) {
  try {
    console.log(`Executing tool ${toolId} with params:`, params);

    const response = await fetch(`${SERVER_URL}/execute/${toolId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Server error: ${errorData.error || response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing tool:', error.message);
    return { error: error.message };
  }
}

// Display health information
async function checkHealth() {
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('\n=== Server Health ===');
    console.log(`Status: ${data.status}`);
    console.log(`Uptime: ${data.uptime.toFixed(2)} seconds`);
    console.log(`Tool Count: ${data.toolCount}`);
    console.log(`Cache Age: ${(Date.now() - data.cacheAge) / 1000} seconds`);
    console.log(`Timestamp: ${data.timestamp}`);
    console.log('=====================\n');
  } catch (error) {
    console.error('Error checking health:', error.message);
  }
}

// Display tools in a formatted way
function displayTools(tools) {
  if (!tools || tools.length === 0) {
    console.log('No tools found.');
    return;
  }

  console.log(`\nFound ${tools.length} tools:`);
  console.log('====================');

  // Group by category
  const categorized = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});

  // Display by category
  for (const [category, categoryTools] of Object.entries(categorized)) {
    console.log(`\n== ${category.toUpperCase()} (${categoryTools.length}) ==`);
    categoryTools.forEach((tool, index) => {
      console.log(
        `${index + 1}. ${tool.name} (${tool.id}): ${tool.description}`
      );
    });
  }
  console.log('====================\n');
}

// Interactive menu
async function showMenu() {
  while (true) {
    console.log('\n=== Smart MCP Test Client ===');
    console.log('1. Fetch all tools');
    console.log('2. Fetch tools by context query');
    console.log('3. List tool categories');
    console.log('4. Execute a tool');
    console.log('5. Check server health');
    console.log('6. Exit');
    console.log('============================');

    const choice = await askQuestion('Enter your choice (1-6): ');

    switch (choice) {
      case '1': {
        const allTools = await fetchTools();
        displayTools(allTools);
        break;
      }
      case '2': {
        const query = await askQuestion('Enter your context query: ');
        const filteredTools = await fetchTools(query);
        displayTools(filteredTools);
        break;
      }
      case '3': {
        const categories = await fetchCategories();
        console.log('\n=== Categories ===');
        categories.forEach((cat, index) => {
          console.log(`${index + 1}. ${cat.id} (${cat.count} tools)`);
        });
        console.log('==================\n');
        break;
      }
      case '4': {
        const toolId = await askQuestion('Enter tool ID to execute: ');
        const paramsStr = await askQuestion('Enter parameters as JSON: ');
        let params;
        try {
          params = JSON.parse(paramsStr);
        } catch (error) {
          console.error('Invalid JSON. Please provide valid JSON parameters.');
          break;
        }
        const result = await executeTool(toolId, params);
        console.log('\n=== Execution Result ===');
        console.log(JSON.stringify(result, null, 2));
        console.log('========================\n');
        break;
      }
      case '5': {
        await checkHealth();
        break;
      }
      case '6': {
        console.log('Exiting...');
        rl.close();
        return;
      }
      default: {
        console.log('Invalid choice. Please enter a number from 1 to 6.');
      }
    }
  }
}

// Start the test client
async function main() {
  console.log('Starting Smart MCP Test Client...');
  console.log(`Connecting to server at: ${SERVER_URL}`);

  try {
    // Check if server is up
    await checkHealth();

    // Start interactive menu
    await showMenu();
  } catch (error) {
    console.error('An error occurred:', error);
    rl.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

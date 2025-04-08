/**
 * Context-Aware Tool Selector Example
 * 
 * This script demonstrates how the context-aware tool selector works with various user queries.
 */

import { 
  selectToolsForContext, 
  recordToolUsage, 
  getToolsByCategory, 
  getToolRecommendations
} from '../context-aware-selector.js';

// Sample available tools
const availableTools = [
  { id: 'read_file', name: 'Read File', description: 'Read file content' },
  { id: 'write_file', name: 'Write File', description: 'Write content to file' },
  { id: 'list_dir', name: 'List Directory', description: 'List directory contents' },
  { id: 'delete_file', name: 'Delete File', description: 'Delete a file' },
  { id: 'file_search', name: 'File Search', description: 'Search for files' },
  { id: 'codebase_search', name: 'Codebase Search', description: 'Search across codebase' },
  { id: 'grep_search', name: 'Grep Search', description: 'Search with regex' },
  { id: 'edit_file', name: 'Edit File', description: 'Edit file content' },
  { id: 'reapply', name: 'Reapply', description: 'Reapply previous edit' },
  { id: 'github', name: 'GitHub', description: 'GitHub operations' },
  { id: 'git', name: 'Git', description: 'Git operations' },
  { id: 'memory_create', name: 'Memory Create', description: 'Create memory entry' },
  { id: 'memory_read', name: 'Memory Read', description: 'Read from memory' },
  { id: 'memory_search', name: 'Memory Search', description: 'Search memory' },
  { id: 'memory_delete', name: 'Memory Delete', description: 'Delete memory entry' },
  { id: 'win_cli', name: 'Windows CLI', description: 'Windows command line' },
  { id: 'execute_command', name: 'Execute Command', description: 'Execute shell command' },
  { id: 'ssh', name: 'SSH', description: 'SSH operations' },
  { id: 'sequential_thinking', name: 'Sequential Thinking', description: 'Think step by step' },
  { id: 'web_search', name: 'Web Search', description: 'Search the web' },
  { id: 'gemini_generate_text', name: 'Gemini Generate Text', description: 'Generate text with Gemini' },
  { id: 'gemini_chat', name: 'Gemini Chat', description: 'Chat with Gemini AI' }
];

// Test queries to demonstrate different contexts
const testQueries = [
  "I need to read a file",
  "Help me edit the code in this file",
  "Search the codebase for a specific function",
  "I want to push my changes to GitHub",
  "Can you run a command for me?",
  "Search the web for Node.js best practices",
  "I need to think about this problem step by step",
  "Generate documentation for my API using Gemini"
];

/**
 * Format tool result for display
 */
function formatTool(tool) {
  return `${tool.id} (Score: ${tool.relevanceScore.toFixed(2)}) - ${tool.description}`;
}

/**
 * Run a demonstration with a specific query
 */
function runDemoWithQuery(query) {
  console.log(`\n--- User Query: "${query}" ---`);
  
  // Get recommended tools based on this query
  const toolResults = selectToolsForContext(availableTools, query, 5);
  
  console.log("Top recommended tools:");
  toolResults.forEach((tool, index) => {
    console.log(`${index + 1}. ${formatTool(tool)}`);
  });
  
  // Record usage of the top tool (simulating user selection)
  if (toolResults.length > 0) {
    recordToolUsage(toolResults[0].id);
    console.log(`\nRecorded usage of: ${toolResults[0].id}`);
  }
}

/**
 * Demonstrate category filtering
 */
function demonstrateCategories() {
  console.log("\n=== Tools By Category ===");
  
  const categories = ['FILESYSTEM', 'CODE_EDITING', 'VERSION_CONTROL', 'MEMORY', 'TERMINAL', 'AI'];
  
  categories.forEach(category => {
    const categoryTools = getToolsByCategory(availableTools, category);
    console.log(`\n${category} tools (${categoryTools.length}):`);
    categoryTools.forEach(tool => console.log(`- ${tool.id}: ${tool.description}`));
  });
}

/**
 * Demonstrate tool recommendations based on recent queries
 */
function demonstrateRecommendations() {
  console.log("\n=== Tool Recommendations Based on Recent Queries ===");
  
  const recentQueries = [
    "How do I modify a JavaScript file?",
    "I need to change some code and push it",
    "Help me search for functions in my codebase"
  ];
  
  console.log("Recent queries:");
  recentQueries.forEach(q => console.log(`- "${q}"`));
  
  const recommendations = getToolRecommendations(recentQueries, availableTools);
  
  console.log("\nRecommended tools based on query history:");
  recommendations.forEach((tool, index) => {
    console.log(`${index + 1}. ${formatTool(tool)}`);
  });
}

// Run the demonstration
console.log("=== Context-Aware Tool Selector Demonstration ===");

// Run demos with each test query
testQueries.forEach(runDemoWithQuery);

// Demonstrate category filtering
demonstrateCategories();

// Demonstrate recommendations based on query history
demonstrateRecommendations();

console.log("\n=== Demonstration Complete ==="); 
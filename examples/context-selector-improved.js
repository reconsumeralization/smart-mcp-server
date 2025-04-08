/**
 * Improved Context-Aware Tool Selector Example
 * 
 * This script demonstrates the enhanced context-aware tool selector with:
 * - Usage frequency tracking
 * - Configurable weight factors
 * - Improved recommendations
 */

const { 
  selectToolsForContext, 
  recordToolUsage, 
  getToolsByCategory, 
  getToolRecommendations,
  getMostFrequentlyUsedTools,
  clearUsageHistory,
  updateWeightFactors,
  WEIGHT_FACTORS
} = require('../context-aware-selector');

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
  const usageInfo = tool.usageCount !== undefined ? ` (Usage: ${tool.usageCount})` : '';
  const score = tool.relevanceScore !== undefined ? ` (Score: ${tool.relevanceScore.toFixed(2)})` : '';
  return `${tool.id}${score}${usageInfo} - ${tool.description}`;
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
 * Demonstrate usage frequency tracking
 */
function demonstrateUsageFrequency() {
  console.log("\n=== Usage Frequency Demonstration ===");
  
  // Simulate multiple uses of certain tools
  console.log("Simulating multiple uses of certain tools...");
  
  // Simulate using read_file and edit_file multiple times
  for (let i = 0; i < 5; i++) recordToolUsage('read_file');
  for (let i = 0; i < 3; i++) recordToolUsage('edit_file');
  for (let i = 0; i < 8; i++) recordToolUsage('web_search');
  for (let i = 0; i < 2; i++) recordToolUsage('github');
  
  console.log("Recorded usage patterns: read_file (5), edit_file (3), web_search (8), github (2)");
  
  // Show most frequently used tools
  const frequentTools = getMostFrequentlyUsedTools(availableTools);
  
  console.log("\nMost frequently used tools:");
  frequentTools.forEach((tool, index) => {
    console.log(`${index + 1}. ${formatTool(tool)}`);
  });
  
  // Now demonstrate how this affects recommendations
  console.log("\nRecommendations with usage frequency factored in:");
  const query = "I need to work with some files";
  const recommendations = selectToolsForContext(availableTools, query, 5);
  
  recommendations.forEach((tool, index) => {
    console.log(`${index + 1}. ${formatTool(tool)}`);
  });
}

/**
 * Demonstrate weight factor customization
 */
function demonstrateWeightCustomization() {
  console.log("\n=== Weight Factor Customization ===");
  
  console.log("Current weight factors:");
  console.log(WEIGHT_FACTORS);
  
  const query = "I need to search for something in my code";
  
  console.log("\nRecommendations with default weights:");
  const defaultRecommendations = selectToolsForContext(availableTools, query, 3);
  defaultRecommendations.forEach((tool, index) => {
    console.log(`${index + 1}. ${formatTool(tool)}`);
  });
  
  // Modify weights to prioritize recency more heavily
  console.log("\nModifying weights to prioritize recency and essential tools...");
  updateWeightFactors({
    RECENT_USAGE: 6,        // Double recency importance
    ESSENTIAL_TOOLS: 4      // Double essential tools importance
  });
  
  console.log("Updated weight factors:");
  console.log(WEIGHT_FACTORS);
  
  console.log("\nRecommendations with modified weights:");
  const modifiedRecommendations = selectToolsForContext(availableTools, query, 3);
  modifiedRecommendations.forEach((tool, index) => {
    console.log(`${index + 1}. ${formatTool(tool)}`);
  });
  
  // Reset weights for other tests
  updateWeightFactors({
    RECENT_USAGE: 3,
    ESSENTIAL_TOOLS: 2
  });
}

/**
 * Demonstrate usage history clearing
 */
function demonstrateHistoryClearing() {
  console.log("\n=== Usage History Clearing ===");
  
  console.log("Current frequently used tools:");
  const beforeTools = getMostFrequentlyUsedTools(availableTools);
  beforeTools.forEach((tool, index) => {
    console.log(`${index + 1}. ${formatTool(tool)}`);
  });
  
  console.log("\nClearing usage history...");
  clearUsageHistory();
  
  console.log("Frequently used tools after clearing:");
  const afterTools = getMostFrequentlyUsedTools(availableTools);
  if (afterTools.length === 0) {
    console.log("No tools have been used yet (history cleared successfully)");
  } else {
    afterTools.forEach((tool, index) => {
      console.log(`${index + 1}. ${formatTool(tool)}`);
    });
  }
}

// Run the demonstration
console.log("=== Improved Context-Aware Tool Selector Demonstration ===");

// Run demos with each test query
testQueries.forEach(runDemoWithQuery);

// Demonstrate usage frequency tracking
demonstrateUsageFrequency();

// Demonstrate weight factor customization
demonstrateWeightCustomization();

// Demonstrate usage history clearing
demonstrateHistoryClearing();

console.log("\n=== Demonstration Complete ==="); 
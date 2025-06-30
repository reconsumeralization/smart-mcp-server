/* eslint-disable no-console */

/**
 * Test script for the context-aware selector.
 * This script demonstrates how to use the various functions of the selector,
 */

import {
  selectToolsForContext,
  recordToolUsage,
  getToolsByCategory,
  getToolRecommendations,
} from './context-aware-selector.js';

// Mock tools data for testing
const mockTools = [
  { id: 'edit_file', name: 'Edit File', description: 'Edits a file' },
  { id: 'read_file', name: 'Read File', description: 'Reads a file' },
  {
    id: 'codebase_search',
    name: 'Codebase Search',
    description: 'Searches the codebase',
  },
  {
    id: 'grep_search',
    name: 'Grep Search',
    description: 'Searches using regex',
  },
  {
    id: 'run_terminal_cmd',
    name: 'Run Terminal Command',
    description: 'Executes a command',
  },
  {
    id: 'mcp_win_cli_execute_command',
    name: 'Execute Command',
    description: 'Executes a command',
  },
  {
    id: 'mcp_memory_create_entities',
    name: 'Create Memory Entities',
    description: 'Creates memory entities',
  },
  {
    id: 'mcp_memory_create_relations',
    name: 'Create Memory Relations',
    description: 'Creates memory relations',
  },
  {
    id: 'mcp_github_create_repository',
    name: 'Create GitHub Repository',
    description: 'Creates a GitHub repository',
  },
  {
    id: 'mcp_github_push_files',
    name: 'Push Files',
    description: 'Pushes files to a repository',
  },
];

// Test data for user context
const contexts = [
  {
    id: 'context-1',
    description: 'File editing context',
    userMessage:
      'I need to edit the README.md file to add installation instructions',
    expectedTopTools: ['edit_file', 'read_file'],
  },
  {
    id: 'context-2',
    description: 'GitHub context',
    userMessage:
      'Create a new repository for this project and push the initial commit',
    expectedTopTools: ['mcp_github_create_repository', 'mcp_github_push_files'],
  },
  {
    id: 'context-3',
    description: 'CLI context',
    userMessage: 'Run npm install to set up the project dependencies',
    expectedTopTools: ['run_terminal_cmd', 'mcp_win_cli_execute_command'],
  },
  {
    id: 'context-4',
    description: 'Knowledge graph context',
    userMessage:
      'Save information about the server architecture to the knowledge graph',
    expectedTopTools: [
      'mcp_memory_create_entities',
      'mcp_memory_create_relations',
    ],
  },
  {
    id: 'context-5',
    description: 'Mixed context with search',
    userMessage: 'Search for files containing API definitions and update them',
    expectedTopTools: ['codebase_search', 'grep_search', 'edit_file'],
  },
];

// Test function to evaluate selector performance
function testContextSelector() {
  console.log('CONTEXT-AWARE SELECTOR TEST\n');
  console.log('-'.repeat(50));

  // Test each context
  contexts.forEach((context, index) => {
    console.log(`\nTest ${index + 1}: ${context.description}`);
    console.log(`User message: "${context.userMessage}"`);

    // Get selected tools for this context
    const selectedTools = selectToolsForContext(
      mockTools,
      context.userMessage,
      5
    );

    console.log('\nSelected tools:');
    if (selectedTools && selectedTools.length > 0) {
      selectedTools.forEach((tool, i) => {
        console.log(
          `${i + 1}. ${tool.id} (Score: ${tool.relevance ? tool.relevance.toFixed(2) : 'N/A'})`
        );
      });
    } else {
      console.log('No tools selected');
    }

    // Evaluate results
    const selectedToolIds = selectedTools ? selectedTools.map((t) => t.id) : [];
    const foundExpected = context.expectedTopTools.filter((t) =>
      selectedToolIds.includes(t)
    );

    console.log(
      '\nExpected tools found:',
      foundExpected.length,
      'of',
      context.expectedTopTools.length
    );
    if (foundExpected.length < context.expectedTopTools.length) {
      const missing = context.expectedTopTools.filter(
        (t) => !selectedToolIds.includes(t)
      );
      console.log('Missing expected tools:', missing.join(', '));
    }

    console.log('-'.repeat(50));

    // Record usage for the top tool to simulate user interaction
    if (selectedTools && selectedTools.length > 0) {
      recordToolUsage(selectedTools[0].id);
    }
  });

  // Test tool categories
  console.log('\nTool Categories Test:');
  const categories = [
    'FILESYSTEM',
    'CODE_EDITING',
    'VERSION_CONTROL',
    'MEMORY',
    'TERMINAL',
    'AI',
  ];

  categories.forEach((category) => {
    const tools = getToolsByCategory(mockTools, category);
    console.log(`\n${category} category tools:`, tools ? tools.length : 0);
    if (tools && tools.length > 0) {
      tools.forEach((tool) => console.log(`- ${tool.id}`));
    }
  });

  // Test recommendations based on usage history
  console.log('\nTool Recommendations Test:');
  const recentQueries = [
    'How do I edit a file?',
    'Search for code related to authentication',
    'Create a new component',
  ];
  const recommendations = getToolRecommendations(recentQueries, mockTools, 5);

  console.log('\nRecommended tools based on recent queries:');
  if (recommendations && recommendations.length > 0) {
    recommendations.forEach((tool, i) => {
      console.log(
        `${i + 1}. ${tool.id} (Score: ${tool.relevance ? tool.relevance.toFixed(2) : 'N/A'})`
      );
    });
  } else {
    console.log('No recommendations available');
  }

  console.log('\nTest completed successfully!');
}

// Run the test
testContextSelector();

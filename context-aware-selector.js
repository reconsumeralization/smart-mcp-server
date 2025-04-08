/**
 * Context-Aware Tool Selector
 * 
 * This module provides functionality to select the most relevant tools based on user context.
 * It uses a scoring system that considers explicit mentions, category keywords, recent usage, and essential status.
 */

// Tool categories with their associated tools
const TOOL_CATEGORIES = {
  FILESYSTEM: ['read_file', 'write_file', 'list_dir', 'delete_file', 'file_search', 'codebase_search', 'grep_search'],
  CODE_EDITING: ['edit_file', 'reapply'],
  VERSION_CONTROL: [
    'github', 'git', 
    'mcp_github_create_repository', 'mcp_github_push_files', 'mcp_github_create_pull_request',
    'mcp_github_create_branch', 'mcp_github_merge_pull_request', 'mcp_github_get_file_contents'
  ],
  MEMORY: [
    'memory_create', 'memory_read', 'memory_search', 'memory_delete',
    'mcp_memory_create_entities', 'mcp_memory_create_relations', 'mcp_memory_add_observations',
    'mcp_memory_delete_entities', 'mcp_memory_delete_relations', 'mcp_memory_search_nodes',
    'mcp_memory_open_nodes', 'mcp_memory_read_graph'
  ],
  TERMINAL: [
    'win_cli', 'execute_command', 'ssh', 'run_terminal_cmd',
    'mcp_win_cli_execute_command', 'mcp_win_cli_ssh_execute', 'mcp_win_cli_ssh_disconnect'
  ],
  AI: [
    'sequential_thinking', 'web_search', 'gemini_generate_text', 'gemini_chat', 'gemini_chat_message',
    'mcp_sequential_thinking_sequentialthinking', 'web_search',
    'gemini_generate_text', 'gemini_create_chat', 'gemini_chat_message', 
    'gemini_get_chat_history', 'gemini_generate_with_images', 'gemini_generate_embedding'
  ]
};

// Keywords associated with each category
const CONTEXT_KEYWORDS = {
  FILESYSTEM: ['file', 'directory', 'read', 'write', 'folder', 'search', 'list', 'delete', 'grep', 'code', 'content'],
  CODE_EDITING: ['edit', 'change', 'update', 'modify', 'code', 'fix', 'reapply', 'implementation'],
  VERSION_CONTROL: ['git', 'github', 'commit', 'push', 'pull', 'branch', 'merge', 'repository', 'pr', 'pull request', 'repo'],
  MEMORY: ['remember', 'store', 'recall', 'memory', 'knowledge', 'retrieve', 'save', 'forget', 'search', 'entities', 'relations'],
  TERMINAL: ['run', 'execute', 'command', 'terminal', 'shell', 'powershell', 'cmd', 'ssh', 'remote', 'cli'],
  AI: ['think', 'research', 'search', 'generate', 'web', 'sequential', 'chat', 'gemini', 'ai', 'generate', 'model', 
       'creative', 'answer', 'converse', 'image', 'vision', 'embedding', 'vector', 'text', 'content']
};

// Tools that are considered essential and should have a higher baseline score
const ESSENTIAL_TOOLS = ['read_file', 'edit_file', 'list_dir', 'codebase_search'];

// Store recently used tools with timestamps for recency scoring
let recentlyUsedTools = [];

// Weight factors for different context signals (exposed for configuration)
const WEIGHT_FACTORS = {
  EXPLICIT_MENTION: 10,   // Directly mentioned in query
  CATEGORY_MATCH: 5,      // Category keywords present
  RECENT_USAGE: 3,        // Tool used recently
  RECENT_USAGE_DECAY_MINUTES: 60, // Time period for recency decay (1 hour)
  ESSENTIAL_TOOLS: 2,     // Essential tools to always include
  USAGE_FREQUENCY: 1      // Frequency of usage over time
};

// Store tool usage frequency history
const toolUsageCounters = new Map();

/**
 * Record a tool as being used
 * @param {string} toolId - The ID of the tool that was used
 */
function recordToolUsage(toolId) {
  // Add to the recent tools with current timestamp
  recentlyUsedTools.push({
    id: toolId,
    timestamp: Date.now()
  });
  
  // Keep only the 20 most recent tools
  if (recentlyUsedTools.length > 20) {
    recentlyUsedTools.shift();
  }
  
  // Update usage counter for frequency scoring
  const currentCount = toolUsageCounters.get(toolId) || 0;
  toolUsageCounters.set(toolId, currentCount + 1);
}

/**
 * Get the category for a tool
 * @param {string} toolId - The ID of the tool
 * @returns {string|null} - The category or null if not found
 */
function getToolCategory(toolId) {
  // Check for direct match
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    if (tools.includes(toolId)) {
      return category;
    }
  }
  
  // Check for partial matches with prefixes
  if (toolId.startsWith('mcp_github_')) {
    return 'VERSION_CONTROL';
  } else if (toolId.startsWith('mcp_memory_')) {
    return 'MEMORY';
  } else if (toolId.startsWith('mcp_win_cli_')) {
    return 'TERMINAL';
  } else if (toolId.startsWith('mcp_sequential_thinking_') || toolId === 'web_search') {
    return 'AI';
  }
  
  return null;
}

/**
 * Calculate a score for a tool based on the context
 * @param {object} tool - The tool to score
 * @param {string} context - The user's context/query
 * @returns {number} - The relevance score
 */
function scoreToolForContext(tool, context) {
  const toolId = tool.id || tool.name;
  let score = 0;
  
  // 1. Score for explicit mention (highest weight)
  const toolPattern = new RegExp(`\\b${toolId}\\b`, 'i');
  if (toolPattern.test(context)) {
    score += WEIGHT_FACTORS.EXPLICIT_MENTION;
  }
  
  // 2. Score for category keyword matches
  const category = getToolCategory(toolId);
  
  if (category && CONTEXT_KEYWORDS[category]) {
    CONTEXT_KEYWORDS[category].forEach(keyword => {
      if (context.toLowerCase().includes(keyword.toLowerCase())) {
        score += WEIGHT_FACTORS.CATEGORY_MATCH;
      }
    });
  }
  
  // 3. Score for recent usage (recency matters)
  const recentUsage = recentlyUsedTools.find(rt => rt.id === toolId);
  if (recentUsage) {
    // Calculate recency factor (more recent = higher score)
    const ageInMinutes = (Date.now() - recentUsage.timestamp) / (1000 * 60);
    const recencyFactor = Math.max(0, 1 - (ageInMinutes / WEIGHT_FACTORS.RECENT_USAGE_DECAY_MINUTES));
    score += WEIGHT_FACTORS.RECENT_USAGE * recencyFactor;
  }
  
  // 4. Score for essential status
  if (ESSENTIAL_TOOLS.includes(toolId)) {
    score += WEIGHT_FACTORS.ESSENTIAL_TOOLS;
  }
  
  // 5. Score for usage frequency (popular tools get small boost)
  const usageCount = toolUsageCounters.get(toolId) || 0;
  if (usageCount > 0) {
    // Logarithmic scaling to prevent very frequent tools from dominating
    score += WEIGHT_FACTORS.USAGE_FREQUENCY * Math.log10(1 + usageCount);
  }
  
  return score;
}

/**
 * Select the most relevant tools based on the user's context
 * @param {Object[]} availableTools - Array of available tools
 * @param {string} userContext - The user's context/query
 * @param {number} limit - Maximum number of tools to return
 * @returns {Object[]} - Sorted array of most relevant tools
 */
function selectToolsForContext(availableTools, userContext, limit = 5) {
  if (!availableTools || !availableTools.length || !userContext) {
    return [];
  }
  
  // Score each tool
  const scoredTools = availableTools.map(tool => ({
    tool,
    score: scoreToolForContext(tool, userContext)
  }));
  
  // Sort by score (descending)
  scoredTools.sort((a, b) => b.score - a.score);
  
  // Return top N tools
  return scoredTools
    .slice(0, limit)
    .map(st => ({
      ...st.tool,
      relevance: st.score
    }));
}

/**
 * Get tools by category
 * @param {Object[]} availableTools - Array of available tools
 * @param {string} category - The category to filter by
 * @returns {Object[]} - Array of tools in the requested category
 */
function getToolsByCategory(availableTools, category) {
  if (!availableTools || !availableTools.length || !TOOL_CATEGORIES[category]) {
    return [];
  }
  
  return availableTools.filter(tool => 
    TOOL_CATEGORIES[category].includes(tool.id || tool.name)
  );
}

/**
 * Analyze the user's interaction history and provide recommended tools
 * @param {string[]} recentQueries - Recent user queries
 * @param {Object[]} availableTools - Array of available tools
 * @param {number} limit - Maximum number of tools to return
 * @returns {Object[]} - Array of recommended tools
 */
function getToolRecommendations(recentQueries, availableTools, limit = 3) {
  if (!recentQueries || !recentQueries.length || !availableTools || !availableTools.length) {
    return [];
  }
  
  // Combine recent queries into a single context for analysis
  const combinedContext = recentQueries.join(' ');
  
  // Get recommended tools based on the combined context
  return selectToolsForContext(availableTools, combinedContext, limit);
}

/**
 * Get most frequently used tools
 * @param {Object[]} availableTools - Array of available tools
 * @param {number} limit - Maximum number of tools to return
 * @returns {Object[]} - Array of most frequently used tools
 */
function getMostFrequentlyUsedTools(availableTools, limit = 5) {
  if (!availableTools || !availableTools.length) {
    return [];
  }
  
  // Get tools with usage counts
  const toolsWithCounts = availableTools
    .map(tool => {
      const toolId = tool.id || tool.name;
      return {
        ...tool,
        usageCount: toolUsageCounters.get(toolId) || 0
      };
    })
    .filter(tool => tool.usageCount > 0); // Only include used tools
  
  // Sort by usage count (descending)
  toolsWithCounts.sort((a, b) => b.usageCount - a.usageCount);
  
  // Return top N tools
  return toolsWithCounts.slice(0, limit);
}

/**
 * Clear usage history and counters
 */
function clearUsageHistory() {
  recentlyUsedTools = [];
  toolUsageCounters.clear();
}

/**
 * Update weight factors for scoring
 * @param {Object} newWeights - Object with weight factors to update
 */
function updateWeightFactors(newWeights) {
  Object.assign(WEIGHT_FACTORS, newWeights);
}

// Export all the needed functions
export {
    recordToolUsage,
    getToolsByCategory,
    selectToolsForContext,
    getToolRecommendations,
    getMostFrequentlyUsedTools,
    clearUsageHistory,
    updateWeightFactors
};
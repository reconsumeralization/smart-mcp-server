import natural from 'natural';

// Tool categories for context-based selection
const TOOL_CATEGORIES = {
  FILESYSTEM: ['read_file', 'write_file', 'list_dir', 'delete_file', 'file_search', 'codebase_search', 'grep_search'],
  CODE_EDITING: ['edit_file', 'reapply'],
  VERSION_CONTROL: ['github', 'git'],
  MEMORY: ['memory_create', 'memory_read', 'memory_search', 'memory_delete'],
  TERMINAL: ['win_cli', 'execute_command', 'ssh'],
  AI: ['sequential_thinking', 'web_search'],
};

// Tokenizer for text analysis
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Keywords that help identify context
const CONTEXT_KEYWORDS = {
  FILESYSTEM: ['file', 'directory', 'folder', 'path', 'read', 'write', 'list', 'search', 'find', 'code', 'grep', 'content'],
  CODE_EDITING: ['edit', 'change', 'modify', 'update', 'code', 'function', 'class', 'variable', 'implement', 'fix', 'bug'],
  VERSION_CONTROL: ['github', 'git', 'commit', 'push', 'pull', 'branch', 'merge', 'repository', 'repo', 'issue', 'pr'],
  MEMORY: ['remember', 'recall', 'store', 'knowledge', 'graph', 'entity', 'relation', 'concept', 'memory'],
  TERMINAL: ['execute', 'run', 'command', 'terminal', 'shell', 'powershell', 'cmd', 'bash', 'script', 'cli'],
  AI: ['think', 'analyze', 'reason', 'search', 'web', 'internet', 'information', 'knowledge'],
};

// Weight factors for different context signals
const WEIGHT_FACTORS = {
  EXPLICIT_MENTION: 10,   // Directly mentioned in query
  CATEGORY_MATCH: 5,      // Category keywords present
  RECENT_USAGE: 3,        // Tool used recently
  DEFAULT_TOOLS: 2,       // Essential tools to always include
};

// Recently used tools tracking
const recentlyUsedTools = [];
const MAX_RECENT_TOOLS = 10;

// Record tool usage for context awareness
export function recordToolUsage(toolId) {
  // Remove if already in list (to move to front)
  const index = recentlyUsedTools.indexOf(toolId);
  if (index > -1) {
    recentlyUsedTools.splice(index, 1);
  }
  
  // Add to front of list
  recentlyUsedTools.unshift(toolId);
  
  // Keep list at maximum size
  if (recentlyUsedTools.length > MAX_RECENT_TOOLS) {
    recentlyUsedTools.pop();
  }
}

// Score a tool based on context
function scoreToolForContext(toolId, userQuery, availableTools) {
  let score = 0;
  
  // Normalize the user query
  const normalizedQuery = userQuery.toLowerCase();
  const queryTokens = tokenizer.tokenize(normalizedQuery);
  const stemmedTokens = queryTokens.map(token => stemmer.stem(token));
  
  // Check for direct tool name mention
  if (normalizedQuery.includes(toolId.toLowerCase())) {
    score += WEIGHT_FACTORS.EXPLICIT_MENTION;
  }
  
  // Check which category the tool belongs to
  let toolCategory = null;
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    if (tools.some(toolPattern => toolId.includes(toolPattern))) {
      toolCategory = category;
      break;
    }
  }
  
  // If we found a category, check for related keywords
  if (toolCategory) {
    const categoryKeywords = CONTEXT_KEYWORDS[toolCategory] || [];
    for (const keyword of categoryKeywords) {
      if (normalizedQuery.includes(keyword)) {
        score += WEIGHT_FACTORS.CATEGORY_MATCH;
        break; // Only count category match once
      }
    }
  }
  
  // Check if the tool has been recently used
  const recentIndex = recentlyUsedTools.indexOf(toolId);
  if (recentIndex > -1) {
    // More recent = higher score
    score += WEIGHT_FACTORS.RECENT_USAGE * (1 - recentIndex / recentlyUsedTools.length);
  }
  
  // Boost essential tools that should always be available
  const essentialTools = [
    'read_file', 
    'edit_file', 
    'run_terminal_cmd',
    'web_search'
  ];
  
  if (essentialTools.some(essential => toolId.includes(essential))) {
    score += WEIGHT_FACTORS.DEFAULT_TOOLS;
  }
  
  return score;
}

// Select the most relevant tools based on context
export function selectToolsForContext(allTools, userQuery, maxTools = 40) {
  // Special case: if no query, return essential tools
  if (!userQuery || userQuery.trim() === '') {
    return allTools.slice(0, maxTools);
  }
  
  // Score each tool based on the user's query
  const toolsWithScores = allTools.map(tool => ({
    tool,
    score: scoreToolForContext(tool.id || tool.name, userQuery, allTools)
  }));
  
  // Sort by score (highest first)
  toolsWithScores.sort((a, b) => b.score - a.score);
  
  // Take the top N tools
  return toolsWithScores.slice(0, maxTools).map(item => item.tool);
}

export default {
  selectToolsForContext,
  recordToolUsage
}; 
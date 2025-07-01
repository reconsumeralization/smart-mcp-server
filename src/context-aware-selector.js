/**
 * 🚀 Context-Aware Tool Selector 2.0 🚀
 *
 * This module revolutionizes tool selection by leveraging advanced context analysis,
 * semantic similarity, adaptive learning, and multi-factor scoring. It not only considers
 * explicit mentions, category keywords, recency, and essential status, but also
 * semantic context, user intent, and dynamic feedback for continuous improvement.
 */

// --- Tool Category Definitions ---
export const TOOL_CATEGORIES = {
  FILESYSTEM: [
    'read_file',
    'write_file',
    'list_dir',
    'delete_file',
    'file_search',
    'codebase_search',
    'grep_search',
  ],
  CODE_EDITING: ['edit_file', 'reapply'],
  VERSION_CONTROL: [
    'github',
    'git',
    'mcp_github_create_repository',
    'mcp_github_push_files',
    'mcp_github_create_pull_request',
    'mcp_github_create_branch',
    'mcp_github_merge_pull_request',
    'mcp_github_get_file_contents',
  ],
  MEMORY: [
    'memory_create',
    'memory_read',
    'memory_search',
    'memory_delete',
    'mcp_memory_create_entities',
    'mcp_memory_create_relations',
    'mcp_memory_add_observations',
    'mcp_memory_delete_entities',
    'mcp_memory_delete_relations',
    'mcp_memory_search_nodes',
    'mcp_memory_open_nodes',
    'mcp_memory_read_graph',
  ],
  TERMINAL: [
    'win_cli',
    'execute_command',
    'ssh',
    'run_terminal_cmd',
    'mcp_win_cli_execute_command',
    'mcp_win_cli_ssh_execute',
    'mcp_win_cli_ssh_disconnect',
  ],
  AI: [
    'sequential_thinking',
    'web_search',
    'gemini_generate_text',
    'gemini_chat',
    'gemini_chat_message',
    'mcp_sequential_thinking_sequentialthinking',
    'web_search',
    'gemini_generate_text',
    'gemini_create_chat',
    'gemini_chat_message',
    'gemini_get_chat_history',
    'gemini_generate_with_images',
    'gemini_generate_embedding',
  ],
};

// --- Contextual Keywords for Each Category ---
const CONTEXT_KEYWORDS = {
  FILESYSTEM: [
    'file',
    'directory',
    'read',
    'write',
    'folder',
    'search',
    'list',
    'delete',
    'grep',
    'code',
    'content',
  ],
  CODE_EDITING: [
    'edit',
    'change',
    'update',
    'modify',
    'code',
    'fix',
    'reapply',
    'implementation',
  ],
  VERSION_CONTROL: [
    'git',
    'github',
    'commit',
    'push',
    'pull',
    'branch',
    'merge',
    'repository',
    'pr',
    'pull request',
    'repo',
  ],
  MEMORY: [
    'remember',
    'store',
    'recall',
    'memory',
    'knowledge',
    'retrieve',
    'save',
    'forget',
    'search',
    'entities',
    'relations',
  ],
  TERMINAL: [
    'run',
    'execute',
    'command',
    'terminal',
    'shell',
    'powershell',
    'cmd',
    'ssh',
    'remote',
    'cli',
  ],
  AI: [
    'think',
    'research',
    'search',
    'generate',
    'web',
    'sequential',
    'chat',
    'gemini',
    'ai',
    'generate',
    'model',
    'creative',
    'answer',
    'converse',
    'image',
    'vision',
    'embedding',
    'vector',
    'text',
    'content',
  ],
};

// --- Essential Tools (Always Prioritized) ---
const ESSENTIAL_TOOLS = [
  'read_file',
  'edit_file',
  'list_dir',
  'codebase_search',
];

// --- Usage Tracking and Adaptive Learning ---
let recentlyUsedTools = [];
const toolUsageCounters = new Map();
const toolFeedbackScores = new Map(); // Revolution: user feedback integration

// --- Weight Factors (Configurable & Adaptive) ---
const WEIGHT_FACTORS = {
  EXPLICIT_MENTION: 12, // Directly mentioned in query (increased for revolution)
  CATEGORY_MATCH: 6, // Category keywords present
  SEMANTIC_SIMILARITY: 8, // Revolution: semantic similarity to context
  RECENT_USAGE: 4, // Tool used recently
  RECENT_USAGE_DECAY_MINUTES: 90, // Revolution: longer recency window
  ESSENTIAL_TOOLS: 3, // Essential tools to always include
  USAGE_FREQUENCY: 1.5, // Frequency of usage over time
  FEEDBACK: 5, // Revolution: user feedback weight
};

// --- Revolution: Simple Semantic Similarity (Jaccard) ---
function semanticSimilarity(a, b) {
  if (!a || !b) return 0;
  const setA = new Set(a.toLowerCase().split(/\W+/));
  const setB = new Set(b.toLowerCase().split(/\W+/));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// --- Revolution: User Feedback Integration ---
export function recordToolFeedback(toolId, feedbackScore) {
  // feedbackScore: +1 (positive), 0 (neutral), -1 (negative)
  const prev = toolFeedbackScores.get(toolId) || 0;
  toolFeedbackScores.set(toolId, prev + feedbackScore);
}

// --- Usage Recording ---
export function recordToolUsage(toolId) {
  recentlyUsedTools.push({
    id: toolId,
    timestamp: Date.now(),
  });
  if (recentlyUsedTools.length > 30) {
    recentlyUsedTools.shift();
  }
  const currentCount = toolUsageCounters.get(toolId) || 0;
  toolUsageCounters.set(toolId, currentCount + 1);
}

// --- Category Detection (Enhanced) ---
function getToolCategory(toolId) {
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    if (tools.includes(toolId)) return category;
  }
  if (toolId.startsWith('mcp_github_')) return 'VERSION_CONTROL';
  if (toolId.startsWith('mcp_memory_')) return 'MEMORY';
  if (toolId.startsWith('mcp_win_cli_')) return 'TERMINAL';
  if (toolId.startsWith('mcp_sequential_thinking_') || toolId === 'web_search')
    return 'AI';
  return null;
}

// --- Revolution: Tool Description Extraction Helper ---
function getToolDescription(tool) {
  return tool.description || tool.summary || tool.name || tool.id || '';
}

// --- Revolution: Multi-Factor, Adaptive, Semantic Scoring ---
function scoreToolForContext(tool, context) {
  const toolId = tool.id || tool.name;
  let score = 0;

  // 1. Explicit mention
  const toolPattern = new RegExp(`\\b${toolId}\\b`, 'i');
  if (toolPattern.test(context)) {
    score += WEIGHT_FACTORS.EXPLICIT_MENTION;
  }

  // 2. Category keyword matches
  const category = getToolCategory(toolId);
  if (category && CONTEXT_KEYWORDS[category]) {
    CONTEXT_KEYWORDS[category].forEach((keyword) => {
      if (context.toLowerCase().includes(keyword.toLowerCase())) {
        score += WEIGHT_FACTORS.CATEGORY_MATCH;
      }
    });
  }

  // 3. Revolution: Semantic similarity between tool description and context
  const toolDesc = getToolDescription(tool);
  const sim = semanticSimilarity(toolDesc, context);
  score += WEIGHT_FACTORS.SEMANTIC_SIMILARITY * sim;

  // 4. Recent usage (recency matters)
  const recentUsage = recentlyUsedTools.find((rt) => rt.id === toolId);
  if (recentUsage) {
    const ageInMinutes = (Date.now() - recentUsage.timestamp) / (1000 * 60);
    const recencyFactor = Math.max(
      0,
      1 - ageInMinutes / WEIGHT_FACTORS.RECENT_USAGE_DECAY_MINUTES
    );
    score += WEIGHT_FACTORS.RECENT_USAGE * recencyFactor;
  }

  // 5. Essential status
  if (ESSENTIAL_TOOLS.includes(toolId)) {
    score += WEIGHT_FACTORS.ESSENTIAL_TOOLS;
  }

  // 6. Usage frequency (logarithmic scaling)
  const usageCount = toolUsageCounters.get(toolId) || 0;
  if (usageCount > 0) {
    score += WEIGHT_FACTORS.USAGE_FREQUENCY * Math.log10(1 + usageCount);
  }

  // 7. Revolution: User feedback
  const feedback = toolFeedbackScores.get(toolId) || 0;
  if (feedback !== 0) {
    score += WEIGHT_FACTORS.FEEDBACK * feedback;
  }

  // 8. Revolution: Diversity boost (prefer tools from underrepresented categories)
  if (category) {
    const categoryUsage = Array.from(toolUsageCounters.entries())
      .filter(([id]) => getToolCategory(id) === category)
      .reduce((sum, [, count]) => sum + count, 0);
    if (categoryUsage < 3) score += 1.5; // Boost for less-used categories
  }

  return score;
}

// --- Revolution: Select Most Relevant Tools (with Diversity) ---
export function selectToolsForContext(availableTools, userContext, limit = 5) {
  if (!availableTools || !availableTools.length || !userContext) return [];

  // Score each tool
  const scoredTools = availableTools.map((tool) => ({
    tool,
    score: scoreToolForContext(tool, userContext),
  }));

  // Sort by score (descending)
  scoredTools.sort((a, b) => b.score - a.score);

  // Revolution: Ensure category diversity in top N
  const selected = [];
  const seenCategories = new Set();
  for (const { tool, score } of scoredTools) {
    const cat = getToolCategory(tool.id || tool.name);
    if (!seenCategories.has(cat) || selected.length < Math.floor(limit / 2)) {
      selected.push({ ...tool, relevance: score });
      seenCategories.add(cat);
    }
    if (selected.length >= limit) break;
  }
  // If not enough, fill up with next best
  if (selected.length < limit) {
    for (const { tool, score } of scoredTools) {
      if (!selected.find((t) => (t.id || t.name) === (tool.id || tool.name))) {
        selected.push({ ...tool, relevance: score });
        if (selected.length >= limit) break;
      }
    }
  }
  return selected.slice(0, limit);
}

// --- Get Tools by Category ---
export function getToolsByCategory(availableTools, category) {
  if (!availableTools || !availableTools.length || !TOOL_CATEGORIES[category])
    return [];
  return availableTools.filter((tool) =>
    TOOL_CATEGORIES[category].includes(tool.id || tool.name)
  );
}

// --- Revolution: Personalized Recommendations (history + context) ---
export function getToolRecommendations(
  recentQueries,
  availableTools,
  limit = 3
) {
  if (
    !recentQueries ||
    !recentQueries.length ||
    !availableTools ||
    !availableTools.length
  )
    return [];
  // Revolution: Weight recent queries by recency
  const weightedContext = recentQueries
    .map((q, i) => q.repeat(recentQueries.length - i))
    .join(' ');
  return selectToolsForContext(availableTools, weightedContext, limit);
}

// --- Most Frequently Used Tools ---
export function getMostFrequentlyUsedTools(availableTools, limit = 5) {
  if (!availableTools || !availableTools.length) return [];
  const toolsWithCounts = availableTools
    .map((tool) => {
      const toolId = tool.id || tool.name;
      return {
        ...tool,
        usageCount: toolUsageCounters.get(toolId) || 0,
      };
    })
    .filter((tool) => tool.usageCount > 0);
  toolsWithCounts.sort((a, b) => b.usageCount - a.usageCount);
  return toolsWithCounts.slice(0, limit);
}

// --- Revolution: Clear All Usage and Feedback History ---
export function clearUsageHistory() {
  recentlyUsedTools = [];
  toolUsageCounters.clear();
  toolFeedbackScores.clear();
}

// --- Revolution: Update Weight Factors Dynamically ---
export function updateWeightFactors(newWeights) {
  Object.assign(WEIGHT_FACTORS, newWeights);
}

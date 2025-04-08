# Context-Aware Tool Selector

The Context-Aware Tool Selector is a core component of the Smart MCP Server that intelligently selects and recommends the most relevant tools based on user context. It uses a sophisticated scoring system to determine which tools are most likely to be useful for a given user query or scenario.

## Key Features

- **Context-based scoring**: Analyzes user messages to identify relevant tools
- **Category-based organization**: Groups tools into functional categories
- **Recent usage tracking**: Considers previously used tools for better recommendations
- **Essential tools prioritization**: Ensures critical tools are always available
- **Usage frequency analysis**: Learns from patterns of tool usage over time

## Tool Categories

Tools are organized into the following categories:

- **FILESYSTEM**: File and directory operations, search, and content management
- **CODE_EDITING**: Code modification and editing operations
- **VERSION_CONTROL**: Git and GitHub operations
- **MEMORY**: Knowledge graph and persistent storage functionality
- **TERMINAL**: Command execution and remote operations
- **AI**: Thinking, research, and generative capabilities

## API Reference

### `selectToolsForContext(availableTools, userContext, limit = 5)`

Selects the most relevant tools based on user context.

- **Parameters**:
  - `availableTools` (Array): List of available tools with their properties
  - `userContext` (String): User query or message
  - `limit` (Number, optional): Maximum number of tools to return (default: 5)
- **Returns**: Array of tool objects with relevance scores

### `recordToolUsage(toolId)`

Records a tool as being used, for future recommendations.

- **Parameters**:
  - `toolId` (String): The ID of the tool that was used
- **Returns**: void

### `getToolsByCategory(availableTools, category)`

Retrieves tools belonging to a specific category.

- **Parameters**:
  - `availableTools` (Array): List of available tools
  - `category` (String): Category name (FILESYSTEM, CODE_EDITING, etc.)
- **Returns**: Array of tool objects in the specified category

### `getToolRecommendations(recentQueries, availableTools, limit = 3)`

Generates tool recommendations based on recent user queries.

- **Parameters**:
  - `recentQueries` (Array): List of recent user queries
  - `availableTools` (Array): List of available tools
  - `limit` (Number, optional): Maximum number of recommendations (default: 3)
- **Returns**: Array of recommended tool objects

### `getMostFrequentlyUsedTools(availableTools, limit = 5)`

Returns tools that have been used most frequently.

- **Parameters**:
  - `availableTools` (Array): List of available tools
  - `limit` (Number, optional): Maximum number of tools to return (default: 5)
- **Returns**: Array of most frequently used tool objects

### `clearUsageHistory()`

Clears all usage history and counters.

- **Returns**: void

### `updateWeightFactors(newWeights)`

Updates the weight factors used in the scoring algorithm.

- **Parameters**:
  - `newWeights` (Object): Object with weight factors to update
- **Returns**: void

## Scoring Algorithm

The scoring algorithm considers multiple factors:

1. **Explicit Mention** (weight: 10): Direct mention of a tool in the user query
2. **Category Match** (weight: 5): Presence of category keywords in the user query
3. **Recent Usage** (weight: 3): Whether the tool has been used recently
4. **Essential Tools** (weight: 2): Baseline boost for critical tools
5. **Usage Frequency** (weight: 1): How often the tool has been used overall

## Usage Examples

```javascript
// Import the selector
import { 
  selectToolsForContext, 
  recordToolUsage, 
  getToolsByCategory 
} from './context-aware-selector.js';

// Get tools relevant to a user query
const userQuery = "I need to edit the README.md file";
const relevantTools = selectToolsForContext(availableTools, userQuery, 5);

// Record tool usage after a tool is used
recordToolUsage('edit_file');

// Get tools by category
const filesystemTools = getToolsByCategory(availableTools, 'FILESYSTEM');
```

## Integration with the Server

The context-aware selector is integrated into the Smart MCP Server through middleware that processes incoming requests and enriches them with relevant tool suggestions. This ensures that tools presented to AI assistants are contextually appropriate for the current task.

## Testing

The selector can be tested using the `test-context-aware-selector.js` script, which evaluates its performance across different user contexts and scenarios.

## Customization

The behavior of the context-aware selector can be customized by:

1. Modifying the `WEIGHT_FACTORS` to adjust the importance of different scoring components
2. Adding or removing tools from the `TOOL_CATEGORIES` to change categorization
3. Updating `CONTEXT_KEYWORDS` to improve category matching
4. Modifying the `ESSENTIAL_TOOLS` list to prioritize different tools 
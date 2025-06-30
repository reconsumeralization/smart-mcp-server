/**
 * Tests for the Context-Aware Tool Selector
 */

import {
  selectToolsForContext,
  recordToolUsage,
  getToolsByCategory,
  getToolRecommendations,
  TOOL_CATEGORIES,
  clearUsageHistory,
} from '../context-aware-selector';

// Mock the dependencies if any (none in this case, but good practice)
jest.mock('../logger.js');

describe('Context-Aware Tool Selector', () => {
  // Sample tools for testing
  const mockTools = [
    { id: 'read_file', name: 'Read File', description: 'Read file content' },
    {
      id: 'write_file',
      name: 'Write File',
      description: 'Write content to file',
    },
    {
      id: 'list_dir',
      name: 'List Directory',
      description: 'List directory contents',
    },
    { id: 'edit_file', name: 'Edit File', description: 'Edit file content' },
    { id: 'github', name: 'GitHub', description: 'GitHub operations' },
    {
      id: 'memory_search',
      name: 'Memory Search',
      description: 'Search memory',
    },
    {
      id: 'sequential_thinking',
      name: 'Sequential Thinking',
      description: 'Think step by step',
    },
    { id: 'web_search', name: 'Web Search', description: 'Search the web' },
    {
      id: 'execute_command',
      name: 'Execute Command',
      description: 'Execute shell command',
    },
  ];

  beforeEach(() => {
    // Reset state before each test
    clearUsageHistory();
  });

  describe('selectToolsForContext', () => {
    it('should return empty array for empty inputs', () => {
      expect(selectToolsForContext([], 'test')).toEqual([]);
      expect(selectToolsForContext(mockTools, '')).toEqual([]);
      expect(selectToolsForContext(null, 'test')).toEqual([]);
    });

    it('should prioritize tools explicitly mentioned in the context', () => {
      const context = 'I need to read_file to check the content';
      const result = selectToolsForContext(mockTools, context);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].id).toBe('read_file');
      expect(result[0].relevanceScore).toBeGreaterThan(5);
    });

    it('should match tools based on category keywords', () => {
      const context = 'I need to modify some code in a file';
      const result = selectToolsForContext(mockTools, context);

      const editingTools = result.filter((t) => t.id === 'edit_file');
      expect(editingTools.length).toBe(1);
      expect(editingTools[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should limit results to specified count', () => {
      const context = 'I need to work with files and code';
      const result = selectToolsForContext(mockTools, context, 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('recordToolUsage and recency scoring', () => {
    it('should give higher scores to recently used tools', () => {
      recordToolUsage('web_search');

      const context = 'I need to find information';
      const result = selectToolsForContext(mockTools, context);

      const webSearchTool = result.find((t) => t.id === 'web_search');
      expect(webSearchTool).toBeDefined();
      expect(webSearchTool.relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('getToolsByCategory', () => {
    it('should return tools from a specific category', () => {
      const filesystemTools = getToolsByCategory(mockTools, 'FILESYSTEM');

      expect(filesystemTools.length).toBeGreaterThanOrEqual(3);
      expect(filesystemTools.some((t) => t.id === 'read_file')).toBe(true);
      expect(filesystemTools.some((t) => t.id === 'write_file')).toBe(true);
      expect(filesystemTools.some((t) => t.id === 'list_dir')).toBe(true);
    });

    it('should return empty array for invalid category', () => {
      expect(getToolsByCategory(mockTools, 'INVALID_CATEGORY')).toEqual([]);
      expect(getToolsByCategory(null, 'FILESYSTEM')).toEqual([]);
    });
  });

  describe('getToolRecommendations', () => {
    it('should return recommendations based on recent queries', () => {
      const recentQueries = [
        'How do I modify a file?',
        'I need to edit some code',
      ];

      const recommendations = getToolRecommendations(recentQueries, mockTools);

      expect(recommendations.length).toBeGreaterThanOrEqual(1);
      expect(recommendations.some((r) => r.id === 'edit_file')).toBe(true);
    });

    it('should return empty array for empty inputs', () => {
      expect(getToolRecommendations([], mockTools)).toEqual([]);
      expect(getToolRecommendations(null, mockTools)).toEqual([]);
      expect(getToolRecommendations(['query'], null)).toEqual([]);
    });
  });

  describe('Tool Categories Structure', () => {
    it('should have the expected tool categories', () => {
      expect(Object.keys(TOOL_CATEGORIES)).toEqual(
        expect.arrayContaining([
          'FILESYSTEM',
          'CODE_EDITING',
          'VERSION_CONTROL',
          'MEMORY',
          'TERMINAL',
          'AI',
        ])
      );
    });

    it('should have tools assigned to appropriate categories', () => {
      expect(TOOL_CATEGORIES.FILESYSTEM).toEqual(
        expect.arrayContaining(['read_file', 'write_file', 'list_dir'])
      );
      expect(TOOL_CATEGORIES.CODE_EDITING).toEqual(
        expect.arrayContaining(['edit_file', 'reapply'])
      );
      expect(TOOL_CATEGORIES.VERSION_CONTROL).toEqual(
        expect.arrayContaining(['github', 'git'])
      );
      expect(TOOL_CATEGORIES.AI).toEqual(
        expect.arrayContaining(['sequential_thinking', 'web_search'])
      );
    });
  });
});

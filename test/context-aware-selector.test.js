/**
 * Tests for the Context-Aware Tool Selector
 */

const { expect } = require('chai');
const { 
  selectToolsForContext, 
  recordToolUsage, 
  getToolsByCategory, 
  getToolRecommendations, 
  TOOL_CATEGORIES 
} = require('../context-aware-selector');

describe('Context-Aware Tool Selector', () => {
  // Sample tools for testing
  const mockTools = [
    { id: 'read_file', name: 'Read File', description: 'Read file content' },
    { id: 'write_file', name: 'Write File', description: 'Write content to file' },
    { id: 'list_dir', name: 'List Directory', description: 'List directory contents' },
    { id: 'edit_file', name: 'Edit File', description: 'Edit file content' },
    { id: 'github', name: 'GitHub', description: 'GitHub operations' },
    { id: 'memory_search', name: 'Memory Search', description: 'Search memory' },
    { id: 'sequential_thinking', name: 'Sequential Thinking', description: 'Think step by step' },
    { id: 'web_search', name: 'Web Search', description: 'Search the web' },
    { id: 'execute_command', name: 'Execute Command', description: 'Execute shell command' }
  ];

  describe('selectToolsForContext', () => {
    it('should return empty array for empty inputs', () => {
      expect(selectToolsForContext([], 'test')).to.deep.equal([]);
      expect(selectToolsForContext(mockTools, '')).to.deep.equal([]);
      expect(selectToolsForContext(null, 'test')).to.deep.equal([]);
    });

    it('should prioritize tools explicitly mentioned in the context', () => {
      const context = 'I need to read_file to check the content';
      const result = selectToolsForContext(mockTools, context);
      
      expect(result.length).to.be.at.least(1);
      expect(result[0].id).to.equal('read_file');
      expect(result[0].relevanceScore).to.be.greaterThan(5);
    });

    it('should match tools based on category keywords', () => {
      const context = 'I need to modify some code in a file';
      const result = selectToolsForContext(mockTools, context);
      
      // Should match CODE_EDITING category tools
      const editingTools = result.filter(t => t.id === 'edit_file');
      expect(editingTools.length).to.equal(1);
      expect(editingTools[0].relevanceScore).to.be.greaterThan(0);
    });

    it('should limit results to specified count', () => {
      const context = 'I need to work with files and code';
      const result = selectToolsForContext(mockTools, context, 3);
      
      expect(result.length).to.be.at.most(3);
    });
  });

  describe('recordToolUsage and recency scoring', () => {
    it('should give higher scores to recently used tools', () => {
      // Record usage
      recordToolUsage('web_search');
      
      // Test scoring with recency
      const context = 'I need to find information';
      const result = selectToolsForContext(mockTools, context);
      
      // Find web_search in results
      const webSearchTool = result.find(t => t.id === 'web_search');
      expect(webSearchTool).to.exist;
      
      // Score should reflect recency
      expect(webSearchTool.relevanceScore).to.be.greaterThan(0);
    });
  });

  describe('getToolsByCategory', () => {
    it('should return tools from a specific category', () => {
      const filesystemTools = getToolsByCategory(mockTools, 'FILESYSTEM');
      
      expect(filesystemTools.length).to.be.at.least(3);
      expect(filesystemTools.some(t => t.id === 'read_file')).to.be.true;
      expect(filesystemTools.some(t => t.id === 'write_file')).to.be.true;
      expect(filesystemTools.some(t => t.id === 'list_dir')).to.be.true;
    });

    it('should return empty array for invalid category', () => {
      expect(getToolsByCategory(mockTools, 'INVALID_CATEGORY')).to.deep.equal([]);
      expect(getToolsByCategory(null, 'FILESYSTEM')).to.deep.equal([]);
    });
  });

  describe('getToolRecommendations', () => {
    it('should return recommendations based on recent queries', () => {
      const recentQueries = [
        'How do I modify a file?', 
        'I need to edit some code'
      ];
      
      const recommendations = getToolRecommendations(recentQueries, mockTools);
      
      expect(recommendations.length).to.be.at.least(1);
      // Should include edit_file based on keywords in queries
      expect(recommendations.some(r => r.id === 'edit_file')).to.be.true;
    });

    it('should return empty array for empty inputs', () => {
      expect(getToolRecommendations([], mockTools)).to.deep.equal([]);
      expect(getToolRecommendations(null, mockTools)).to.deep.equal([]);
      expect(getToolRecommendations(['query'], null)).to.deep.equal([]);
    });
  });

  describe('Tool Categories Structure', () => {
    it('should have the expected tool categories', () => {
      expect(Object.keys(TOOL_CATEGORIES)).to.include.members([
        'FILESYSTEM', 
        'CODE_EDITING', 
        'VERSION_CONTROL', 
        'MEMORY', 
        'TERMINAL', 
        'AI'
      ]);
    });

    it('should have tools assigned to appropriate categories', () => {
      expect(TOOL_CATEGORIES.FILESYSTEM).to.include.members(['read_file', 'write_file', 'list_dir']);
      expect(TOOL_CATEGORIES.CODE_EDITING).to.include.members(['edit_file', 'reapply']);
      expect(TOOL_CATEGORIES.VERSION_CONTROL).to.include.members(['github', 'git']);
      expect(TOOL_CATEGORIES.AI).to.include.members(['sequential_thinking', 'web_search']);
    });
  });
}); 
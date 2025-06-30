import databaseTool from '../tools/database-tool.js';
import { query } from '../lib/db-client.js';
import logger from '../logger.js';

// Mock the dependencies
jest.mock('../lib/db-client.js', () => ({
  query: jest.fn(),
}));
jest.mock('../logger.js');

describe('DatabaseTool', () => {
  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  describe('execute_query', () => {
    it('should execute a query successfully and return rows', async () => {
      // Arrange
      const mockQuery = 'SELECT * FROM users;';
      const mockParams = [];
      const mockRows = [{ id: 1, name: 'John Doe' }];
      query.mockResolvedValue({ rows: mockRows });

      // Act
      const result = await databaseTool.execute_query({
        query: mockQuery,
        params: mockParams,
      });

      // Assert
      expect(query).toHaveBeenCalledWith(mockQuery, mockParams);
      expect(result).toEqual({ success: true, rows: mockRows });
      expect(logger.info).toHaveBeenCalledWith('Executing database query', {
        query: mockQuery,
        params: mockParams,
      });
    });

    it('should handle query execution errors gracefully', async () => {
      // Arrange
      const mockQuery = 'SELECT * FROM users;';
      const mockParams = [];
      const mockError = new Error('Connection refused');
      query.mockRejectedValue(mockError);

      // Act
      const result = await databaseTool.execute_query({
        query: mockQuery,
        params: mockParams,
      });

      // Assert
      expect(query).toHaveBeenCalledWith(mockQuery, mockParams);
      expect(result).toEqual({ success: false, error: 'Connection refused' });
      expect(logger.error).toHaveBeenCalledWith('Database query failed', {
        error: mockError.message,
        query: mockQuery,
      });
    });
  });
});

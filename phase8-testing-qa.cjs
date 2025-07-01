const fs = require('fs').promises;
const logger = require('./src/logger');

async function runPhase8() {
  logger.info('🚀 Phase 8: Advanced Testing & Quality Assurance\n');
  
  // Task 8.1: Comprehensive Test Suite Development
  logger.info('🧪 Task 8.1: Comprehensive Test Suite Development');
  
  // Create Jest configuration
  const jestConfig = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
      global: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85
      }
    },
    testMatch: [
      '**/__tests__/**/*.js',
      '**/?(*.)+(spec|test).js'
    ],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
    collectCoverageFrom: [
      'src/lib/**/*.js',
      'src/services/**/*.js',
      'src/models/**/*.js',
      'src/middleware/**/*.js',
      'src/routes/**/*.js',
      '!**/__tests__/**',
      '!**/node_modules/**'
    ]
  };
  
  await fs.writeFile('jest.config.js', `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);
  logger.info('   ✅ Jest configuration created');
  
  // Create test setup file
  const testSetup = `// Test setup file
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'user'
  }),
  
  createMockWorkflow: () => ({
    name: 'Test Workflow',
    description: 'Test workflow description',
    steps: [
      {
        id: 'step1',
        toolId: 'test-tool',
        params: { test: 'value' }
      }
    ]
  }),
  
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};`;
  
  await fs.mkdir('src/test', { recursive: true });
  await fs.writeFile('src/test/setup.js', testSetup);
  logger.info('   ✅ Test setup file created');
  
  // Create sample unit tests
  const userModelTest = `const User = require('../../models/User');
const bcrypt = require('bcrypt');

describe('User Model', () => {
  describe('User Creation', () => {
    test('should create a user with valid data', async () => {
      const userData = global.testUtils.createMockUser();
      const user = new User(userData);
      
      await user.save();
      
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
    });
    
    test('should hash password before saving', async () => {
      const userData = global.testUtils.createMockUser();
      const user = new User(userData);
      
      await user.save();
      
      expect(user.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });
    
    test('should require email field', async () => {
      const userData = global.testUtils.createMockUser();
      delete userData.email;
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });
    
    test('should enforce unique email', async () => {
      const userData = global.testUtils.createMockUser();
      
      const user1 = new User(userData);
      await user1.save();
      
      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });
  });
  
  describe('User Methods', () => {
    test('should compare password correctly', async () => {
      const userData = global.testUtils.createMockUser();
      const user = new User(userData);
      await user.save();
      
      expect(await user.comparePassword(userData.password)).toBe(true);
      expect(await user.comparePassword('wrongpassword')).toBe(false);
    });
    
    test('should generate API key', () => {
      const user = new User(global.testUtils.createMockUser());
      const apiKey = user.generateApiKey();
      
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBe(64);
      expect(user.apiKey).toBe(apiKey);
    });
  });
});`;
  
  await fs.mkdir('src/test/models', { recursive: true });
  await fs.writeFile('src/test/models/User.test.js', userModelTest);
  logger.info('   ✅ User model tests created');
  
  // Task 8.2: End-to-End Testing Framework
  logger.info('\n🎭 Task 8.2: End-to-End Testing Framework');
  
  const playwrightConfig = {
    testDir: './src/test/e2e',
    timeout: 30000,
    expect: {
      timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
      baseURL: 'http://localhost:3000',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure'
    },
    projects: [
      {
        name: 'chromium',
        use: { ...require('@playwright/test').devices['Desktop Chrome'] }
      },
      {
        name: 'firefox',
        use: { ...require('@playwright/test').devices['Desktop Firefox'] }
      }
    ],
    webServer: {
      command: 'npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI
    }
  };
  
  await fs.writeFile('playwright.config.js', `module.exports = ${JSON.stringify(playwrightConfig, null, 2)};`);
  logger.info('   ✅ Playwright configuration created');
  
  // Update package.json with testing scripts
  const packageJsonPath = 'package.json';
  let packageJson;
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(packageContent);
  } catch (error) {
    packageJson = { name: 'smart-mcp-server', version: '2.0.0' };
  }
  
  // Add testing scripts and dependencies
  packageJson.scripts = {
    ...packageJson.scripts,
    'test': 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage',
    'test:e2e': 'playwright test',
    'test:load': 'artillery run src/test/load/artillery.yml',
    'test:security': 'jest src/test/security',
    'test:chaos': 'jest src/test/chaos',
    'test:all': 'npm run test && npm run test:e2e && npm run test:security',
    'lint': 'eslint . --ext .js',
    'lint:fix': 'eslint . --ext .js --fix',
    'quality:check': 'npm run lint && npm run test:coverage && npm run test:security'
  };
  
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    'jest': '^29.5.0',
    'supertest': '^6.3.0',
    'mongodb-memory-server': '^8.12.0',
    '@playwright/test': '^1.35.0',
    'artillery': '^2.0.0',
    'eslint': '^8.42.0',
    'prettier': '^2.8.0',
    'husky': '^8.0.0',
    'lint-staged': '^13.2.0',
    'faker': '^5.5.3'
  };
  
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  logger.info('   ✅ package.json updated with testing scripts and dependencies');
  
  logger.info('\n🎉 Phase 8 Complete! Advanced Testing & QA framework established.');
}

runPhase8().catch(logger.error); 
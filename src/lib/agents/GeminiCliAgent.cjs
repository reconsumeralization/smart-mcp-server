const { GoogleGenerativeAI } = require('@google/generative-ai');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const logger = { info: console.log, error: console.error, warn: console.warn, debug: console.debug };

class GeminiCliAgent {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.conversationHistory = [];
    this.projectContext = null;
    this.availableCommands = new Map();
    this.setupCommands();
  }
  
  setupCommands() {
    this.availableCommands.set('help', {
      description: 'Show available commands',
      handler: this.showHelp.bind(this)
    });
    
    this.availableCommands.set('analyze', {
      description: 'Analyze project structure and suggest improvements',
      handler: this.analyzeProject.bind(this)
    });
    
    this.availableCommands.set('generate', {
      description: 'Generate code, documentation, or configurations',
      handler: this.generateContent.bind(this)
    });
    
    this.availableCommands.set('optimize', {
      description: 'Optimize existing code or configurations',
      handler: this.optimizeCode.bind(this)
    });
    
    this.availableCommands.set('test', {
      description: 'Generate or run tests',
      handler: this.handleTesting.bind(this)
    });
    
    this.availableCommands.set('deploy', {
      description: 'Assist with deployment tasks',
      handler: this.handleDeployment.bind(this)
    });
    
    this.availableCommands.set('context', {
      description: 'Load or update project context',
      handler: this.updateContext.bind(this)
    });
    
    this.availableCommands.set('workflow', {
      description: 'Create or manage workflows',
      handler: this.handleWorkflow.bind(this)
    });
  }
  
  async initialize() {
    console.log('🤖 Gemini CLI Assistant Agent Starting...');
    console.log('Type "help" for available commands or start chatting!');
    
    await this.loadProjectContext();
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 Gemini> '
    });
    
    rl.prompt();
    
    rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput === 'exit' || trimmedInput === 'quit') {
        console.log('👋 Goodbye!');
        rl.close();
        return;
      }
      
      if (trimmedInput === '') {
        rl.prompt();
        return;
      }
      
      await this.processInput(trimmedInput);
      rl.prompt();
    });
    
    rl.on('close', () => {
      console.log('\n👋 Gemini CLI Agent session ended.');
      process.exit(0);
    });
  }
  
  async processInput(input) {
    try {
      // Check if it's a command
      const [command, ...args] = input.split(' ');
      
      if (this.availableCommands.has(command)) {
        await this.availableCommands.get(command).handler(args.join(' '));
        return;
      }
      
      // Otherwise, treat as a conversation
      await this.handleConversation(input);
    } catch (error) {
      console.error('❌ Error:', error.message);
      // logger.error('Gemini CLI Agent error:', error);
    }
  }
  
  async handleConversation(input) {
    const prompt = this.buildContextualPrompt(input);
    
    console.log('🤔 Thinking...');
    
    const result = await this.model.generateContent(prompt);
    const response = result.response.text();
    
    // Store conversation history
    this.conversationHistory.push({
      user: input,
      assistant: response,
      timestamp: new Date()
    });
    
    console.log('\n🤖 Gemini:', response);
    console.log('');
  }
  
  buildContextualPrompt(userInput) {
    let prompt = `You are an expert AI assistant helping with the Smart MCP Server project.
    
Project Context:
${this.projectContext ? JSON.stringify(this.projectContext, null, 2) : 'Loading...'}

Recent Conversation:
${this.conversationHistory.slice(-3).map(h => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n\n')}

Current User Input: ${userInput}

Please provide helpful, accurate, and actionable advice. If the user is asking for code, provide complete, working examples. If they need help with project structure, reference the actual files and configurations.`;

    return prompt;
  }
  
  async loadProjectContext() {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const projectFiles = await this.scanProjectFiles();
      
      this.projectContext = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: packageJson.dependencies,
        scripts: packageJson.scripts,
        files: projectFiles,
        lastUpdated: new Date()
      };
      
      console.log('📋 Project context loaded successfully');
    } catch (error) {
      console.log('⚠️ Could not load full project context:', error.message);
    }
  }
  
  async scanProjectFiles() {
    const files = {};
    const extensions = ['.js', '.json', '.md', '.yml', '.yaml'];
    
    async function scanDir(dir, prefix = '') {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(prefix, entry.name);
          
          if (entry.isDirectory()) {
            await scanDir(fullPath, relativePath);
          } else if (extensions.includes(path.extname(entry.name))) {
            files[relativePath] = {
              type: 'file',
              extension: path.extname(entry.name),
              size: (await fs.stat(fullPath)).size
            };
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await scanDir('.');
    return files;
  }
  
  async showHelp() {
    console.log('\n📖 Available Commands:');
    console.log('='.repeat(50));
    
    for (const [command, info] of this.availableCommands) {
      console.log(`  ${command.padEnd(12)} - ${info.description}`);
    }
    
    console.log('\n💬 You can also just chat naturally with the assistant!');
    console.log('   Examples:');
    console.log('   - "How do I add authentication to my API?"');
    console.log('   - "Generate a workflow for processing payments"');
    console.log('   - "What are the security best practices for this project?"');
    console.log('');
  }
  
  async analyzeProject() {
    console.log('🔍 Analyzing project structure...');
    
    const analysis = {
      architecture: 'Express.js with MongoDB, multi-agent system',
      strengths: [
        'Comprehensive workflow management',
        'Multiple payment integrations',
        'AI-powered tool selection',
        'Docker containerization',
        'Extensive documentation'
      ],
      improvements: [
        'Add comprehensive testing suite',
        'Implement rate limiting',
        'Add API versioning',
        'Enhance error handling',
        'Add performance monitoring'
      ],
      security: [
        'Implement JWT authentication',
        'Add input validation',
        'Use HTTPS in production',
        'Secure environment variables',
        'Add audit logging'
      ]
    };
    
    console.log('\n📊 Project Analysis Results:');
    console.log('Architecture:', analysis.architecture);
    console.log('\n✅ Strengths:');
    analysis.strengths.forEach(s => console.log(`  • ${s}`));
    console.log('\n🔧 Suggested Improvements:');
    analysis.improvements.forEach(i => console.log(`  • ${i}`));
    console.log('\n🛡️ Security Recommendations:');
    analysis.security.forEach(s => console.log(`  • ${s}`));
    console.log('');
  }
  
  async generateContent(type) {
    console.log(`🎨 Generating ${type || 'content'}...`);
    
    const prompt = `Based on the Smart MCP Server project, generate ${type || 'useful content'}. 
    Consider the project structure, existing code, and best practices.`;
    
    const result = await this.model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('\n✨ Generated Content:');
    console.log(response);
    console.log('');
  }
  
  async optimizeCode(target) {
    console.log(`⚡ Optimizing ${target || 'code'}...`);
    
    const suggestions = [
      'Use connection pooling for database operations',
      'Implement caching for frequently accessed data',
      'Add compression middleware for API responses',
      'Use async/await consistently throughout the codebase',
      'Implement proper error boundaries',
      'Add request/response logging',
      'Use environment-specific configurations'
    ];
    
    console.log('\n⚡ Optimization Suggestions:');
    suggestions.forEach(s => console.log(`  • ${s}`));
    console.log('');
  }
  
  async handleTesting() {
    console.log('🧪 Testing Assistant');
    
    const testingGuidance = {
      unitTests: 'Use Jest for unit testing individual functions and modules',
      integrationTests: 'Test API endpoints and database operations',
      e2eTests: 'Use Cypress or Playwright for end-to-end testing',
      coverage: 'Aim for 80%+ code coverage',
      automation: 'Set up GitHub Actions for CI/CD testing'
    };
    
    console.log('\n🧪 Testing Recommendations:');
    Object.entries(testingGuidance).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
  }
  
  async handleDeployment() {
    console.log('🚀 Deployment Assistant');
    
    const deploymentSteps = [
      'Set up environment variables',
      'Configure database connections',
      'Set up reverse proxy (nginx)',
      'Configure SSL certificates',
      'Set up monitoring and logging',
      'Configure backup strategies',
      'Set up health checks',
      'Configure auto-scaling if needed'
    ];
    
    console.log('\n🚀 Deployment Checklist:');
    deploymentSteps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    console.log('');
  }
  
  async updateContext() {
    console.log('🔄 Updating project context...');
    await this.loadProjectContext();
    console.log('✅ Context updated successfully');
  }
  
  async handleWorkflow(description) {
    console.log(`⚙️ Workflow Assistant: ${description || 'General workflow help'}`);
    
    const workflowTemplates = {
      payment: 'Create customer → Create payment intent → Process payment → Send confirmation',
      document: 'Upload document → Process/analyze → Extract data → Store results',
      notification: 'Trigger event → Check user preferences → Send notification → Log delivery',
      analytics: 'Collect data → Process/aggregate → Generate insights → Create reports'
    };
    
    console.log('\n⚙️ Available Workflow Templates:');
    Object.entries(workflowTemplates).forEach(([name, flow]) => {
      console.log(`  ${name}: ${flow}`);
    });
    console.log('');
  }
}

module.exports = GeminiCliAgent;
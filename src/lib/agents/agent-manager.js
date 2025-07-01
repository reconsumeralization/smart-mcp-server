/**
 * Agent Management System
 * 
 * Handles:
 * - Agent registration and discovery
 * - A2A protocol communication
 * - Task delegation between agents
 * - Agent capability matching
 * - Inter-agent workflow coordination
 */

import logger from '../../logger.js';
import config from '../../config.js';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

class AgentManager {
  constructor() {
    this.agents = new Map();
    this.taskQueue = new Map();
    this.activeConversations = new Map();
    this.capabilityIndex = new Map();
    this.initializeBuiltInAgents();
  }

  /**
   * Initialize built-in financial agents from config
   */
  initializeBuiltInAgents() {
    const { agents } = config.financialServices;
    
    Object.entries(agents).forEach(([key, agentConfig]) => {
      this.registerAgent({
        ...agentConfig,
        status: 'active',
        endpoint: `http://localhost:${config.server.port}/agents/${key}`,
        isBuiltIn: true,
        lastSeen: new Date().toISOString()
      });
    });

    logger.info(`Initialized ${Object.keys(agents).length} built-in financial agents`);
  }

  /**
   * Register a new agent in the system
   * @param {object} agentInfo - Agent information
   * @returns {string} Agent registration ID
   */
  registerAgent(agentInfo) {
    const agentId = agentInfo.id || uuidv4();
    
    const agent = {
      id: agentId,
      name: agentInfo.name,
      specialization: agentInfo.specialization,
      capabilities: agentInfo.capabilities || [],
      mcpServers: agentInfo.mcpServers || [],
      endpoint: agentInfo.endpoint,
      status: agentInfo.status || 'active',
      isBuiltIn: agentInfo.isBuiltIn || false,
      metadata: agentInfo.metadata || {},
      registeredAt: new Date().toISOString(),
      lastSeen: agentInfo.lastSeen || new Date().toISOString(),
      taskHistory: [],
      performanceMetrics: {
        tasksCompleted: 0,
        averageResponseTime: 0,
        successRate: 100,
        lastTaskTime: null
      }
    };

    this.agents.set(agentId, agent);
    
    // Index capabilities for fast lookup
    agent.capabilities.forEach(capability => {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability).add(agentId);
    });

    logger.info(`Agent registered: ${agent.name} (${agentId})`);
    return agentId;
  }

  /**
   * Discover agents by capability
   * @param {string|string[]} capabilities - Required capabilities
   * @param {object} options - Search options
   * @returns {object[]} Matching agents
   */
  discoverAgents(capabilities, options = {}) {
    const requiredCapabilities = Array.isArray(capabilities) ? capabilities : [capabilities];
    const matchingAgents = new Set();

    // Find agents with all required capabilities
    requiredCapabilities.forEach((capability, index) => {
      const agentsWithCapability = this.capabilityIndex.get(capability) || new Set();
      
      if (index === 0) {
        agentsWithCapability.forEach(agentId => matchingAgents.add(agentId));
      } else {
        // Keep only agents that have all previous capabilities
        const intersection = new Set();
        matchingAgents.forEach(agentId => {
          if (agentsWithCapability.has(agentId)) {
            intersection.add(agentId);
          }
        });
        matchingAgents.clear();
        intersection.forEach(agentId => matchingAgents.add(agentId));
      }
    });

    // Convert to agent objects and apply filters
    let agents = Array.from(matchingAgents).map(agentId => this.agents.get(agentId));
    
    // Filter by status
    if (options.status) {
      agents = agents.filter(agent => agent.status === options.status);
    }

    // Filter by specialization
    if (options.specialization) {
      agents = agents.filter(agent => agent.specialization === options.specialization);
    }

    // Sort by performance metrics
    agents.sort((a, b) => {
      const scoreA = a.performanceMetrics.successRate * 0.7 + 
                    (100 - a.performanceMetrics.averageResponseTime / 1000) * 0.3;
      const scoreB = b.performanceMetrics.successRate * 0.7 + 
                    (100 - b.performanceMetrics.averageResponseTime / 1000) * 0.3;
      return scoreB - scoreA;
    });

    return agents.slice(0, options.limit || 10);
  }

  /**
   * Delegate a task to the most suitable agent
   * @param {object} task - Task to delegate
   * @returns {Promise<object>} Task delegation result
   */
  async delegateTask(task) {
    const { description, requiredCapabilities, priority = 'normal', context = {} } = task;
    const taskId = uuidv4();

    logger.info(`Delegating task ${taskId}: ${description}`);

    try {
      // Find suitable agents
      const candidates = this.discoverAgents(requiredCapabilities, { status: 'active' });
      
      if (candidates.length === 0) {
        throw new Error(`No agents found with required capabilities: ${requiredCapabilities.join(', ')}`);
      }

      // Select the best agent (first in sorted list)
      const selectedAgent = candidates[0];
      
      // Create task record
      const taskRecord = {
        id: taskId,
        description: description,
        requiredCapabilities: requiredCapabilities,
        assignedAgent: selectedAgent.id,
        status: 'assigned',
        priority: priority,
        context: context,
        createdAt: new Date().toISOString(),
        assignedAt: new Date().toISOString(),
        completedAt: null,
        result: null,
        error: null
      };

      this.taskQueue.set(taskId, taskRecord);

      // Execute task
      const result = await this.executeAgentTask(selectedAgent, taskRecord);
      
      // Update task record
      taskRecord.status = result.success ? 'completed' : 'failed';
      taskRecord.completedAt = new Date().toISOString();
      taskRecord.result = result.data;
      taskRecord.error = result.error;

      // Update agent metrics
      this.updateAgentMetrics(selectedAgent.id, taskRecord);

      return {
        success: result.success,
        taskId: taskId,
        assignedAgent: selectedAgent.name,
        result: result.data,
        error: result.error
      };

    } catch (error) {
      logger.error(`Task delegation failed for ${taskId}:`, error);
      return {
        success: false,
        taskId: taskId,
        error: error.message
      };
    }
  }

  /**
   * Execute a task on a specific agent
   * @param {object} agent - Target agent
   * @param {object} task - Task to execute
   * @returns {Promise<object>} Execution result
   */
  async executeAgentTask(agent, task) {
    const startTime = Date.now();

    try {
      if (agent.isBuiltIn) {
        // Execute built-in agent task
        return await this.executeBuiltInAgentTask(agent, task);
      } else {
        // Execute external agent task via A2A protocol
        return await this.executeExternalAgentTask(agent, task);
      }
    } catch (error) {
      logger.error(`Task execution failed for agent ${agent.id}:`, error);
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute task on built-in agent
   * @param {object} agent - Built-in agent
   * @param {object} task - Task to execute
   * @returns {Promise<object>} Execution result
   */
  async executeBuiltInAgentTask(agent, task) {
    const startTime = Date.now();

    try {
      // Route to appropriate built-in agent handler
      let result;
      
      switch (agent.specialization) {
        case 'portfolio_management':
          result = await this.executePortfolioManagementTask(task);
          break;
        case 'risk_management':
          result = await this.executeRiskManagementTask(task);
          break;
        case 'trade_execution':
          result = await this.executeTradeExecutionTask(task);
          break;
        case 'regulatory_compliance':
          result = await this.executeComplianceTask(task);
          break;
        case 'client_services':
          result = await this.executeClientServicesTask(task);
          break;
        default:
          throw new Error(`Unknown agent specialization: ${agent.specialization}`);
      }

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute task on external agent via A2A protocol
   * @param {object} agent - External agent
   * @param {object} task - Task to execute
   * @returns {Promise<object>} Execution result
   */
  async executeExternalAgentTask(agent, task) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${agent.endpoint}/a2a/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Smart-MCP-Server/1.0'
        },
        body: JSON.stringify({
          task_description: task.description,
          context: task.context,
          priority: task.priority,
          requester: {
            agent_id: 'smart-mcp-server',
            name: 'Smart MCP Server'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Agent responded with status ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute portfolio management task
   */
  async executePortfolioManagementTask(task) {
    const { executeToolProxy } = await import('../../tool-proxy.js');
    
    // Analyze task description to determine appropriate action
    const description = task.description.toLowerCase();
    
    if (description.includes('portfolio') && description.includes('performance')) {
      return await executeToolProxy('mcp_financial_calculate_performance', {
        account_id: task.context.accountId || 'ACC001'
      });
    } else if (description.includes('portfolio') && description.includes('balance')) {
      return await executeToolProxy('mcp_financial_get_portfolio', {
        account_id: task.context.accountId || 'ACC001'
      });
    } else if (description.includes('rebalance')) {
      // Simulate portfolio rebalancing
      return {
        action: 'portfolio_rebalancing',
        recommendations: [
          { symbol: 'AAPL', action: 'REDUCE', percentage: -5 },
          { symbol: 'GOOGL', action: 'INCREASE', percentage: 3 },
          { symbol: 'BONDS', action: 'INCREASE', percentage: 2 }
        ],
        rationale: 'Reducing tech overweight, increasing diversification'
      };
    }
    
    return { message: 'Portfolio management task completed', task: task.description };
  }

  /**
   * Execute risk management task
   */
  async executeRiskManagementTask(task) {
    const { executeToolProxy } = await import('../../tool-proxy.js');
    
    const description = task.description.toLowerCase();
    
    if (description.includes('risk') && description.includes('calculate')) {
      return await executeToolProxy('mcp_financial_calculate_risk', {
        account_id: task.context.accountId || 'ACC001'
      });
    } else if (description.includes('var') || description.includes('value at risk')) {
      return await executeToolProxy('mcp_financial_calculate_risk', {
        account_id: task.context.accountId || 'ACC001',
        confidence_level: 0.95
      });
    }
    
    return { message: 'Risk management task completed', task: task.description };
  }

  /**
   * Execute trade execution task
   */
  async executeTradeExecutionTask(task) {
    const { executeToolProxy } = await import('../../tool-proxy.js');
    
    const description = task.description.toLowerCase();
    
    if (description.includes('place') && description.includes('order')) {
      // Extract order details from context
      const orderParams = {
        symbol: task.context.symbol || 'AAPL',
        side: task.context.side || 'BUY',
        quantity: task.context.quantity || 100,
        orderType: task.context.orderType || 'MARKET',
        accountId: task.context.accountId || 'ACC001'
      };
      
      return await executeToolProxy('mcp_trading_place_order', orderParams);
    } else if (description.includes('cancel') && description.includes('order')) {
      return await executeToolProxy('mcp_trading_cancel_order', {
        orderId: task.context.orderId
      });
    } else if (description.includes('order') && description.includes('status')) {
      return await executeToolProxy('mcp_trading_get_orders', {
        accountId: task.context.accountId || 'ACC001'
      });
    }
    
    return { message: 'Trade execution task completed', task: task.description };
  }

  /**
   * Execute compliance task
   */
  async executeComplianceTask(task) {
    const description = task.description.toLowerCase();
    
    if (description.includes('audit') || description.includes('report')) {
      return {
        reportType: 'compliance_audit',
        findings: [
          { type: 'INFO', message: 'All trades within position limits' },
          { type: 'WARNING', message: 'Concentration risk in tech sector above 30%' },
          { type: 'INFO', message: 'Regulatory reporting up to date' }
        ],
        status: 'COMPLIANT',
        generatedAt: new Date().toISOString()
      };
    }
    
    return { message: 'Compliance task completed', task: task.description };
  }

  /**
   * Execute client services task
   */
  async executeClientServicesTask(task) {
    const description = task.description.toLowerCase();
    
    if (description.includes('client') && description.includes('report')) {
      return {
        reportType: 'client_summary',
        clientId: task.context.clientId || 'CLIENT001',
        portfolioValue: 500000,
        monthlyReturn: 2.3,
        riskLevel: 'MODERATE',
        recommendations: [
          'Consider increasing bond allocation for better diversification',
          'Review tax-loss harvesting opportunities'
        ],
        generatedAt: new Date().toISOString()
      };
    }
    
    return { message: 'Client services task completed', task: task.description };
  }

  /**
   * Update agent performance metrics
   * @param {string} agentId - Agent ID
   * @param {object} taskRecord - Completed task record
   */
  updateAgentMetrics(agentId, taskRecord) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const executionTime = new Date(taskRecord.completedAt) - new Date(taskRecord.assignedAt);
    const wasSuccessful = taskRecord.status === 'completed';

    // Update metrics
    agent.performanceMetrics.tasksCompleted++;
    agent.performanceMetrics.lastTaskTime = taskRecord.completedAt;
    
    // Update average response time
    const currentAvg = agent.performanceMetrics.averageResponseTime;
    const taskCount = agent.performanceMetrics.tasksCompleted;
    agent.performanceMetrics.averageResponseTime = 
      ((currentAvg * (taskCount - 1)) + executionTime) / taskCount;

    // Update success rate
    const currentSuccessRate = agent.performanceMetrics.successRate;
    agent.performanceMetrics.successRate = 
      ((currentSuccessRate * (taskCount - 1)) + (wasSuccessful ? 100 : 0)) / taskCount;

    // Add to task history
    agent.taskHistory.push({
      taskId: taskRecord.id,
      description: taskRecord.description,
      status: taskRecord.status,
      executionTime: executionTime,
      completedAt: taskRecord.completedAt
    });

    // Keep only last 100 tasks in history
    if (agent.taskHistory.length > 100) {
      agent.taskHistory = agent.taskHistory.slice(-100);
    }

    agent.lastSeen = new Date().toISOString();
  }

  /**
   * Get agent by ID
   * @param {string} agentId - Agent ID
   * @returns {object|null} Agent information
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all agents
   * @param {object} filters - Optional filters
   * @returns {object[]} List of agents
   */
  listAgents(filters = {}) {
    let agents = Array.from(this.agents.values());

    if (filters.status) {
      agents = agents.filter(agent => agent.status === filters.status);
    }

    if (filters.specialization) {
      agents = agents.filter(agent => agent.specialization === filters.specialization);
    }

    if (filters.capability) {
      agents = agents.filter(agent => agent.capabilities.includes(filters.capability));
    }

    return agents;
  }

  /**
   * Get task status
   * @param {string} taskId - Task ID
   * @returns {object|null} Task information
   */
  getTask(taskId) {
    return this.taskQueue.get(taskId) || null;
  }

  /**
   * List tasks
   * @param {object} filters - Optional filters
   * @returns {object[]} List of tasks
   */
  listTasks(filters = {}) {
    let tasks = Array.from(this.taskQueue.values());

    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }

    if (filters.agentId) {
      tasks = tasks.filter(task => task.assignedAgent === filters.agentId);
    }

    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Generate agent network status report
   * @returns {object} Network status report
   */
  getNetworkStatus() {
    const agents = Array.from(this.agents.values());
    const tasks = Array.from(this.taskQueue.values());

    const statusReport = {
      agents: {
        total: agents.length,
        active: agents.filter(a => a.status === 'active').length,
        inactive: agents.filter(a => a.status === 'inactive').length,
        builtin: agents.filter(a => a.isBuiltIn).length,
        external: agents.filter(a => !a.isBuiltIn).length
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        pending: tasks.filter(t => t.status === 'assigned').length
      },
      capabilities: Object.fromEntries(this.capabilityIndex),
      performance: {
        averageTaskTime: this.calculateAverageTaskTime(),
        overallSuccessRate: this.calculateOverallSuccessRate(),
        topPerformingAgent: this.getTopPerformingAgent()
      },
      generatedAt: new Date().toISOString()
    };

    return statusReport;
  }

  calculateAverageTaskTime() {
    const completedTasks = Array.from(this.taskQueue.values())
      .filter(task => task.status === 'completed' && task.completedAt && task.assignedAt);
    
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      return sum + (new Date(task.completedAt) - new Date(task.assignedAt));
    }, 0);

    return Math.round(totalTime / completedTasks.length);
  }

  calculateOverallSuccessRate() {
    const completedTasks = Array.from(this.taskQueue.values())
      .filter(task => task.status === 'completed' || task.status === 'failed');
    
    if (completedTasks.length === 0) return 100;

    const successfulTasks = completedTasks.filter(task => task.status === 'completed').length;
    return Math.round((successfulTasks / completedTasks.length) * 100);
  }

  getTopPerformingAgent() {
    const agents = Array.from(this.agents.values())
      .filter(agent => agent.performanceMetrics.tasksCompleted > 0);
    
    if (agents.length === 0) return null;

    return agents.reduce((best, current) => {
      const bestScore = best.performanceMetrics.successRate * 0.7 + 
                       (100 - best.performanceMetrics.averageResponseTime / 1000) * 0.3;
      const currentScore = current.performanceMetrics.successRate * 0.7 + 
                          (100 - current.performanceMetrics.averageResponseTime / 1000) * 0.3;
      
      return currentScore > bestScore ? current : best;
    });
  }
}

// Export singleton instance
export default new AgentManager(); 
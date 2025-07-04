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
   * Register a new agent in the system or update an existing one.
   * @param {object} agentInfo - Agent information, including an optional idempotencyKey.
   * @returns {string} Agent registration ID.
   */
  registerAgent(agentInfo) {
    const { idempotencyKey, ...restOfAgentInfo } = agentInfo;

    if (idempotencyKey) {
      const existingAgentId = this.findAgentByIdempotencyKey(idempotencyKey);
      if (existingAgentId) {
        logger.info(`Agent with idempotency key '${idempotencyKey}' already exists. Updating agent ${existingAgentId}.`);
        this.updateAgent(existingAgentId, restOfAgentInfo);
        return existingAgentId;
      }
    }
    
    const existingAgent = this.findAgentByNameOrEndpoint(agentInfo.name, agentInfo.endpoint);
    if (existingAgent) {
      logger.info(`Agent '${agentInfo.name}' already exists. Updating agent ${existingAgent.id}.`);
      this.updateAgent(existingAgent.id, agentInfo);
      return existingAgent.id;
    }

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
      metadata: { ...agentInfo.metadata, idempotencyKey },
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
    this.indexCapabilities(agentId, agent.capabilities);

    logger.info(`Agent registered: ${agent.name} (${agentId})`);
    return agentId;
  }

  updateAgent(agentId, agentInfo) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found.`);
    }

    const updatedAgent = { ...agent, ...agentInfo, lastSeen: new Date().toISOString() };
    this.agents.set(agentId, updatedAgent);

    this.deindexCapabilities(agentId, agent.capabilities);
    this.indexCapabilities(agentId, updatedAgent.capabilities);

    logger.info(`Agent updated: ${updatedAgent.name} (${agentId})`);
  }

  findAgentByIdempotencyKey(key) {
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.metadata?.idempotencyKey === key) {
        return agentId;
      }
    }
    return null;
  }
  
  findAgentByNameOrEndpoint(name, endpoint) {
    for (const agent of this.agents.values()) {
      if (agent.name === name || agent.endpoint === endpoint) {
        return agent;
      }
    }
    return null;
  }

  indexCapabilities(agentId, capabilities) {
    capabilities.forEach(capability => {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability).add(agentId);
    });
  }

  deindexCapabilities(agentId, capabilities) {
    capabilities.forEach(capability => {
      if (this.capabilityIndex.has(capability)) {
        this.capabilityIndex.get(capability).delete(agentId);
      }
    });
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
    const { id, initiator_agent_uuid, description, requiredCapabilities, priority = 'normal', context = {} } = task;
    const taskId = id; // Use the provided task ID

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
        initiator_agent_uuid: initiator_agent_uuid,
        description: description,
        requiredCapabilities: requiredCapabilities,
        assignedAgent: selectedAgent.id,
        status: 'submitted', // Initial status should be submitted or assigned
        priority: priority,
        context: context,
        createdAt: new Date().toISOString(),
        assignedAt: new Date().toISOString(),
        completedAt: null,
        result: null,
        error: null,
        callback_url: context.callback_url || null // Store the callback URL
      };

      this.taskQueue.set(taskId, taskRecord);

      // Execute task
      const result = await this.executeAgentTask(selectedAgent, taskRecord);
      
      // Update task record and trigger callback
      this.updateTaskStatus(taskId, {
        status: result.success ? 'completed' : 'failed',
        result: result.data,
        error: result.error,
        completedAt: new Date().toISOString()
      });

      // Send callback if URL is provided
      if (taskRecord.callback_url) {
        await this.sendTaskStatusCallback(taskRecord.callback_url, taskRecord);
      }

      return { success: result.success, data: result.data, error: result.error };
    } catch (error) {
      logger.error(`Error delegating task ${taskId}: ${error.message}`);
      // Update task record with error status and trigger callback
      this.updateTaskStatus(taskId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      });

      const taskRecord = this.taskQueue.get(taskId);
      if (taskRecord && taskRecord.callback_url) {
        await this.sendTaskStatusCallback(taskRecord.callback_url, taskRecord);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Update the status of a task and its associated metrics.
   * @param {string} taskId - The ID of the task to update.
   * @param {object} update - An object containing the fields to update (e.g., status, result, error).
   */
  updateTaskStatus(taskId, update) {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      logger.warn(`Task with ID ${taskId} not found.`);
      return;
    }

    Object.assign(task, update);
    this.updateAgentMetrics(task.assignedAgent, task);
    logger.info(`Task ${taskId} status updated to: ${task.status}`);
  }

  /**
   * Send a task status update to a specified callback URL.
   * @param {string} callbackUrl - The URL to send the callback to.
   * @param {object} taskRecord - The updated task record to send.
   */
  async sendTaskStatusCallback(callbackUrl, taskRecord) {
    try {
      logger.info(`Sending task status callback for task ${taskRecord.id} to ${callbackUrl}`);
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-callback-token': config.a2a.callbackToken // Use a secure token
        },
        body: JSON.stringify(taskRecord)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to send task callback to ${callbackUrl}: ${response.status} ${response.statusText} - ${errorText}`);
      } else {
        logger.info(`Task callback for ${taskRecord.id} sent successfully to ${callbackUrl}`);
      }
    } catch (error) {
      logger.error(`Error sending task status callback for task ${taskRecord.id} to ${callbackUrl}: ${error.message}`);
    }
  }

  findTaskById(taskId) {
    return this.taskQueue.get(taskId);
  }

  findTaskByIdempotencyKey(key) {
    for (const task of this.taskQueue.values()) {
      if (task.context?.idempotencyKey === key) {
        return task;
      }
    }
    return null;
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
        case 'communication_sms':
        case 'communication_voice':
        case 'identity_phone_verification':
        case 'data_phone_lookup':
          // For Twilio-related tasks, call the respective Twilio tool functions
          result = await this._executeTwilioTask(agent, task);
          break;
        case 'data_company_enrichment':
        case 'data_person_enrichment':
        case 'data_website_visitor_identification':
          // For Clearbit-related tasks, call the respective Clearbit tool functions
          result = await this._executeClearbitTask(agent, task);
          break;
        case 'financial_treasury_management':
        case 'financial_card_issuing':
          // For Stripe-related tasks, call the respective Stripe tool functions
          result = await this._executeStripeTask(agent, task);
          break;
        case 'automation_nla_action':
          // For Zapier-related tasks, call the respective Zapier tool functions
          result = await this._executeZapierTask(agent, task);
          break;
        default:
          throw new Error(`Unknown agent specialization: ${agent.specialization}`);
      }
      
      this.updateTaskStatus(task.id, {
        status: 'completed',
        message: `Task completed by built-in agent ${agent.name}.`,
        result: result,
        progress: 100
      });
      return { success: true, message: 'Task executed successfully.', data: result };
    } catch (error) {
      logger.error(`Error executing built-in agent task ${task.id} with agent ${agent.name}:`, error);
      this.updateTaskStatus(task.id, {
        status: 'failed',
        message: `Task failed for built-in agent ${agent.name}.`,
        error: { code: 'BUILTIN_EXECUTION_FAILED', message: error.message },
        progress: 100
      });
      return { success: false, message: 'Task execution failed.', error: error.message };
    }
  }

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
          id: task.id,
          initiator_agent_uuid: agent.id, // Use agent's own ID as initiator
          title: task.description.substring(0, 100),
          description: task.description,
          params: task.context.params || {},
          context_id: task.context.context_id,
          priority: task.priority,
          callback_url: `${config.server.host}/a2a/v2/tasks/${task.id}/status`, // Our own status update endpoint
          metadata: task.context.metadata
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agent responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // The external agent will send status updates via callback. We just confirm submission.
      this.updateTaskStatus(task.id, {
        status: 'working',
        message: `Task submitted to external agent ${agent.name}.`,
        result: result, // Store the initial response from the external agent
        progress: 0
      });
      
      return { success: true, message: 'Task successfully submitted to external agent.', data: result };
    } catch (error) {
      logger.error(`Error submitting task ${task.id} to external agent ${agent.name}:`, error);
      this.updateTaskStatus(task.id, {
        status: 'failed',
        message: `Failed to submit task to external agent ${agent.name}.`,
        error: { code: 'EXTERNAL_SUBMISSION_FAILED', message: error.message },
        progress: 0
      });
      return { success: false, message: 'Task submission to external agent failed.', error: error.message };
    }
  }

  async _executeTwilioTask(agent, task) {
    const { executeToolProxy } = await import('../../tool-proxy.js');
    const params = task.context.params || {};

    switch (task.requiredCapabilities[0]) { // Assuming single capability for these direct calls
      case 'communication_sms':
        return await executeToolProxy('mcp_twilio_send_sms', params);
      case 'communication_voice':
        return await executeToolProxy('mcp_twilio_make_call', params);
      case 'identity_phone_verification':
        return await executeToolProxy('mcp_twilio_verify_phone', params);
      case 'data_phone_lookup':
        return await executeToolProxy('mcp_twilio_lookup_phone_number', params);
      default:
        throw new Error(`Unknown Twilio capability: ${task.requiredCapabilities[0]}`);
    }
  }

  async _executeClearbitTask(agent, task) {
    const { executeToolProxy } = await import('../../tool-proxy.js');
    const params = task.context.params || {};

    switch (task.requiredCapabilities[0]) { // Assuming single capability for these direct calls
      case 'data_company_enrichment':
        return await executeToolProxy('mcp_clearbit_enrich_company', params);
      case 'data_person_enrichment':
        return await executeToolProxy('mcp_clearbit_enrich_person', params);
      case 'data_website_visitor_identification':
        return await executeToolProxy('mcp_clearbit_identify_website_visitor', params);
      default:
        throw new Error(`Unknown Clearbit capability: ${task.requiredCapabilities[0]}`);
    }
  }

  async _executeStripeTask(agent, task) {
    const { executeToolProxy } = await import('../../tool-proxy.js');
    const params = task.context.params || {};
    const action = params.action;

    switch (task.requiredCapabilities[0]) {
      case 'financial_treasury_management':
        switch (action) {
          case 'create_account':
            return await executeToolProxy('mcp_stripe_treasury_create_financial_account', params);
          case 'retrieve_account':
            return await executeToolProxy('mcp_stripe_treasury_retrieve_financial_account', params);
          case 'list_accounts':
            return await executeToolProxy('mcp_stripe_treasury_list_financial_accounts', params);
          case 'create_transfer':
            return await executeToolProxy('mcp_stripe_treasury_create_outbound_transfer', params);
          case 'cancel_transfer':
            return await executeToolProxy('mcp_stripe_treasury_cancel_outbound_transfer', params);
          case 'create_payment':
            return await executeToolProxy('mcp_stripe_treasury_create_outbound_payment', params);
          case 'cancel_payment':
            return await executeToolProxy('mcp_stripe_treasury_cancel_outbound_payment', params);
          case 'retrieve_transaction':
            return await executeToolProxy('mcp_stripe_treasury_retrieve_transaction', params);
          case 'list_transactions':
            return await executeToolProxy('mcp_stripe_treasury_list_transactions', params);
          case 'create_received_credit':
            return await executeToolProxy('mcp_stripe_treasury_test_create_received_credit', params);
          case 'list_received_credits':
            return await executeToolProxy('mcp_stripe_treasury_list_received_credits', params);
          case 'create_received_debit':
            return await executeToolProxy('mcp_stripe_treasury_test_create_received_debit', params);
          case 'list_received_debits':
            return await executeToolProxy('mcp_stripe_treasury_list_received_debits', params);
          default:
            throw new Error(`Unknown Stripe Treasury action: ${action}`);
        }
      case 'financial_card_issuing':
        switch (action) {
          case 'create_card':
            return await executeToolProxy('mcp_stripe_issuing_create_card', params);
          case 'retrieve_card':
            return await executeToolProxy('mcp_stripe_issuing_retrieve_card', params);
          case 'update_card':
            return await executeToolProxy('mcp_stripe_issuing_update_card', params);
          case 'list_cards':
            return await executeToolProxy('mcp_stripe_issuing_list_cards', params);
          case 'create_cardholder':
            return await executeToolProxy('mcp_stripe_issuing_create_cardholder', params);
          case 'retrieve_cardholder':
            return await executeToolProxy('mcp_stripe_issuing_retrieve_cardholder', params);
          case 'retrieve_authorization':
            return await executeToolProxy('mcp_stripe_issuing_retrieve_authorization', params);
          case 'list_authorizations':
            return await executeToolProxy('mcp_stripe_issuing_list_authorizations', params);
          case 'approve_authorization':
            return await executeToolProxy('mcp_stripe_issuing_approve_authorization', params);
          case 'decline_authorization':
            return await executeToolProxy('mcp_stripe_issuing_decline_authorization', params);
          case 'create_dispute':
            return await executeToolProxy('mcp_stripe_issuing_create_dispute', params);
          case 'retrieve_dispute':
            return await executeToolProxy('mcp_stripe_issuing_retrieve_dispute', params);
          case 'retrieve_transaction':
            return await executeToolProxy('mcp_stripe_issuing_retrieve_transaction', params);
          case 'list_transactions':
            return await executeToolProxy('mcp_stripe_issuing_list_transactions', params);
          default:
            throw new Error(`Unknown Stripe Issuing action: ${action}`);
        }
      default:
        throw new Error(`Unknown Stripe capability: ${task.requiredCapabilities[0]}`);
    }
  }

  async _executeZapierTask(agent, task) {
    const { executeToolProxy } = await import('../../tool-proxy.js');
    const params = task.context.params || {};

    switch (task.requiredCapabilities[0]) {
      case 'automation_nla_action':
        return await executeToolProxy('mcp_zapier_nla_execute_action', params);
      default:
        throw new Error(`Unknown Zapier capability: ${task.requiredCapabilities[0]}`);
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
    if (agent) {
      agent.performanceMetrics.tasksCompleted++;
      const taskDuration = new Date(taskRecord.completedAt).getTime() - new Date(taskRecord.assignedAt).getTime();
      // Simple moving average for demonstration
      agent.performanceMetrics.averageResponseTime = 
        (agent.performanceMetrics.averageResponseTime * (agent.performanceMetrics.tasksCompleted - 1) + taskDuration) / 
        agent.performanceMetrics.tasksCompleted;
      
      if (taskRecord.status === 'completed') {
        agent.performanceMetrics.successRate = 
          ((agent.performanceMetrics.successRate / 100 * (agent.performanceMetrics.tasksCompleted - 1)) + 1) / 
          agent.performanceMetrics.tasksCompleted * 100;
      } else {
        agent.performanceMetrics.successRate = 
          ((agent.performanceMetrics.successRate / 100 * (agent.performanceMetrics.tasksCompleted - 1))) / 
          agent.performanceMetrics.tasksCompleted * 100;
      }
      agent.performanceMetrics.lastTaskTime = new Date().toISOString();
    }
  }

  /**
   * Get agent by ID
   * @param {string} agentId - Agent ID
   * @returns {object|null} Agent information
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
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
      const requiredCapabilities = Array.isArray(filters.capability) ? filters.capability : [filters.capability];
      agents = agents.filter(agent => 
        requiredCapabilities.every(cap => agent.capabilities.includes(cap))
      );
    }

    return agents.map(agent => ({ ...agent, taskHistory: undefined })); // Exclude sensitive info
  }

  /**
   * Get task status
   * @param {string} taskId - Task ID
   * @returns {object|null} Task information
   */
  getTask(taskId) {
    return this.taskQueue.get(taskId);
  }

  /**
   * List tasks
   * @param {object} filters - Optional filters
   * @returns {object[]} List of tasks
   */
  listTasks(filters = {}) {
    let tasks = Array.from(this.taskQueue.values());
    // Add filtering logic based on task status, assignee, initiator, etc.
    return tasks;
  }

  /**
   * Generate agent network status report
   * @returns {object} Network status report
   */
  getNetworkStatus() {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values()).filter(agent => agent.status === 'active').length;
    const totalTasks = this.taskQueue.size;
    const pendingTasks = Array.from(this.taskQueue.values()).filter(task => 
      task.status === 'submitted' || task.status === 'assigned' || task.status === 'working' || task.status === 'input-required'
    ).length;
    const completedTasks = Array.from(this.taskQueue.values()).filter(task => task.status === 'completed').length;
    const failedTasks = Array.from(this.taskQueue.values()).filter(task => task.status === 'failed').length;

    return {
      totalAgents,
      activeAgents,
      totalTasks,
      pendingTasks,
      completedTasks,
      failedTasks,
      averageTaskCompletionTime: this.calculateAverageTaskTime(),
      overallSuccessRate: this.calculateOverallSuccessRate(),
      topPerformingAgent: this.getTopPerformingAgent()
    };
  }

  calculateAverageTaskTime() {
    const completedTasks = Array.from(this.taskQueue.values()).filter(task => task.status === 'completed' && task.assignedAt && task.completedAt);
    if (completedTasks.length === 0) return 0;

    const totalDuration = completedTasks.reduce((sum, task) => {
      return sum + (new Date(task.completedAt).getTime() - new Date(task.assignedAt).getTime());
    }, 0);

    return totalDuration / completedTasks.length;
  }

  calculateOverallSuccessRate() {
    const totalTasks = this.taskQueue.size;
    if (totalTasks === 0) return 0;
    const completedTasks = Array.from(this.taskQueue.values()).filter(task => task.status === 'completed').length;
    return (completedTasks / totalTasks) * 100;
  }

  getTopPerformingAgent() {
    let topAgent = null;
    let maxScore = -1;

    for (const agent of this.agents.values()) {
      if (agent.performanceMetrics) {
        const score = agent.performanceMetrics.successRate * 0.7 + 
                      (100 - agent.performanceMetrics.averageResponseTime / 1000) * 0.3;
        if (score > maxScore) {
          maxScore = score;
          topAgent = agent;
        }
      }
    }
    return topAgent ? { id: topAgent.id, name: topAgent.name, score: maxScore } : null;
  }

  /**
   * Send an A2A message between internal agents.
   * This method simulates the A2A protocol internally.
   * @param {string} senderAgentId - The ID of the sending agent.
   * @param {string} receiverAgentId - The ID of the receiving agent.
   * @param {string} messageContent - The content of the message.
   * @param {string} [conversationId] - Optional conversation ID for context.
   * @returns {Promise<object>} Result indicating success or failure.
   */
  async sendMessageToAgent(senderAgentId, receiverAgentId, messageContent, conversationId = uuidv4()) {
    logger.info(`Internal A2A message from ${senderAgentId} to ${receiverAgentId} (Conversation: ${conversationId})`);

    const senderAgent = this.agents.get(senderAgentId);
    const receiverAgent = this.agents.get(receiverAgentId);

    if (!senderAgent) {
      return { success: false, error: `Sender agent ${senderAgentId} not found.` };
    }
    if (!receiverAgent) {
      return { success: false, error: `Receiver agent ${receiverAgentId} not found.` };
    }

    // Simulate message processing and response
    try {
      // For now, let's assume direct processing or enqueueing for the receiver
      // In a real scenario, this would involve invoking a method on the receiver agent
      // or adding to its internal message queue.
      // Here, we'll just log and return a success.
      logger.debug(`Message delivered to ${receiverAgent.name}: ${messageContent}`);

      // Store message in active conversations for context if needed
      if (!this.activeConversations.has(conversationId)) {
        this.activeConversations.set(conversationId, []);
      }
      this.activeConversations.get(conversationId).push({
        sender: senderAgentId,
        receiver: receiverAgentId,
        content: messageContent,
        timestamp: new Date().toISOString()
      });

      return { success: true, conversationId, messageId: uuidv4() };
    } catch (error) {
      logger.error(`Error sending internal A2A message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export default new AgentManager(); 
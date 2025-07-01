import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getWorkflowExecution,
  getAllWorkflows,
  executeWorkflow,
} from '../workflow-manager.js';
import { getFunctionCall } from '../lib/gemini-client.js';
import rateLimiters from '../middleware/rate-limit.js';
import logger from '../logger.js';
import agentManager from '../lib/agents/agent-manager.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// --- A2A Protocol Endpoints ---

// Agent discovery endpoint - Enhanced with financial capabilities
router.get('/.well-known/agent.json', (req, res) => {
  const agentInfo = {
    agent_id: 'smart-mcp-financial-gateway',
    name: 'Smart MCP Financial Gateway',
    description: 'An intelligent financial services gateway providing comprehensive trading, portfolio management, risk analysis, and compliance capabilities through a network of specialized AI agents.',
    version: '2.0.0',
    endpoints: {
      task_execution: '/a2a/tasks',
      agent_discovery: '/a2a/agents',
      workflow_execution: '/a2a/workflows',
      financial_services: '/a2a/financial'
    },
    capabilities: [
      {
        name: 'financial_portfolio_management',
        description: 'Complete portfolio management including performance analysis, risk assessment, and rebalancing recommendations.',
        parameters: {
          type: 'object',
          required: ['account_id'],
          properties: {
            account_id: { type: 'string', description: 'Account identifier' },
            analysis_type: { type: 'string', enum: ['performance', 'risk', 'allocation'], description: 'Type of analysis to perform' }
          }
        }
      },
      {
        name: 'trading_execution',
        description: 'Execute trades, manage orders, and provide execution reports.',
        parameters: {
          type: 'object',
          required: ['action'],
          properties: {
            action: { type: 'string', enum: ['place_order', 'cancel_order', 'get_orders', 'execution_report'] },
            symbol: { type: 'string', description: 'Stock symbol' },
            side: { type: 'string', enum: ['BUY', 'SELL'] },
            quantity: { type: 'number', description: 'Number of shares' },
            order_type: { type: 'string', enum: ['MARKET', 'LIMIT', 'STOP'] }
          }
        }
      },
      {
        name: 'market_data_analysis',
        description: 'Provide real-time market data, historical analysis, and technical indicators.',
        parameters: {
          type: 'object',
          required: ['data_type'],
          properties: {
            data_type: { type: 'string', enum: ['quote', 'historical', 'technical', 'news', 'indices'] },
            symbol: { type: 'string', description: 'Stock symbol' },
            period: { type: 'string', description: 'Time period for analysis' }
          }
        }
      },
      {
        name: 'risk_management',
        description: 'Calculate risk metrics, perform stress testing, and monitor compliance.',
        parameters: {
          type: 'object',
          required: ['account_id'],
          properties: {
            account_id: { type: 'string', description: 'Account identifier' },
            risk_type: { type: 'string', enum: ['var', 'stress_test', 'compliance_check'] }
          }
        }
      },
      {
        name: 'regulatory_compliance',
        description: 'Generate compliance reports, audit trails, and regulatory filings.',
        parameters: {
          type: 'object',
          properties: {
            report_type: { type: 'string', enum: ['audit', 'regulatory', 'risk_report'] },
            period: { type: 'string', description: 'Reporting period' }
          }
        }
      },
      {
        name: 'workflow_execution',
        description: 'Execute complex financial workflows with intelligent tool selection.',
        parameters: {
          type: 'object',
          required: ['task_description'],
          properties: {
            task_description: { type: 'string', description: 'Natural language description of the task' }
          }
        }
      }
    ],
    specializations: [
      'portfolio_management',
      'risk_management',
      'trade_execution',
      'regulatory_compliance',
      'client_services',
      'market_analysis'
    ],
    supported_protocols: ['A2A', 'MCP'],
    network: {
      agents: agentManager.listAgents({ status: 'active' }).length,
      capabilities: Array.from(agentManager.capabilityIndex.keys()),
      last_updated: new Date().toISOString()
    }
  };

  res.json(agentInfo);
});

// Submit a task via A2A: Enhanced with agent delegation
router.post('/tasks', rateLimiters.standardLimiter, async (req, res, next) => {
  try {
    const { task_description, requester, priority = 'normal', context = {}, ...payload } = req.body;

    if (!task_description) {
      return res.status(400).json({
        error: 'Invalid A2A message format. Required field: "task_description"',
      });
    }

    logger.info('A2A Task received', { task_description, requester, priority });

    // Analyze task to determine if it should be handled by agents or workflows
    const taskAnalysis = await analyzeTaskRequirements(task_description);

    if (taskAnalysis.useAgents) {
      // Delegate to specialized agents
      const delegationResult = await agentManager.delegateTask({
        description: task_description,
        requiredCapabilities: taskAnalysis.capabilities,
        priority: priority,
        context: { ...context, ...payload, requester }
      });

      return res.status(202).json({
        message: 'Task delegated to specialized agent',
        taskId: delegationResult.taskId,
        assignedAgent: delegationResult.assignedAgent,
        statusUrl: `/a2a/tasks/${delegationResult.taskId}`,
        success: delegationResult.success,
        result: delegationResult.result,
        error: delegationResult.error
      });
    } else {
      // Use traditional workflow execution
      const allWorkflows = await getAllWorkflows();

      const workflowFunctions = allWorkflows.map((wf) => ({
        name: wf.name,
        description: wf.description,
        parameters: {
          type: 'object',
          properties: {
            ...wf.parameters?.properties,
          },
          required: wf.parameters?.required || [],
        },
      }));

      const functionCall = await getFunctionCall(
        task_description,
        workflowFunctions,
        payload
      );

      if (!functionCall) {
        return res
          .status(404)
          .json({ error: 'No suitable workflow or agent found for the given task.' });
      }

      const workflowName = functionCall.name;
      const workflowParams = functionCall.args;

      // Execute the workflow asynchronously
      const { executionId } = await executeWorkflow(workflowName, workflowParams);

      // Immediately respond with the execution ID
      res.status(202).json({
        message: 'Workflow execution started',
        executionId: executionId,
        statusUrl: `/a2a/tasks/${executionId}`,
      });
    }
  } catch (error) {
    logger.error('A2A Task Submission Error', { error, body: req.body });
    next(error);
  }
});

// Get task execution status/result - Enhanced for both workflows and agent tasks
router.get('/tasks/:taskId', rateLimiters.standardLimiter, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    // Check if it's an agent task first
    const agentTask = agentManager.getTask(taskId);
    if (agentTask) {
      return res.json({
        taskId: taskId,
        status: agentTask.status,
        assignedAgent: agentTask.assignedAgent,
        description: agentTask.description,
        result: agentTask.result,
        error: agentTask.error,
        createdAt: agentTask.createdAt,
        completedAt: agentTask.completedAt,
        type: 'agent_task'
      });
    }

    // Check if it's a workflow execution
    const execution = await getWorkflowExecution(taskId);
    if (execution) {
      return res.json({
        ...execution,
        type: 'workflow_execution'
      });
    }

    return res.status(404).json({ 
      error: `Task with ID '${taskId}' not found.` 
    });
  } catch (error) {
    logger.error('A2A Task Status Error', {
      error,
      taskId: req.params.taskId,
    });
    next(error);
  }
});

// Agent discovery and management endpoints
router.get('/agents', rateLimiters.standardLimiter, (req, res) => {
  try {
    const { status, specialization, capability } = req.query;
    
    const agents = agentManager.listAgents({
      status,
      specialization,
      capability
    });

    res.json({
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        specialization: agent.specialization,
        capabilities: agent.capabilities,
        status: agent.status,
        performanceMetrics: agent.performanceMetrics,
        lastSeen: agent.lastSeen
      })),
      count: agents.length
    });
  } catch (error) {
    logger.error('Agent discovery error', { error });
    res.status(500).json({ error: 'Failed to retrieve agents' });
  }
});

// Get specific agent information
router.get('/agents/:agentId', rateLimiters.standardLimiter, (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = agentManager.getAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: `Agent ${agentId} not found` });
    }

    res.json(agent);
  } catch (error) {
    logger.error('Get agent error', { error, agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to retrieve agent information' });
  }
});

// Register external agent
router.post('/agents/register', rateLimiters.standardLimiter, (req, res) => {
  try {
    const agentInfo = req.body;
    
    if (!agentInfo.name || !agentInfo.capabilities || !agentInfo.endpoint) {
      return res.status(400).json({
        error: 'Required fields: name, capabilities, endpoint'
      });
    }

    const agentId = agentManager.registerAgent(agentInfo);
    
    res.status(201).json({
      message: 'Agent registered successfully',
      agentId: agentId
    });
  } catch (error) {
    logger.error('Agent registration error', { error, body: req.body });
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

// Financial services specific endpoints
router.get('/financial/portfolio/:accountId', rateLimiters.standardLimiter, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const result = await agentManager.delegateTask({
      description: `Get portfolio information for account ${accountId}`,
      requiredCapabilities: ['asset_allocation', 'performance_monitoring'],
      context: { accountId }
    });

    res.json(result);
  } catch (error) {
    logger.error('Portfolio request error', { error, accountId: req.params.accountId });
    res.status(500).json({ error: 'Failed to retrieve portfolio information' });
  }
});

router.post('/financial/trade', rateLimiters.execution, async (req, res) => {
  try {
    const { symbol, side, quantity, orderType, accountId } = req.body;
    
    if (!symbol || !side || !quantity) {
      return res.status(400).json({
        error: 'Required fields: symbol, side, quantity'
      });
    }

    const result = await agentManager.delegateTask({
      description: `Place ${side} order for ${quantity} shares of ${symbol}`,
      requiredCapabilities: ['order_routing', 'execution_optimization'],
      context: { symbol, side, quantity, orderType, accountId }
    });

    res.json(result);
  } catch (error) {
    logger.error('Trade execution error', { error, body: req.body });
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

router.get('/financial/risk/:accountId', rateLimiters.standardLimiter, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const result = await agentManager.delegateTask({
      description: `Calculate risk metrics for account ${accountId}`,
      requiredCapabilities: ['var_calculation', 'stress_testing'],
      context: { accountId }
    });

    res.json(result);
  } catch (error) {
    logger.error('Risk analysis error', { error, accountId: req.params.accountId });
    res.status(500).json({ error: 'Failed to calculate risk metrics' });
  }
});

// Network status and health
router.get('/network/status', rateLimiters.standardLimiter, (req, res) => {
  try {
    const networkStatus = agentManager.getNetworkStatus();
    res.json(networkStatus);
  } catch (error) {
    logger.error('Network status error', { error });
    res.status(500).json({ error: 'Failed to retrieve network status' });
  }
});

// List all tasks
router.get('/tasks', rateLimiters.standardLimiter, (req, res) => {
  try {
    const { status, agentId, limit = 50 } = req.query;
    
    const tasks = agentManager.listTasks({ status, agentId });
    
    res.json({
      tasks: tasks.slice(0, parseInt(limit)),
      count: tasks.length
    });
  } catch (error) {
    logger.error('List tasks error', { error });
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

/**
 * Analyze task requirements to determine if agents or workflows should be used
 * @param {string} taskDescription - Natural language task description
 * @returns {object} Analysis result
 */
async function analyzeTaskRequirements(taskDescription) {
  const description = taskDescription.toLowerCase();
  
  // Financial keywords that suggest agent delegation
  const financialKeywords = [
    'portfolio', 'risk', 'trade', 'order', 'compliance', 'audit',
    'performance', 'allocation', 'rebalance', 'var', 'stress test',
    'market data', 'quote', 'price', 'analysis', 'report'
  ];

  const hasFinancialKeywords = financialKeywords.some(keyword => 
    description.includes(keyword)
  );

  if (hasFinancialKeywords) {
    // Determine required capabilities based on keywords
    const capabilities = [];
    
    if (description.includes('portfolio') || description.includes('allocation')) {
      capabilities.push('asset_allocation', 'performance_monitoring');
    }
    if (description.includes('risk') || description.includes('var')) {
      capabilities.push('var_calculation', 'stress_testing');
    }
    if (description.includes('trade') || description.includes('order')) {
      capabilities.push('order_routing', 'execution_optimization');
    }
    if (description.includes('compliance') || description.includes('audit')) {
      capabilities.push('regulatory_monitoring', 'audit_support');
    }
    if (description.includes('market') || description.includes('quote')) {
      capabilities.push('real_time_quotes', 'market_analysis');
    }

    return {
      useAgents: true,
      capabilities: capabilities.length > 0 ? capabilities : ['asset_allocation']
    };
  }

  return {
    useAgents: false,
    capabilities: []
  };
}

export default router;

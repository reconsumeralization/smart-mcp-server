import express from 'express';
import {
  getWorkflowExecution,
  getAllWorkflows,
  executeWorkflow,
} from '../workflow-manager.js';
import { getFunctionCall } from '../lib/gemini-client.js';
import rateLimiters from '../middleware/rate-limit.js';
import logger from '../logger.js';
import agentManager from '../lib/agents/agent-manager.js';
import agentDiscoveryDoc from '../../public/agent.json'; // Import the agent discovery document
import Joi from 'joi';

const router = express.Router();

// Joi schema for AgentDiscovery document validation
const agentDiscoverySchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
  name: Joi.string().min(1).required(),
  description: Joi.string().min(1),
  version: Joi.string().required(),
  protocol_versions: Joi.object().pattern(Joi.string().regex(/^[a-zA-Z0-9_\\-]+$/), Joi.string()).min(1).required(),
  endpoints: Joi.object().pattern(Joi.string().regex(/^[a-zA-Z0-9_\\-]+$/), Joi.string().uri({ allowRelative: true })).min(1).required(),
  capabilities: Joi.array().items(Joi.object({
    name: Joi.string().min(1).required(),
    description: Joi.string().min(1).required(),
    input_schema: Joi.object().unknown(true).required(),
    output_schema: Joi.object().unknown(true).required(),
  })).min(1).required(),
  compliance: Joi.object().unknown(true),
  contact: Joi.object({
    email: Joi.string().email(),
  }),
  license: Joi.string(),
  last_updated: Joi.string().isoDate(),
}).unknown(false); // Disallow unknown properties

// --- Agent Endpoints ---
router.post('/agents/register', rateLimiters.registrationLimiter, (req, res) => {
  const agentInfo = req.body;

  const { error } = agentDiscoverySchema.validate(agentInfo);
  if (error) {
    logger.warn('A2A Agent Registration Validation Error', { error: error.details, agentInfo });
    return res.status(400).json({ error: 'Invalid agent registration format', details: error.details });
  }

  const agentId = agentManager.registerAgent(agentInfo);
  res.status(201).json({ agentId });
});

// Updated Agent Discovery Endpoint (GET /a2a/agents)
router.get('/agents', (req, res) => {
  // For simplicity and to adhere to the AgentDiscovery schema, we return the predefined agent.json
  // In a multi-agent scenario, this would dynamically list available agents.
  res.json(agentDiscoveryDoc);
});

router.get('/agents/:agentId', (req, res) => {
  const { agentId } = req.params;
  const agent = agentManager.getAgent(agentId);
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});


// --- Task Endpoints ---
router.post('/tasks', rateLimiters.standardLimiter, async (req, res, next) => {
  try {
    const { id, initiator_agent_uuid, title, description, params, context_id, priority = 'normal', callback_url, metadata, idempotencyKey, ...payload } = req.body;

    // Validate required fields based on A2ATaskSubmissionRequest schema
    if (!id || !initiator_agent_uuid || !title || !description || !params) {
      return res.status(400).json({
        error: 'Invalid A2A task submission format. Required fields: id, initiator_agent_uuid, title, description, params',
      });
    }

    if (idempotencyKey) {
      const existingTask = agentManager.findTaskByIdempotencyKey(idempotencyKey);
      if (existingTask) {
        logger.info(`Idempotent task request received. Returning existing task ${existingTask.id}.`);
        return res.status(200).json(existingTask);
      }
    }

    logger.info('A2A Task received', { id, title, initiator_agent_uuid, priority });

    const taskAnalysis = await analyzeTaskRequirements(description);

    if (taskAnalysis.useAgents) {
      const delegationResult = await agentManager.delegateTask({
        id: id,
        initiator_agent_uuid: initiator_agent_uuid,
        description: description,
        requiredCapabilities: taskAnalysis.capabilities,
        priority: priority,
        context: { ...context_id && { context_id }, ...callback_url && { callback_url }, ...metadata && { metadata }, ...payload, idempotencyKey }
      });
      return res.status(202).json(delegationResult);
    } else {
      const allWorkflows = await getAllWorkflows();
      const workflowFunctions = allWorkflows.map((wf) => ({
        name: wf.name,
        description: wf.description,
        parameters: wf.parameters,
      }));

      const functionCall = await getFunctionCall(description, workflowFunctions, payload);

      if (!functionCall) {
        return res.status(404).json({ error: 'No suitable workflow or agent found for the given task.' });
      }

      const { executionId } = await executeWorkflow(functionCall.name, functionCall.args);

      // For consistency, return the submitted task ID if a workflow is executed.
      res.status(202).json({
        message: 'Workflow execution started',
        id: id, // Return the submitted task ID
        executionId: executionId,
        statusUrl: `/a2a/v2/tasks/${executionId}`,
      });
    }
  } catch (error) {
    logger.error('A2A Task Submission Error', { error, body: req.body });
    next(error);
  }
});

router.get('/tasks/:taskId', rateLimiters.standardLimiter, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const agentTask = agentManager.getTask(taskId);

    if (agentTask) {
      // Format agent task to match A2ATaskStatusUpdateResponse schema
      return res.json({
        id: agentTask.id,
        status: agentTask.status, // Assuming agentTask.status maps directly to a2a_task_state enum
        message: agentTask.message || `Task ${agentTask.status}`,
        progress: agentTask.progress || (agentTask.status === 'completed' ? 100 : 0),
        result: agentTask.result,
        error: agentTask.error,
        assignee_agent_uuid: agentTask.assignedAgent,
        type: 'agent_task'
      });
    }

    const execution = await getWorkflowExecution(taskId);
    if (execution) {
      // Format workflow execution to match A2ATaskStatusUpdateResponse schema
      return res.json({
        id: execution.executionId,
        status: execution.status, // Assuming execution.status maps directly
        message: execution.message || `Workflow ${execution.status}`,
        progress: execution.progress || (execution.status === 'completed' ? 100 : 0),
        result: execution.result,
        error: execution.error,
        assignee_agent_uuid: null, // Workflows don't have a single assignee agent in this context
        type: 'workflow_execution'
      });
    }

    return res.status(404).json({ error: `Task with ID '${taskId}' not found.` });
  } catch (error) {
    logger.error('A2A Task Status Error', { error, taskId: req.params.taskId });
    next(error);
  }
});

router.post('/tasks/:taskId/status', rateLimiters.standardLimiter, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status, message, progress, result, error, assignee_agent_uuid } = req.body;

    // Basic validation for required fields for status update
    if (!status) {
      return res.status(400).json({
        error: 'Invalid A2A task status update format. Required field: status',
      });
    }

    // In a real scenario, you'd likely have an agentManager.updateTaskStatus method
    // that handles updating the task in your persistent storage (e.g., database).
    // For this example, we'll simulate the update on the in-memory task.
    const updatedTask = agentManager.updateTaskStatus(taskId, { status, message, progress, result, error, assignee_agent_uuid });

    if (!updatedTask) {
      return res.status(404).json({ error: `Task with ID '${taskId}' not found for status update.` });
    }

    logger.info(`Task ${taskId} status updated to ${status}`, { taskId, status, message });
    return res.status(200).json({
      message: `Task ${taskId} status updated successfully.`, 
      updatedTask
    });
  } catch (error) {
    logger.error('A2A Task Status Update Error', { error, taskId: req.params.taskId, body: req.body });
    next(error);
  }
});

// Duplicated from agent-manager.js for now. Will be refactored.
async function analyzeTaskRequirements(taskDescription) {
  const description = taskDescription.toLowerCase();
  const financialKeywords = [
    'portfolio', 'risk', 'trade', 'order', 'compliance', 'audit',
    'performance', 'allocation', 'rebalance', 'var', 'stress test',
    'market data', 'quote', 'price', 'analysis', 'report',
    'financial account', 'treasury', 'outbound transfer', 'outbound payment', 'received credit', 'received debit',
    'card issuing', 'issue card', 'cardholder', 'authorization', 'dispute',
    'sms', 'send message', 'call', 'phone verification', 'phone number lookup',
    'company enrichment', 'person data', 'website visitor'
  ];

  const hasFinancialKeywords = financialKeywords.some(keyword => description.includes(keyword));

  const capabilities = [];

  if (hasFinancialKeywords) {
    if (description.includes('portfolio') || description.includes('allocation')) capabilities.push('financial_portfolio_management');
    if (description.includes('trade') || description.includes('order')) capabilities.push('trading_execution');
    if (description.includes('risk') || description.includes('compliance')) capabilities.push('risk_management');

    // Stripe Treasury capabilities
    if (description.includes('financial account') || description.includes('treasury') || 
        description.includes('outbound transfer') || description.includes('outbound payment') ||
        description.includes('received credit') || description.includes('received debit')) {
      capabilities.push('financial_treasury_management');
    }

    // Stripe Issuing capabilities
    if (description.includes('card issuing') || description.includes('issue card') || 
        description.includes('cardholder') || description.includes('authorization') || 
        description.includes('dispute')) {
      capabilities.push('financial_card_issuing');
    }

    // Twilio capabilities
    if (description.includes('sms') || description.includes('send message')) {
      capabilities.push('communication_sms');
    }
    if (description.includes('call')) {
      capabilities.push('communication_voice');
    }
    if (description.includes('phone verification')) {
      capabilities.push('identity_phone_verification');
    }
    if (description.includes('phone number lookup')) {
      capabilities.push('data_phone_lookup');
    }

    // Clearbit capabilities
    if (description.includes('company enrichment')) {
      capabilities.push('data_company_enrichment');
    }
    if (description.includes('person data')) {
      capabilities.push('data_person_enrichment');
    }
    if (description.includes('website visitor')) {
      capabilities.push('data_website_visitor_identification');
    }

    // Zapier capabilities
    if (description.includes('zapier') || description.includes('automate') || description.includes('nla action')) {
      capabilities.push('automation_nla_action');
    }

    // If specific capabilities are found, use them. Otherwise, default to general financial management.
    return { useAgents: capabilities.length > 0, capabilities: capabilities.length > 0 ? capabilities : ['financial_portfolio_management'] };
  }
  return { useAgents: false, capabilities: [] };
}

export default router;

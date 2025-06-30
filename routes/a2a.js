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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// --- A2A Protocol Endpoints ---

// Agent discovery endpoint
router.get('/.well-known/agent.json', (req, res) => {
  // Note: This might be better served from the main server.js if it's a static file.
  // For now, keeping logic together.
  res.sendFile(path.join(__dirname, '..', 'public', 'agent.json'));
});

// Submit a task via A2A: context-aware workflow selection and execution
router.post('/tasks', rateLimiters.standardLimiter, async (req, res, next) => {
  try {
    const { task_description, ...payload } = req.body;

    if (!task_description) {
      return res.status(400).json({
        error: 'Invalid A2A message format. Required field: "task_description"',
      });
    }

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
        .json({ error: 'No suitable workflow found for the given task.' });
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
  } catch (error) {
    logger.error('A2A Task Submission Error', { error, body: req.body });
    next(error);
  }
});

// Get workflow execution status/result
router.get(
  '/tasks/:executionId',
  rateLimiters.standardLimiter,
  async (req, res, next) => {
    try {
      const { executionId } = req.params;
      const execution = await getWorkflowExecution(executionId);

      if (!execution) {
        return res
          .status(404)
          .json({ error: `Execution with ID '${executionId}' not found.` });
      }

      res.json(execution);
    } catch (error) {
      logger.error('A2A Task Status Error', {
        error,
        executionId: req.params.executionId,
      });
      next(error);
    }
  }
);

export default router;

import express from 'express';
import { WorkflowManager } from './workflow-manager.js';
import logger from './logger.js';
import {
  NlpWorkflowCreator,
  IntelligentWorkflowOrchestrator,
  PredictiveAnalytics
} from './lib/ai-workflows/index.js';

// Create a workflow manager instance
const workflowManager = new WorkflowManager();

// Create router
const router = express.Router();

/**
 * Register a new workflow
 *
 * POST /api/workflows
 * {
 *   "id": "my-workflow",
 *   "steps": [
 *     {
 *       "id": "step1",
 *       "toolId": "tool1",
 *       "params": { ... }
 *     },
 *     {
 *       "id": "step2",
 *       "toolId": "tool2",
 *       "params": { ... },
 *       "dependencies": ["step1"]
 *     }
 *   ],
 *   "concurrencyLimit": 3
 * }
 */
router.post('/', (req, res) => {
  try {
    console.log('Registering workflow:', req.body);
    const workflow = req.body;

    const workflowId = workflowManager.registerWorkflow(workflow);

    res.status(201).json({
      id: workflowId,
      message: 'Workflow registered successfully',
    });
  } catch (error) {
    logger.error('Error registering workflow:', { error });
    res.status(400).json({
      error: error.message || 'Failed to register workflow',
    });
  }
});

/**
 * List all registered workflows
 *
 * GET /api/workflows
 */
router.get('/', (req, res) => {
  try {
    const workflows = Array.from(workflowManager.workflows.entries()).map(
      ([id, workflow]) => ({
        id,
        steps: workflow.steps.map((step) => ({
          id: step.id,
          toolId: step.toolId,
          dependencies: step.dependencies || [],
        })),
        concurrencyLimit: workflow.concurrencyLimit,
      })
    );

    res.json({ workflows });
  } catch (error) {
    logger.error('Error listing workflows:', { error });
    res.status(500).json({
      error: error.message || 'Failed to list workflows',
    });
  }
});

/**
 * Execute a workflow
 *
 * POST /api/workflows/:id/execute
 * {
 *   "context": {
 *     "key1": "value1",
 *     "key2": "value2"
 *   }
 * }
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const context = req.body.context || {};

    // Start execution (will run asynchronously)
    const executionPromise = workflowManager.executeWorkflow(
      workflowId,
      context
    );

    // Respond immediately with execution started message
    const executionId = `${workflowId}-${Date.now()}`;
    res.status(202).json({
      executionId,
      message: 'Workflow execution started',
      status: 'pending',
    });

    // Handle completion (just log for now)
    executionPromise
      .then((result) => {
        logger.info(`Workflow ${workflowId} completed:`, { result });
      })
      .catch((error) => {
        logger.error(`Workflow ${workflowId} failed:`, { error });
      });
  } catch (error) {
    logger.error('Error executing workflow:', { error });
    res.status(400).json({
      error: error.message || 'Failed to execute workflow',
    });
  }
});

/**
 * Get workflow execution status
 *
 * GET /api/workflows/executions/:executionId
 */
router.get('/executions/:executionId', (req, res) => {
  try {
    const executionId = req.params.executionId;
    const execution = workflowManager.executions.get(executionId);

    if (!execution) {
      return res.status(404).json({
        error: `Execution ${executionId} not found`,
      });
    }

    res.json({
      executionId,
      status: execution.status,
      results: execution.results,
      errors: execution.errors,
      completedSteps: Array.from(execution.completedSteps),
      pendingSteps: Array.from(execution.pendingSteps),
    });
  } catch (error) {
    logger.error('Error getting execution status:', { error });
    res.status(500).json({
      error: error.message || 'Failed to get execution status',
    });
  }
});

// --- AI-Powered Endpoints ---

/**
 * Create a workflow from a natural language description.
 *
 * POST /api/workflows/create-from-text
 * {
 *   "description": "First, get the user's details, then create a payment intent with stripe."
 * }
 */
router.post('/create-from-text', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const workflowJson = await NlpWorkflowCreator.createFromText(description);
    if (!workflowJson) {
      return res.status(500).json({ error: 'Failed to generate workflow from text.' });
    }
    // Optionally, register the new workflow immediately
    const workflowId = workflowManager.registerWorkflow(workflowJson);
    res.status(201).json({ 
      message: 'Workflow created and registered successfully.',
      workflowId,
      workflow: workflowJson 
    });
  } catch (error) {
    logger.error('Error creating workflow from text:', { error });
    res.status(500).json({ error: 'Failed to process your request.' });
  }
});

/**
 * Optimize a workflow using the intelligent orchestrator.
 * (Conceptual endpoint)
 *
 * POST /api/workflows/:id/optimize
 */
router.post('/:id/optimize', async (req, res) => {
    const { id } = req.params;
    const workflow = workflowManager.getWorkflow(id);

    if (!workflow) {
        return res.status(404).json({ error: `Workflow ${id} not found.` });
    }

    try {
        const result = await IntelligentWorkflowOrchestrator.optimizeAndRun(workflow);
        res.json({ message: 'Optimization process completed.', result });
    } catch (error) {
        logger.error(`Error optimizing workflow ${id}:`, { error });
        res.status(500).json({ error: 'Failed to optimize workflow.' });
    }
});

/**
 * Predict the success of a workflow.
 * (Conceptual endpoint)
 *
 * GET /api/workflows/:id/predict-success
 */
router.get('/:id/predict-success', async (req, res) => {
    const { id } = req.params;
    const workflow = workflowManager.getWorkflow(id);

    if (!workflow) {
        return res.status(404).json({ error: `Workflow ${id} not found.` });
    }

    try {
        const probability = await PredictiveAnalytics.predictWorkflowSuccess(workflow);
        res.json({ workflowId: id, successProbability: probability });
    } catch (error) {
        logger.error(`Error predicting success for workflow ${id}:`, { error });
        res.status(500).json({ error: 'Failed to get prediction.' });
    }
});

export default router;

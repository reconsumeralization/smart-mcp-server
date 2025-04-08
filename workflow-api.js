import express from 'express';
import { WorkflowManager } from './workflow-manager.js';

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
    const workflow = req.body;
    
    const workflowId = workflowManager.registerWorkflow(workflow);
    
    res.status(201).json({
      id: workflowId,
      message: 'Workflow registered successfully'
    });
  } catch (error) {
    console.error('Error registering workflow:', error);
    res.status(400).json({
      error: error.message || 'Failed to register workflow'
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
    const workflows = Array.from(workflowManager.workflows.entries()).map(([id, workflow]) => ({
      id,
      steps: workflow.steps.map(step => ({
        id: step.id,
        toolId: step.toolId,
        dependencies: step.dependencies || []
      })),
      concurrencyLimit: workflow.concurrencyLimit
    }));
    
    res.json({ workflows });
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({
      error: error.message || 'Failed to list workflows'
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
    const executionPromise = workflowManager.executeWorkflow(workflowId, context);
    
    // Respond immediately with execution started message
    const executionId = `${workflowId}-${Date.now()}`;
    res.status(202).json({
      executionId,
      message: 'Workflow execution started',
      status: 'pending'
    });
    
    // Handle completion (just log for now)
    executionPromise
      .then(result => {
        console.log(`Workflow ${workflowId} completed:`, result);
      })
      .catch(error => {
        console.error(`Workflow ${workflowId} failed:`, error);
      });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(400).json({
      error: error.message || 'Failed to execute workflow'
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
        error: `Execution ${executionId} not found`
      });
    }
    
    res.json({
      executionId,
      status: execution.status,
      results: execution.results,
      errors: execution.errors,
      completedSteps: Array.from(execution.completedSteps),
      pendingSteps: Array.from(execution.pendingSteps)
    });
  } catch (error) {
    console.error('Error getting execution status:', error);
    res.status(500).json({
      error: error.message || 'Failed to get execution status'
    });
  }
});

export default router; 
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import redisClient from './redis-client.js';
import logger from '../logger.js';
import db from './db-client.js';
import { executeToolProxy } from '../tool-proxy.js';

const WORKFLOW_PREFIX = 'workflow:';
const EXECUTION_PREFIX = 'execution:';

async function registerWorkflow(workflow) {
  const workflowKey = `${WORKFLOW_PREFIX}${workflow.name}`;
  await redisClient.set(workflowKey, JSON.stringify(workflow));
  logger.info(`Workflow '${workflow.name}' registered successfully.`);
}

async function getWorkflow(workflowName) {
  const workflowKey = `${WORKFLOW_PREFIX}${workflowName}`;
  const workflowJSON = await redisClient.get(workflowKey);
  if (!workflowJSON) {
    return null;
  }
  return JSON.parse(workflowJSON);
}

async function getAllWorkflows() {
  const keys = await redisClient.keys(`${WORKFLOW_PREFIX}*`);
  if (keys.length === 0) {
    return [];
  }
  const workflowsJSON = await redisClient.mGet(keys);
  return workflowsJSON.map((wf) => JSON.parse(wf));
}

async function registerWorkflowsFromDirectory(directory) {
  logger.info(`Loading workflows from directory: ${directory}`);
  const files = await fs.readdir(directory);
  for (const file of files) {
    if (path.extname(file) === '.json') {
      const filePath = path.join(directory, file);
      try {
        const workflowJson = await fs.readFile(filePath, 'utf8');
        const workflow = JSON.parse(workflowJson);
        await registerWorkflow(workflow);
      } catch (error) {
        logger.error(`Failed to load workflow from ${file}:`, { error });
      }
    }
  }
}

async function executeWorkflow(workflowName, parameters) {
  const executionId = uuidv4();
  logger.info('Attempting to execute workflow', {
    workflowName,
    executionId,
    parameters,
  });

  const workflow = await getWorkflow(workflowName);
  if (!workflow) {
    logger.error('Workflow not found', { workflowName });
    throw new Error(`Workflow '${workflowName}' not found.`);
  }

  const executionKey = `${EXECUTION_PREFIX}${executionId}`;

  try {
    logger.info('Inserting initial execution record into database', {
      executionId,
      workflowName,
    });
    await db.query(
      `INSERT INTO workflow_executions (execution_id, workflow_name, status, parameters)
       VALUES ($1, $2, $3, $4)`,
      [executionId, workflowName, 'running', parameters]
    );

    const executionState = {
      id: executionId,
      workflowName,
      status: 'running',
      startTime: Date.now(),
      steps: {},
    };
    await redisClient.set(executionKey, JSON.stringify(executionState));
    logger.info('Initial execution state saved to Redis', { executionKey });

    const result = await _runWorkflow(workflow, parameters, executionId);

    executionState.status = 'completed';
    executionState.endTime = Date.now();
    executionState.result = result;
    await redisClient.set(executionKey, JSON.stringify(executionState));
    logger.info('Workflow completed, final state saved to Redis', {
      executionKey,
    });

    logger.info('Updating execution record in database to completed', {
      executionId,
    });
    await db.query(
      `UPDATE workflow_executions SET status = 'completed', result = $1 WHERE execution_id = $2`,
      [JSON.stringify(result), executionId]
    );

    return { executionId, result };
  } catch (error) {
    logger.error('Workflow execution failed', {
      executionId,
      workflowName,
      error: error.message,
    });
    const finalState = {
      id: executionId,
      workflowName,
      status: 'failed',
      error: { message: error.message, stack: error.stack },
      endTime: Date.now(),
    };
    await redisClient.set(executionKey, JSON.stringify(finalState));
    logger.info('Failure state saved to Redis', { executionKey });

    logger.info('Updating execution record in database to failed', {
      executionId,
    });
    await db.query(
      `UPDATE workflow_executions SET status = 'failed', error = $1 WHERE execution_id = $2`,
      [
        JSON.stringify({ message: error.message, stack: error.stack }),
        executionId,
      ]
    );
    throw error;
  }
}

async function getWorkflowExecution(executionId) {
  const executionKey = `${EXECUTION_PREFIX}${executionId}`;
  const executionJSON = await redisClient.get(executionKey);
  if (!executionJSON) {
    // If not in Redis, check the database as a source of truth for completed/failed items
    logger.warn('Execution not found in Redis, checking database...', {
      executionId,
    });
    const { rows } = await db.query(
      'SELECT * FROM workflow_executions WHERE execution_id = $1',
      [executionId]
    );
    if (rows.length > 0) {
      logger.info('Execution found in database', { executionId });
      const row = rows[0];
      return {
        id: row.execution_id,
        workflowName: row.workflow_name,
        status: row.status,
        parameters: row.parameters,
        result: row.result,
        error: row.error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    return null;
  }
  return JSON.parse(executionJSON);
}

async function _runWorkflow(workflow, parameters, executionId) {
  const context = { ...parameters };
  const stepResults = {};

  const stepDependencies = new Map(
    workflow.steps.map((step) => [step.id, new Set(step.dependencies || [])])
  );
  const stepStatus = new Map(
    workflow.steps.map((step) => [step.id, 'pending'])
  );

  let stepsToRun = new Set(
    workflow.steps
      .filter((step) => !step.dependencies || step.dependencies.length === 0)
      .map((step) => step.id)
  );

  while (
    stepStatus.size > 0 &&
    (stepsToRun.size > 0 ||
      Array.from(stepStatus.values()).some((s) => s === 'running'))
  ) {
    const readySteps = Array.from(stepsToRun);
    stepsToRun.clear();

    const promises = readySteps.map(async (stepId) => {
      const step = workflow.steps.find((s) => s.id === stepId);
      stepStatus.set(stepId, 'running');

      try {
        const processedParams = _processStepParams(
          step.params,
          stepResults,
          context
        );
        logger.info('Executing step', {
          executionId,
          stepId: step.id,
          tool: step.tool,
        });
        const result = await executeToolProxy(step.tool, processedParams);
        stepResults[step.id] = result;
        stepStatus.set(stepId, 'completed');
        logger.info('Step completed successfully', {
          executionId,
          stepId: step.id,
        });

        // Update dependencies and find next steps
        for (const [sId, deps] of stepDependencies.entries()) {
          if (deps.has(step.id)) {
            deps.delete(step.id);
            if (deps.size === 0 && stepStatus.get(sId) === 'pending') {
              stepsToRun.add(sId);
            }
          }
        }
      } catch (error) {
        logger.error('Step execution failed', {
          executionId,
          stepId: step.id,
          error: error.message,
        });
        stepStatus.set(stepId, 'failed');
        throw new Error(`Step '${step.id}' failed: ${error.message}`);
      }
    });

    await Promise.all(promises);

    // If no new steps are ready to run but some are still pending, there's a dependency issue
    if (
      stepsToRun.size === 0 &&
      Array.from(stepStatus.values()).some((s) => s === 'pending')
    ) {
      const pendingSteps = Array.from(stepStatus.entries())
        .filter(([, s]) => s === 'pending')
        .map(([id]) => id);
      throw new Error(
        `Workflow stuck. Circular or unresolved dependencies for steps: ${pendingSteps.join(', ')}`
      );
    }
  }

  const failedSteps = Array.from(stepStatus.entries()).filter(
    ([, s]) => s === 'failed'
  );
  if (failedSteps.length > 0) {
    throw new Error(
      `Workflow failed. The following steps did not complete: ${failedSteps.map(([id]) => id).join(', ')}`
    );
  }

  // Determine the final result of the workflow
  if (workflow.output) {
    return _processStepParams(workflow.output, stepResults, context);
  }

  return stepResults;
}

function _processStepParams(params, stepResults, context) {
  if (typeof params !== 'object' || params === null) {
    return params;
  }

  const interpolate = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/\${(.*?)}/g, (match, key) => {
      const parts = key.trim().split('.');
      let value;
      if (parts[0] === 'context') {
        value = context;
        parts.slice(1).forEach((p) => (value = value ? value[p] : undefined));
      } else if (parts[0] === 'steps') {
        value = stepResults;
        parts.slice(1).forEach((p) => (value = value ? value[p] : undefined));
      }
      return value !== undefined ? value : match;
    });
  };

  const processValue = (value) => {
    if (typeof value === 'string') {
      return interpolate(value);
    }
    if (Array.isArray(value)) {
      return value.map(processValue);
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, processValue(v)])
      );
    }
    return value;
  };

  return processValue(params);
}

export {
  registerWorkflow,
  getWorkflow,
  getAllWorkflows,
  executeWorkflow,
  registerWorkflowsFromDirectory,
  getWorkflowExecution,
};

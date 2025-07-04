import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import redisClient from './redis-client.js';
import logger from '../logger.js';
import db from './db-client.js';
import { executeToolProxy } from '../tool-proxy.js';
import agentManager from './lib/agents/agent-manager.js';

const WORKFLOW_PREFIX = 'workflow:';
const EXECUTION_PREFIX = 'execution:';
const WORKFLOW_LOCK_PREFIX = 'lock:workflow:';

// Enhanced configuration with performance monitoring and retry logic
const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  maxConcurrentSteps: 10,
  enablePerformanceMonitoring: true,
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 60000,
  performanceThresholds: {
    stepDurationWarning: 10000,
    stepDurationError: 30000,
    memoryUsageWarning: 500 * 1024 * 1024
  }
};

// Circuit breaker state management
const circuitBreakerState = new Map();

/**
 * Enhanced workflow registration with validation and versioning
 */
async function registerWorkflow(workflow, options = {}) {
  const { version = '1.0.0', overwrite = false } = options;
  
  // Validate workflow structure
  const validationResult = validateWorkflow(workflow);
  if (!validationResult.isValid) {
    throw new Error(`Invalid workflow: ${validationResult.errors.join(', ')}`);
  }

  const workflowKey = `${WORKFLOW_PREFIX}${workflow.name}`;
  const versionedKey = `${workflowKey}:${version}`;
  
  // Check if workflow exists and handle versioning
  const existingWorkflow = await redisClient.get(workflowKey);
  if (existingWorkflow && !overwrite) {
    logger.warn(`Workflow '${workflow.name}' already exists. Use overwrite option to replace.`);
    return { success: false, reason: 'Workflow already exists' };
  }

  const enhancedWorkflow = {
    ...workflow,
    version,
    registeredAt: new Date().toISOString(),
    metadata: {
      ...workflow.metadata,
      stepCount: workflow.steps.length,
      estimatedDuration: estimateWorkflowDuration(workflow),
      complexity: calculateWorkflowComplexity(workflow)
    }
  };

  await Promise.all([
    redisClient.set(workflowKey, JSON.stringify(enhancedWorkflow)),
    redisClient.set(versionedKey, JSON.stringify(enhancedWorkflow))
  ]);

  logger.info(`Workflow '${workflow.name}' v${version} registered successfully.`, {
    stepCount: enhancedWorkflow.metadata.stepCount,
    complexity: enhancedWorkflow.metadata.complexity
  });

  return { success: true, version, metadata: enhancedWorkflow.metadata };
}

/**
 * Enhanced workflow retrieval with caching and fallback
 */
async function getWorkflow(workflowName, version = null) {
  const workflowKey = version 
    ? `${WORKFLOW_PREFIX}${workflowName}:${version}`
    : `${WORKFLOW_PREFIX}${workflowName}`;
  
  const workflowJSON = await redisClient.get(workflowKey);
  if (!workflowJSON) {
    // Fallback to database for persistent storage
    const dbResult = await getWorkflowFromDatabase(workflowName, version);
    if (dbResult) {
      // Cache back to Redis
      await redisClient.setex(workflowKey, 3600, JSON.stringify(dbResult));
      return dbResult;
    }
    return null;
  }
  return JSON.parse(workflowJSON);
}

/**
 * Get all workflows with enhanced metadata
 */
async function getAllWorkflows(includeVersions = false) {
  const pattern = includeVersions ? `${WORKFLOW_PREFIX}*` : `${WORKFLOW_PREFIX}*`;
  const keys = await redisClient.keys(pattern);
  
  if (keys.length === 0) {
    return [];
  }

  const workflowsJSON = await redisClient.mGet(keys);
  const workflows = workflowsJSON
    .filter(wf => wf !== null)
    .map(wf => JSON.parse(wf));

  // Filter out versioned workflows if not requested
  if (!includeVersions) {
    return workflows.filter(wf => !wf.version || !keys.some(key => key.includes(`${wf.name}:`)));
  }

  return workflows.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
}

/**
 * Enhanced workflow loading from directory with parallel processing
 */
async function registerWorkflowsFromDirectory(directory, options = {}) {
  const { maxConcurrent = 5, validateOnly = false } = options;
  
  logger.info(`Loading workflows from directory: ${directory}`);
  
  try {
    const files = await fs.readdir(directory);
    const jsonFiles = files.filter(file => path.extname(file) === '.json');
    
    const results = [];
    const semaphore = new Array(maxConcurrent).fill(null);
    
    const processFile = async (file) => {
      const filePath = path.join(directory, file);
      try {
        const workflowJson = await fs.readFile(filePath, 'utf8');
        const workflow = JSON.parse(workflowJson);
        
        if (validateOnly) {
          const validation = validateWorkflow(workflow);
          results.push({ file, valid: validation.isValid, errors: validation.errors });
        } else {
          const result = await registerWorkflow(workflow);
          results.push({ file, success: result.success, ...result });
        }
      } catch (error) {
        logger.error(`Failed to process workflow from ${file}:`, { error: error.message });
        results.push({ file, success: false, error: error.message });
      }
    };

    // Process files with concurrency control
    const chunks = [];
    for (let i = 0; i < jsonFiles.length; i += maxConcurrent) {
      chunks.push(jsonFiles.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(processFile));
    }

    const successful = results.filter(r => r.success || r.valid).length;
    logger.info(`Processed ${jsonFiles.length} workflow files: ${successful} successful`);
    
    return results;
  } catch (error) {
    logger.error(`Failed to read directory ${directory}:`, { error: error.message });
    throw error;
  }
}

/**
 * Enhanced workflow execution with comprehensive monitoring and resilience
 */
async function executeWorkflow(workflowName, parameters, options = {}) {
  const executionId = uuidv4();
  const config = { ...DEFAULT_CONFIG, ...options };
  
  logger.info('Attempting to execute workflow', {
    workflowName,
    executionId,
    parameters: Object.keys(parameters),
    config: { maxRetries: config.maxRetries, timeout: config.timeoutMs }
  });

  // Check circuit breaker
  if (isCircuitBreakerOpen(workflowName)) {
    throw new Error(`Circuit breaker is open for workflow '${workflowName}'. Please try again later.`);
  }

  const workflow = await getWorkflow(workflowName);
  if (!workflow) {
    logger.error('Workflow not found', { workflowName });
    throw new Error(`Workflow '${workflowName}' not found.`);
  }

  // Acquire distributed lock for workflow execution
  const lockKey = `${WORKFLOW_LOCK_PREFIX}${executionId}`;
  const lockAcquired = await redisClient.set(lockKey, executionId, 'PX', config.timeoutMs, 'NX');
  
  if (!lockAcquired) {
    throw new Error('Failed to acquire execution lock. Another execution may be in progress.');
  }

  const executionKey = `${EXECUTION_PREFIX}${executionId}`;
  const startTime = performance.now();

  try {
    // Initialize execution record in database
    await db.query(
      `INSERT INTO workflow_executions (execution_id, workflow_name, status, parameters, started_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [executionId, workflowName, 'running', JSON.stringify(parameters), new Date()]
    );

    const executionState = {
      id: executionId,
      workflowName,
      status: 'running',
      startTime: Date.now(),
      steps: {},
      performance: {
        startTime,
        memoryUsage: process.memoryUsage()
      },
      config
    };
    
    await redisClient.set(executionKey, JSON.stringify(executionState));
    logger.info('Initial execution state saved', { executionKey });

    // Execute workflow with enhanced monitoring
    const result = await _runWorkflowEnhanced(workflow, parameters, executionId, config);

    const endTime = performance.now();
    const duration = endTime - startTime;

    executionState.status = 'completed';
    executionState.endTime = Date.now();
    executionState.result = result;
    executionState.performance.duration = duration;
    executionState.performance.endMemoryUsage = process.memoryUsage();
    
    await redisClient.set(executionKey, JSON.stringify(executionState));

    // Update database record
    await db.query(
      `UPDATE workflow_executions 
       SET status = 'completed', result = $1, completed_at = $2, duration_ms = $3 
       WHERE execution_id = $4`,
      [JSON.stringify(result), new Date(), Math.round(duration), executionId]
    );

    // Record successful execution for circuit breaker
    recordCircuitBreakerSuccess(workflowName);

    logger.info('Workflow completed successfully', {
      executionId,
      duration: Math.round(duration),
      memoryDelta: executionState.performance.endMemoryUsage.heapUsed - executionState.performance.memoryUsage.heapUsed
    });

    return { executionId, result, duration, performance: executionState.performance };

  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.error('Workflow execution failed', {
      executionId,
      workflowName,
      error: error.message,
      duration: Math.round(duration)
    });

    // Record failure for circuit breaker
    recordCircuitBreakerFailure(workflowName);

    const finalState = {
      id: executionId,
      workflowName,
      status: 'failed',
      error: { message: error.message, stack: error.stack },
      endTime: Date.now(),
      performance: { duration }
    };
    
    await redisClient.set(executionKey, JSON.stringify(finalState));

    // Update database record
    await db.query(
      `UPDATE workflow_executions 
       SET status = 'failed', error = $1, completed_at = $2, duration_ms = $3 
       WHERE execution_id = $4`,
      [JSON.stringify({ message: error.message, stack: error.stack }), new Date(), Math.round(duration), executionId]
    );

    throw error;
  } finally {
    // Release distributed lock
    await redisClient.del(lockKey);
  }
}

/**
 * Enhanced workflow execution with improved step management and monitoring
 */
async function _runWorkflowEnhanced(workflow, parameters, executionId, config) {
  const context = { ...parameters };
  const stepResults = {};
  const stepPerformance = new Map();
  
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

  const semaphore = new Array(config.maxConcurrentSteps).fill(null);
  let activePromises = new Set();

  while (
    stepStatus.size > 0 &&
    (stepsToRun.size > 0 || activePromises.size > 0 ||
      Array.from(stepStatus.values()).some((s) => s === 'running'))
  ) {
    const readySteps = Array.from(stepsToRun).slice(0, config.maxConcurrentSteps - activePromises.size);
    stepsToRun = new Set(Array.from(stepsToRun).slice(readySteps.length));

    const stepPromises = readySteps.map(async (stepId) => {
      const step = workflow.steps.find((s) => s.id === stepId);
      stepStatus.set(stepId, 'running');

      const stepStartTime = performance.now();
      const stepMemBefore = process.memoryUsage();

      try {
        const processedParams = _processStepParams(step.params, stepResults, context);
        
        logger.info('Executing step', {
          executionId,
          stepId: step.id,
          tool: step.tool || step.toolId,
          attempt: 1
        });

        let result;

        if (step.type === 'a2a_message') {
          // Handle A2A message step
          const { senderAgentId, receiverAgentId, messageContent, conversationId } = processedParams;
          if (!senderAgentId || !receiverAgentId || !messageContent) {
            throw new Error('A2A message step requires senderAgentId, receiverAgentId, and messageContent.');
          }
          result = await agentManager.sendMessageToAgent(senderAgentId, receiverAgentId, messageContent, conversationId);
          if (!result.success) {
            throw new Error(result.error);
          }
        } else {
          // Existing tool execution logic
          result = await executeStepWithRetry(
            step.tool || step.toolId, 
            processedParams, 
            config,
            executionId,
            step.id
          );
        }

        stepResults[step.id] = result;
        stepStatus.set(step.id, 'completed');
        
        // Record step performance
        stepPerformance.set(step.id, {
          duration: stepDuration,
          memoryDelta: stepMemAfter.heapUsed - stepMemBefore.heapUsed,
          startTime: stepStartTime,
          endTime: stepEndTime
        });

        // Check performance thresholds
        if (stepDuration > config.performanceThresholds.stepDurationWarning) {
          logger.warn('Step execution exceeded warning threshold', {
            executionId,
            stepId: step.id,
            duration: Math.round(stepDuration),
            threshold: config.performanceThresholds.stepDurationWarning
          });
        }

        logger.info('Step completed successfully', {
          executionId,
          stepId: step.id,
          duration: Math.round(stepDuration)
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

        return { stepId, success: true };

      } catch (error) {
        const stepEndTime = performance.now();
        const stepDuration = stepEndTime - stepStartTime;

        logger.error('Step execution failed', {
          executionId,
          stepId: step.id,
          error: error.message,
          duration: Math.round(stepDuration)
        });

        stepStatus.set(stepId, 'failed');
        stepPerformance.set(step.id, {
          duration: stepDuration,
          error: error.message,
          startTime: stepStartTime,
          endTime: stepEndTime
        });

        throw new Error(`Step '${step.id}' failed: ${error.message}`);
      }
    });

    // Wait for current batch of steps to complete
    const results = await Promise.allSettled(stepPromises);
    
    // Check for failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      throw failures[0].reason;
    }

    // Handle circular dependencies
    if (
      stepsToRun.size === 0 &&
      activePromises.size === 0 &&
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

  // Check for failed steps
  const failedSteps = Array.from(stepStatus.entries()).filter(([, s]) => s === 'failed');
  if (failedSteps.length > 0) {
    throw new Error(
      `Workflow failed. The following steps did not complete: ${failedSteps.map(([id]) => id).join(', ')}`
    );
  }

  // Determine the final result of the workflow
  const finalResult = workflow.output 
    ? _processStepParams(workflow.output, stepResults, context)
    : stepResults;

  // Add performance metadata to result
  return {
    ...finalResult,
    _metadata: {
      executionId,
      stepPerformance: Object.fromEntries(stepPerformance),
      totalSteps: workflow.steps.length,
      completedSteps: Array.from(stepStatus.values()).filter(s => s === 'completed').length
    }
  };
}

/**
 * Execute step with retry logic and circuit breaker
 */
async function executeStepWithRetry(toolId, params, config, executionId, stepId) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        executeToolProxy(toolId, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Step execution timeout')), config.timeoutMs)
        )
      ]);
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < config.maxRetries) {
        const delay = config.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
        logger.warn(`Step ${stepId} failed on attempt ${attempt + 1}, retrying in ${delay}ms...`, { 
          error: error.message,
          executionId
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  throw lastError;
}

/**
 * Enhanced workflow execution retrieval with caching
 */
async function getWorkflowExecution(executionId) {
  const executionKey = `${EXECUTION_PREFIX}${executionId}`;
  const executionJSON = await redisClient.get(executionKey);
  
  if (!executionJSON) {
    logger.warn('Execution not found in Redis, checking database...', { executionId });
    
    const { rows } = await db.query(
      'SELECT * FROM workflow_executions WHERE execution_id = $1',
      [executionId]
    );
    
    if (rows.length > 0) {
      const row = rows[0];
      const execution = {
        id: row.execution_id,
        workflowName: row.workflow_name,
        status: row.status,
        parameters: row.parameters,
        result: row.result,
        error: row.error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        durationMs: row.duration_ms
      };
      
      // Cache back to Redis for future requests
      await redisClient.setex(executionKey, 3600, JSON.stringify(execution));
      return execution;
    }
    return null;
  }
  
  return JSON.parse(executionJSON);
}

/**
 * Enhanced parameter processing with better error handling
 */
function _processStepParams(params, stepResults, context) {
  if (typeof params !== 'object' || params === null) {
    return params;
  }

  const interpolate = (str) => {
    if (typeof str !== 'string') return str;
    
    try {
      return str.replace(/\${(.*?)}/g, (match, key) => {
        const parts = key.trim().split('.');
        let value;
        
        if (parts[0] === 'context') {
          value = context;
          parts.slice(1).forEach((p) => {
            value = value && typeof value === 'object' ? value[p] : undefined;
          });
        } else if (parts[0] === 'steps') {
          value = stepResults;
          parts.slice(1).forEach((p) => {
            value = value && typeof value === 'object' ? value[p] : undefined;
          });
        }
        
        return value !== undefined ? value : match;
      });
    } catch (error) {
      logger.warn('Error during parameter interpolation', { error: error.message, str });
      return str;
    }
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

/**
 * Workflow validation utility
 */
function validateWorkflow(workflow) {
  const errors = [];
  
  if (!workflow.name) {
    errors.push('Workflow name is required');
  }
  
  if (!workflow.steps || !Array.isArray(workflow.steps)) {
    errors.push('Workflow must have steps array');
  } else {
    const stepIds = new Set();
    
    workflow.steps.forEach((step, index) => {
      if (!step.id) {
        errors.push(`Step at index ${index} missing id`);
      } else if (stepIds.has(step.id)) {
        errors.push(`Duplicate step id: ${step.id}`);
      } else {
        stepIds.add(step.id);
      }
      
      if (step.type === 'a2a_message') {
        // Validate A2A message specific parameters
        if (!step.params || !step.params.senderAgentId || !step.params.receiverAgentId || !step.params.messageContent) {
          errors.push(`A2A message step ${step.id} requires senderAgentId, receiverAgentId, and messageContent in its params.`);
        }
      } else if (!step.tool && !step.toolId) {
        errors.push(`Step ${step.id} missing tool/toolId`);
      }
      
      // Validate dependencies
      if (step.dependencies) {
        step.dependencies.forEach(depId => {
          if (!stepIds.has(depId) && !workflow.steps.some(s => s.id === depId)) {
            errors.push(`Step ${step.id} has invalid dependency: ${depId}`);
          }
        });
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Estimate workflow duration based on step complexity
 */
function estimateWorkflowDuration(workflow) {
  const baseStepTime = 1000; // 1 second base time per step
  const complexityMultiplier = {
    'simple': 1,
    'medium': 2,
    'complex': 5
  };
  
  return workflow.steps.reduce((total, step) => {
    const complexity = step.complexity || 'simple';
    return total + (baseStepTime * (complexityMultiplier[complexity] || 1));
  }, 0);
}

/**
 * Calculate workflow complexity score
 */
function calculateWorkflowComplexity(workflow) {
  const stepCount = workflow.steps.length;
  const dependencyCount = workflow.steps.reduce((total, step) => 
    total + (step.dependencies ? step.dependencies.length : 0), 0);
  
  if (stepCount <= 3 && dependencyCount <= 2) return 'simple';
  if (stepCount <= 10 && dependencyCount <= 8) return 'medium';
  return 'complex';
}

/**
 * Circuit breaker implementation
 */
function isCircuitBreakerOpen(workflowName) {
  const state = circuitBreakerState.get(workflowName);
  if (!state) return false;
  
  if (state.state === 'open') {
    if (Date.now() - state.lastFailureTime > DEFAULT_CONFIG.circuitBreakerResetTime) {
      state.state = 'half-open';
      state.failureCount = 0;
      return false;
    }
    return true;
  }
  
  return false;
}

function recordCircuitBreakerFailure(workflowName) {
  const state = circuitBreakerState.get(workflowName) || {
    state: 'closed',
    failureCount: 0,
    lastFailureTime: 0
  };
  
  state.failureCount++;
  state.lastFailureTime = Date.now();
  
  if (state.failureCount >= DEFAULT_CONFIG.circuitBreakerThreshold) {
    state.state = 'open';
    logger.warn(`Circuit breaker opened for workflow: ${workflowName}`);
  }
  
  circuitBreakerState.set(workflowName, state);
}

function recordCircuitBreakerSuccess(workflowName) {
  const state = circuitBreakerState.get(workflowName);
  if (state) {
    state.failureCount = 0;
    state.state = 'closed';
    circuitBreakerState.set(workflowName, state);
  }
}

/**
 * Get workflow from database fallback
 */
async function getWorkflowFromDatabase(workflowName, version) {
  try {
    const query = version 
      ? 'SELECT * FROM workflows WHERE name = $1 AND version = $2'
      : 'SELECT * FROM workflows WHERE name = $1 ORDER BY created_at DESC LIMIT 1';
    
    const params = version ? [workflowName, version] : [workflowName];
    const { rows } = await db.query(query, params);
    
    return rows.length > 0 ? JSON.parse(rows[0].definition) : null;
  } catch (error) {
    logger.error('Failed to retrieve workflow from database', { error: error.message });
    return null;
  }
}

export {
  registerWorkflow,
  getWorkflow,
  getAllWorkflows,
  executeWorkflow,
  registerWorkflowsFromDirectory,
  getWorkflowExecution,
  validateWorkflow,
  DEFAULT_CONFIG
};

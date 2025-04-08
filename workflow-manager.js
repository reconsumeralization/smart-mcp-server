import { executeToolProxy } from './tool-proxy.js';
import { EventEmitter } from 'events';

// Track workflow execution status and results
class WorkflowExecution extends EventEmitter {
  constructor(workflowId, steps) {
    super();
    this.workflowId = workflowId;
    this.steps = steps;
    this.results = {};
    this.status = 'pending';
    this.errors = [];
    this.pendingSteps = new Set();
    this.completedSteps = new Set();
  }

  setStepResult(stepId, result) {
    this.results[stepId] = result;
    this.completedSteps.add(stepId);
    this.pendingSteps.delete(stepId);
    this.emit('stepCompleted', { stepId, result });

    if (this.pendingSteps.size === 0) {
      this.status = this.errors.length > 0 ? 'failed' : 'completed';
      this.emit('completed', {
        status: this.status,
        results: this.results,
        errors: this.errors,
      });
    }
  }

  setStepError(stepId, error) {
    this.errors.push({ stepId, error });
    this.pendingSteps.delete(stepId);
    this.emit('stepError', { stepId, error });

    // Continue execution unless configured to stop on error
    if (this.pendingSteps.size === 0) {
      this.status = 'failed';
      this.emit('completed', {
        status: this.status,
        results: this.results,
        errors: this.errors,
      });
    }
  }
}

class WorkflowManager {
  constructor() {
    this.workflows = new Map();
    this.executions = new Map();
  }

  /**
   * Register a workflow definition
   * @param {Object} workflow - Workflow definition
   * @param {string} workflow.id - Unique workflow identifier
   * @param {Object[]} workflow.steps - Workflow steps
   * @param {string} workflow.steps[].id - Step identifier
   * @param {string} workflow.steps[].toolId - Tool identifier to execute
   * @param {Object} workflow.steps[].params - Parameters for the tool
   * @param {string[]} [workflow.steps[].dependencies] - IDs of steps this step depends on
   * @param {number} [workflow.concurrencyLimit] - Maximum number of steps to run in parallel
   */
  registerWorkflow(workflow) {
    if (!workflow.id) {
      throw new Error('Workflow must have an ID');
    }
    
    if (!Array.isArray(workflow.steps)) {
      throw new Error('Workflow must have steps array');
    }
    
    // Validate that all dependencies exist
    for (const step of workflow.steps) {
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          const depExists = workflow.steps.some(s => s.id === depId);
          if (!depExists) {
            throw new Error(`Step ${step.id} has dependency ${depId} which does not exist`);
          }
        }
      }
    }
    
    this.workflows.set(workflow.id, {
      ...workflow,
      concurrencyLimit: workflow.concurrencyLimit || 5 // Default concurrency limit
    });
    
    return workflow.id;
  }

  /**
   * Execute a registered workflow
   * @param {string} workflowId - ID of the workflow to execute
   * @param {Object} context - Context data to pass to the workflow
   * @returns {Promise<Object>} - Results of the workflow execution
   */
  async executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = `${workflowId}-${Date.now()}`;
    const execution = new WorkflowExecution(executionId, workflow.steps);
    this.executions.set(executionId, execution);

    // Create a promise that resolves when the workflow completes
    const executionPromise = new Promise((resolve, reject) => {
      execution.once('completed', (result) => {
        if (result.status === 'failed') {
          reject(new Error(`Workflow execution failed: ${JSON.stringify(result.errors)}`));
        } else {
          resolve(result);
        }
      });
    });

    // Start workflow execution
    this._executeWorkflowSteps(workflow, execution, context);

    return executionPromise;
  }

  /**
   * Internal method to execute workflow steps with dependency resolution
   */
  _executeWorkflowSteps(workflow, execution, context) {
    // Build dependency graph
    const dependencyGraph = new Map();
    const readySteps = [];
    
    for (const step of workflow.steps) {
      const dependencies = step.dependencies || [];
      dependencyGraph.set(step.id, {
        step,
        dependencies: new Set(dependencies),
        dependents: new Set(),
      });
      
      if (dependencies.length === 0) {
        readySteps.push(step);
      }
    }
    
    // Build reverse dependency graph (dependents)
    for (const [stepId, node] of dependencyGraph) {
      for (const depId of node.dependencies) {
        const depNode = dependencyGraph.get(depId);
        depNode.dependents.add(stepId);
      }
    }
    
    // Set initial pending steps
    for (const step of workflow.steps) {
      execution.pendingSteps.add(step.id);
    }
    
    // Execute steps with no dependencies first
    const activePromises = new Set();
    this._executeReadySteps(workflow, execution, readySteps, dependencyGraph, activePromises, context);
  }

  /**
   * Execute steps that are ready (all dependencies met)
   */
  async _executeReadySteps(workflow, execution, readySteps, dependencyGraph, activePromises, context) {
    // Process all ready steps within concurrency limit
    while (readySteps.length > 0 && activePromises.size < workflow.concurrencyLimit) {
      const step = readySteps.shift();
      
      // Skip steps that may have been added multiple times
      if (execution.completedSteps.has(step.id)) {
        continue;
      }
      
      // Execute step
      const stepPromise = this._executeStep(step, execution, context)
        .then(() => {
          activePromises.delete(stepPromise);
          
          // Mark dependencies as satisfied for dependent steps
          const node = dependencyGraph.get(step.id);
          for (const dependentId of node.dependents) {
            const dependentNode = dependencyGraph.get(dependentId);
            dependentNode.dependencies.delete(step.id);
            
            // If all dependencies are satisfied, add to ready steps
            if (dependentNode.dependencies.size === 0 && 
                !execution.completedSteps.has(dependentId) &&
                !readySteps.some(s => s.id === dependentId)) {
              readySteps.push(dependentNode.step);
            }
          }
          
          // Process more steps if available
          if (readySteps.length > 0) {
            this._executeReadySteps(workflow, execution, readySteps, dependencyGraph, activePromises, context);
          }
        });
      
      activePromises.add(stepPromise);
    }
    
    // If we hit concurrency limit, wait for some promises to resolve
    if (readySteps.length > 0 && activePromises.size >= workflow.concurrencyLimit) {
      Promise.race(activePromises).then(() => {
        this._executeReadySteps(workflow, execution, readySteps, dependencyGraph, activePromises, context);
      });
    }
  }

  /**
   * Execute a single workflow step
   */
  async _executeStep(step, execution, context) {
    try {
      // Prepare parameters by interpolating with context and previous results
      const processedParams = this._processStepParams(step.params, execution.results, context);
      
      console.log(`Executing step ${step.id} with tool ${step.toolId}`);
      const result = await executeToolProxy(step.toolId, processedParams);
      
      execution.setStepResult(step.id, result);
      return result;
    } catch (error) {
      console.error(`Error executing step ${step.id}:`, error);
      execution.setStepError(step.id, error.message || String(error));
      throw error;
    }
  }

  /**
   * Process step parameters, interpolating with context values and previous step results
   * Supports syntax like ${context.value} or ${steps.stepId.resultProperty}
   */
  _processStepParams(params, stepResults, context) {
    if (!params) return {};
    
    // Helper to handle interpolation
    const interpolate = (str) => {
      if (typeof str !== 'string') return str;
      
      return str.replace(/\${([^}]+)}/g, (match, path) => {
        const parts = path.trim().split('.');
        if (parts[0] === 'context') {
          // Access context values
          let value = context;
          for (let i = 1; i < parts.length; i++) {
            if (value === undefined) return match;
            value = value[parts[i]];
          }
          return value !== undefined ? value : match;
        } else if (parts[0] === 'steps') {
          // Access previous step results
          if (parts.length < 2) return match;
          const stepId = parts[1];
          const result = stepResults[stepId];
          if (result === undefined) return match;
          
          let value = result;
          for (let i = 2; i < parts.length; i++) {
            if (value === undefined) return match;
            value = value[parts[i]];
          }
          return value !== undefined ? value : match;
        }
        return match;
      });
    };
    
    // Recursively process all parameter values
    const processValue = (value) => {
      if (typeof value === 'string') {
        return interpolate(value);
      } else if (Array.isArray(value)) {
        return value.map(processValue);
      } else if (value !== null && typeof value === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
          result[k] = processValue(v);
        }
        return result;
      }
      return value;
    };
    
    return processValue(params);
  }
}

export {
  WorkflowManager,
  WorkflowExecution
}; 
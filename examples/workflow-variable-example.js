/**
 * Workflow Variable Example
 * 
 * This script demonstrates how to use dynamic variables in workflows
 */

const { WorkflowTester } = require('../workflow-monitor');
const path = require('path');

// Simple variable store implementation
class VariableStore {
  constructor(initialVariables = {}) {
    this.variables = { ...initialVariables };
    this.outputCaptures = new Map();
  }

  // Get a variable value
  get(name, defaultValue = null) {
    return this.variables[name] !== undefined ? this.variables[name] : defaultValue;
  }

  // Set a variable value
  set(name, value) {
    this.variables[name] = value;
    return value;
  }

  // Register a step output to be captured as a variable
  captureOutput(stepId, variableName) {
    this.outputCaptures.set(stepId, variableName);
  }

  // Process a step result and capture outputs if configured
  processStepResult(stepId, result) {
    if (this.outputCaptures.has(stepId)) {
      const variableName = this.outputCaptures.get(stepId);
      this.set(variableName, result);
      console.log(`Captured output from step ${stepId} to variable ${variableName}`);
    }
  }

  // Substitute variables in a string using ${variable} syntax
  substituteInString(template) {
    return template.replace(/\${([^}]+)}/g, (match, varName) => {
      const value = this.get(varName);
      return value !== null ? value : match;
    });
  }

  // Process an object recursively to substitute variables
  substitute(obj) {
    if (typeof obj === 'string') {
      return this.substituteInString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.substitute(item));
    } else if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        result[key] = this.substitute(obj[key]);
      }
      return result;
    }
    return obj;
  }

  // Evaluate a simple condition string
  evaluateCondition(condition) {
    // Very simple evaluator - in real implementation, use a proper expression parser
    try {
      // Substitute variables in the condition
      const substitutedCondition = this.substituteInString(condition);
      
      // For demo, we'll just eval the expression (not recommended for production)
      // eslint-disable-next-line no-eval
      return eval(substitutedCondition);
    } catch (error) {
      console.error(`Error evaluating condition "${condition}": ${error.message}`);
      return false;
    }
  }
}

// Extended WorkflowTester with variable support
class VariableWorkflowTester extends WorkflowTester {
  constructor(config = {}) {
    super(config);
    this.variableStore = new VariableStore(config.initialVariables || {});
  }

  // Override execute step to support variables
  async executeStep(step, workflowState, testRunId) {
    // Check if step has a condition and if it evaluates to false, skip it
    if (step.condition && !this.variableStore.evaluateCondition(step.condition)) {
      console.log(`Skipping step ${step.id} because condition "${step.condition}" is false`);
      workflowState.stepResults.set(step.id, {
        status: 'skipped',
        result: null,
        timeTaken: 0
      });
      return { success: true, result: null };
    }

    // Substitute variables in step parameters
    const originalParams = step.params;
    step.params = this.variableStore.substitute(step.params);
    
    console.log(`Executing step ${step.id} with substituted params:`, 
      JSON.stringify(step.params, null, 2));
    
    // Execute the step with substituted parameters
    const result = await super.executeStep(step, workflowState, testRunId);
    
    // Restore original params to avoid modifying the original workflow definition
    step.params = originalParams;
    
    // Process the step result to capture outputs
    if (result.success) {
      this.variableStore.processStepResult(step.id, result.result);
    }
    
    return result;
  }

  // Set a variable
  setVariable(name, value) {
    return this.variableStore.set(name, value);
  }

  // Get a variable
  getVariable(name, defaultValue = null) {
    return this.variableStore.get(name, defaultValue);
  }

  // Configure output capture
  captureOutput(stepId, variableName) {
    this.variableStore.captureOutput(stepId, variableName);
  }

  // Get all current variables
  getAllVariables() {
    return { ...this.variableStore.variables };
  }
}

async function runVariableWorkflowExample() {
  try {
    // Create the variable workflow tester with initial variables
    const tester = new VariableWorkflowTester({
      logDirectory: './logs/variable-workflow',
      metricsDirectory: './metrics/variable-workflow',
      reportsDirectory: './reports/variable-workflow',
      initialVariables: {
        environment: 'development',
        apiBaseUrl: 'https://api.example.com',
        maxRetries: 3,
        enableDebug: true
      }
    });

    console.log('Variable workflow tester initialized');
    console.log('Initial variables:', tester.getAllVariables());

    // Load the test workflow
    const workflow = {
      id: "variable-demo-workflow",
      description: "Demonstrates using variables in workflows",
      concurrencyLimit: 2,
      steps: [
        {
          id: "configure-environment",
          toolId: "mcp_sequential_thinking_sequentialthinking",
          params: {
            thought: "Setting up the ${environment} environment with base URL ${apiBaseUrl}",
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false
          }
        },
        {
          id: "conditional-debug-step",
          toolId: "mcp_sequential_thinking_sequentialthinking",
          condition: "${enableDebug} === true",
          params: {
            thought: "This step only runs when debugging is enabled. Current retry setting: ${maxRetries}",
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false
          }
        },
        {
          id: "update-variables",
          toolId: "mcp_sequential_thinking_sequentialthinking",
          params: {
            thought: "Updating configuration based on environment",
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false
          }
        },
        {
          id: "conditional-prod-step",
          toolId: "mcp_sequential_thinking_sequentialthinking",
          condition: "${environment} === 'production'",
          params: {
            thought: "This step only runs in production environment",
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false
          }
        }
      ]
    };

    // Configure to capture the output of the update-variables step
    tester.captureOutput('update-variables', 'updatedConfig');

    // Execute the workflow with variable substitution
    console.log('\n=== Running workflow with variable substitution ===');
    const result = await tester.executeWorkflow(workflow);

    console.log(`Workflow execution ${result.success ? 'succeeded' : 'failed'}`);
    console.log(`Test run ID: ${result.testRunId}`);
    console.log(`Time taken: ${result.timeTaken.toFixed(2)}ms`);

    // Update a variable mid-execution and run again
    console.log('\n=== Updating variables and running again ===');
    tester.setVariable('environment', 'production');
    tester.setVariable('enableDebug', false);
    
    console.log('Updated variables:', tester.getAllVariables());
    
    const secondResult = await tester.executeWorkflow(workflow);
    
    console.log(`Second workflow execution ${secondResult.success ? 'succeeded' : 'failed'}`);
    console.log(`Test run ID: ${secondResult.testRunId}`);
    console.log(`Time taken: ${secondResult.timeTaken.toFixed(2)}ms`);

    // Generate a comparison report
    console.log('\n=== Generating comparison report between runs ===');
    const comparisonReport = tester.generateComparisonReport(
      [result.testRunId, secondResult.testRunId],
      'variable_workflow_comparison'
    );

    console.log('\nWorkflow variable testing complete. Check the logs, metrics, and reports directories for detailed results.');
    
  } catch (error) {
    console.error('Error running variable workflow example:', error);
  }
}

// Run the example
runVariableWorkflowExample().catch(console.error); 
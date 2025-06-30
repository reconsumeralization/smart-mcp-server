/* eslint-disable no-console */
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name (ESM workaround)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server URL
const SERVER_URL = 'http://localhost:3000';

/**
 * Register a workflow from a JSON file
 * @param {string} filename - JSON file with workflow definition
 */
async function registerWorkflow(filename) {
  try {
    // Read workflow definition
    const filePath = path.join(__dirname, filename);
    const workflowData = await fs.readFile(filePath, 'utf8');
    const workflow = JSON.parse(workflowData);

    console.log(`Registering workflow ${workflow.id}...`);

    // Register workflow
    const response = await fetch(`${SERVER_URL}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`Workflow registered successfully: ${result.id}`);
      return result;
    } else {
      console.error(`Failed to register workflow: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error('Error registering workflow:', error);
    return null;
  }
}

/**
 * Execute a workflow with context
 * @param {string} workflowId - ID of the workflow to execute
 * @param {Object} context - Context data to pass to the workflow
 */
async function executeWorkflow(workflowId, context) {
  try {
    console.log(`Executing workflow ${workflowId}...`);

    // Execute workflow
    const response = await fetch(
      `${SERVER_URL}/api/workflows/${workflowId}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`Workflow execution started: ${result.executionId}`);
      return result;
    } else {
      console.error(`Failed to execute workflow: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error('Error executing workflow:', error);
    return null;
  }
}

/**
 * Check workflow execution status
 * @param {string} executionId - ID of the workflow execution
 */
async function checkExecutionStatus(executionId) {
  try {
    console.log(`Checking execution status for ${executionId}...`);

    // Get execution status
    const response = await fetch(
      `${SERVER_URL}/api/workflows/executions/${executionId}`
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`Execution status: ${result.status}`);
      console.log(
        `Completed steps: ${result.completedSteps.join(', ') || 'none'}`
      );
      console.log(`Pending steps: ${result.pendingSteps.join(', ') || 'none'}`);

      if (result.errors.length > 0) {
        console.log('Errors:');
        for (const error of result.errors) {
          console.log(`  ${error.stepId}: ${error.error}`);
        }
      }

      return result;
    } else {
      console.error(`Failed to get execution status: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error('Error checking execution status:', error);
    return null;
  }
}

/**
 * Poll execution status until complete
 * @param {string} executionId - ID of the workflow execution
 * @param {number} interval - Polling interval in ms
 * @param {number} timeout - Max time to poll in ms
 */
async function pollExecutionUntilComplete(
  executionId,
  interval = 1000,
  timeout = 60000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await checkExecutionStatus(executionId);

    if (!status) {
      console.log('Failed to get status, stopping polling');
      return null;
    }

    if (status.status === 'completed' || status.status === 'failed') {
      console.log(`Execution ${status.status}`);
      return status;
    }

    console.log(`Execution in progress, waiting ${interval}ms...`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  console.log('Polling timed out');
  return null;
}

// Main function to run the example
async function runExample() {
  // Register web search workflow
  const workflow = await registerWorkflow('web-search-workflow.json');

  if (workflow) {
    // Execute workflow with context
    const execution = await executeWorkflow(workflow.id, {
      query: 'climate change solutions',
    });

    if (execution) {
      // Poll until complete
      await pollExecutionUntilComplete(execution.executionId, 2000, 120000);
    }
  }
}

// Run the example
runExample().catch(console.error);

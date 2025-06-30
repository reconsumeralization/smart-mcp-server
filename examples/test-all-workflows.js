/* eslint-disable no-console */
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { WorkflowTester as _WorkflowTester } from '../workflow-monitor.js';

// Get directory name (ESM workaround)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server URL
const SERVER_URL = 'http://localhost:3000';

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Load workflow definition from a JSON file
 * @param {string} filename - JSON file with workflow definition
 */
async function loadWorkflow(filename) {
  try {
    const filePath = path.join(__dirname, filename);
    const workflowData = await fs.readFile(filePath, 'utf8');
    return JSON.parse(workflowData);
  } catch (error) {
    console.error(`Error loading workflow from ${filename}:`, error);
    return null;
  }
}

/**
 * List all available workflow example files
 */
async function listWorkflowExamples() {
  try {
    const files = await fs.readdir(__dirname);
    return files.filter((file) => file.endsWith('.json'));
  } catch (error) {
    console.error('Error listing workflow examples:', error);
    return [];
  }
}

/**
 * Register a workflow with the server
 * @param {Object} workflow - Workflow definition
 */
async function registerWorkflow(workflow) {
  try {
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
    // Get execution status
    const response = await fetch(
      `${SERVER_URL}/api/workflows/executions/${executionId}`
    );

    const result = await response.json();

    if (response.ok) {
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
 * Display detailed execution status with progress bar
 * @param {Object} status - Execution status object
 */
function displayExecutionStatus(status) {
  const totalSteps = status.completedSteps.length + status.pendingSteps.length;
  const completedPercentage = Math.round(
    (status.completedSteps.length / totalSteps) * 100
  );

  const barLength = 30;
  const completedBars = Math.round((completedPercentage / 100) * barLength);
  const progressBar =
    '█'.repeat(completedBars) + '░'.repeat(barLength - completedBars);

  console.clear();
  console.log('='.repeat(60));
  console.log(`WORKFLOW EXECUTION STATUS: ${status.status.toUpperCase()}`);
  console.log('='.repeat(60));
  console.log(`Progress: ${progressBar} ${completedPercentage}%`);
  console.log(`Execution ID: ${status.executionId}`);
  console.log(`Completed Steps: ${status.completedSteps.length}/${totalSteps}`);
  console.log('-'.repeat(60));

  // Display completed steps
  if (status.completedSteps.length > 0) {
    console.log('\nCOMPLETED STEPS:');
    status.completedSteps.forEach((stepId) => {
      console.log(`  ✓ ${stepId}`);
    });
  }

  // Display pending steps
  if (status.pendingSteps.length > 0) {
    console.log('\nPENDING STEPS:');
    status.pendingSteps.forEach((stepId) => {
      console.log(`  ⋯ ${stepId}`);
    });
  }

  // Display errors if any
  if (status.errors.length > 0) {
    console.log('\nERRORS:');
    status.errors.forEach((error) => {
      console.log(`  ✗ ${error.stepId}: ${error.error}`);
    });
  }

  // Show final results if completed and has comprehensive-report
  if (status.status === 'completed' && status.results['comprehensive-report']) {
    console.log('\nFINAL REPORT:');
    console.log('-'.repeat(60));
    console.log(status.results['comprehensive-report'].thought);
  }

  console.log('='.repeat(60));
}

/**
 * Poll execution status until complete
 * @param {string} executionId - ID of the workflow execution
 * @param {number} interval - Polling interval in ms
 * @param {number} timeout - Max time to poll in ms
 */
async function pollExecutionUntilComplete(
  executionId,
  interval = 2000,
  timeout = 600000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await checkExecutionStatus(executionId);

    if (!status) {
      console.log('Failed to get status, stopping polling');
      return null;
    }

    displayExecutionStatus(status);

    if (status.status === 'completed' || status.status === 'failed') {
      console.log(`\nExecution ${status.status}`);
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  console.log('Polling timed out after', timeout / 1000, 'seconds');
  return null;
}

/**
 * Interactive workflow selector
 * @returns {Promise<string>} Selected workflow filename
 */
async function selectWorkflow() {
  const examples = await listWorkflowExamples();

  if (examples.length === 0) {
    console.error('No workflow examples found!');
    return null;
  }

  console.log('\n=== Available Workflow Examples ===');
  examples.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });

  const selection = await question('\nSelect a workflow to run (number): ');
  const index = parseInt(selection, 10) - 1;

  if (isNaN(index) || index < 0 || index >= examples.length) {
    console.error('Invalid selection!');
    return null;
  }

  return examples[index];
}

/**
 * Get context parameters for workflow
 * @param {Object} workflow - Workflow definition
 * @returns {Promise<Object>} Context parameters
 */
async function getWorkflowContext(workflow) {
  const context = {};

  console.log('\n=== Enter Context Parameters ===');

  // Determine required context parameters based on workflow
  const workflowId = workflow.id;

  if (workflowId.includes('research') || workflowId.includes('web-research')) {
    context.topic = await question('Enter research topic: ');
    const language = await question(
      'Enter programming language (default: javascript): '
    );
    if (language) context.programmingLanguage = language;
  } else if (workflowId.includes('document')) {
    context.documentUrl = await question('Enter document URL: ');
    context.documentTitle = await question('Enter document title: ');
    const topic = await question('Enter document topic (optional): ');
    if (topic) context.topic = topic;
  } else if (workflowId.includes('data')) {
    context.dataSource = await question('Enter data source: ');
    context.dataType = await question('Enter data type: ');
  } else if (workflowId.includes('github')) {
    context.searchTerm = await question('Enter GitHub search term: ');
    context.codeQuery = await question('Enter code query (optional): ');
    context.issueQuery = await question('Enter issue query (optional): ');
  }

  console.log('\nContext parameters:', context);
  return context;
}

/**
 * Main function to run the workflow testing
 */
async function runWorkflowTest() {
  try {
    console.log('\n=== Smart MCP Server Workflow Tester ===\n');

    // Step 1: Select workflow
    const selectedWorkflow = await selectWorkflow();
    if (!selectedWorkflow) {
      console.log('Workflow selection cancelled');
      rl.close();
      return;
    }

    // Step 2: Load workflow definition
    const workflow = await loadWorkflow(selectedWorkflow);
    if (!workflow) {
      console.log('Failed to load workflow');
      rl.close();
      return;
    }

    // Step 3: Get context parameters
    const context = await getWorkflowContext(workflow);

    // Step 4: Register workflow
    const registered = await registerWorkflow(workflow);
    if (!registered) {
      console.log('Failed to register workflow');
      rl.close();
      return;
    }

    // Step 5: Execute workflow
    const execution = await executeWorkflow(registered.id, context);
    if (!execution) {
      console.log('Failed to execute workflow');
      rl.close();
      return;
    }

    // Step 6: Poll for results
    console.log('\nMonitoring workflow execution...');
    await pollExecutionUntilComplete(execution.executionId, 2000, 600000);

    console.log('\nWorkflow test complete!');
  } catch (error) {
    console.error('Error during workflow test:', error);
  } finally {
    rl.close();
  }
}

// Run the test
runWorkflowTest().catch(console.error);

/* eslint-disable no-console */
/**
 * Workflow Testing Example
 *
 * This script demonstrates how to use the WorkflowTester to test workflows
 */

const { WorkflowTester } = require('../workflow-monitor.cjs');
const path = require('path');

async function runWorkflowTest() {
  try {
    // Create a workflow tester instance
    const tester = new WorkflowTester({
      // Customize directories if needed
      logDirectory: './logs/workflow-test',
      metricsDirectory: './metrics/workflow-test',
      reportsDirectory: './reports/workflow-test',
    });

    console.log('Workflow tester initialized');

    // Load the new workflow
    const taskManagerWorkflow = tester.loadWorkflow(
      path.resolve(__dirname, 'assistant-management-workflow.json')
    );

    // Execute the new workflow
    console.log('\n=== Running Assistant Task Management Workflow ===');
    tester.config.mockMode = false; // Ensure we are not in mock mode

    const result = await tester.executeWorkflow(taskManagerWorkflow);

    console.log(
      `Workflow execution ${result.success ? 'succeeded' : 'failed'}`
    );
    console.log(`Test run ID: ${result.testRunId}`);
    console.log(`Time taken: ${result.timeTaken.toFixed(2)}ms`);

    console.log(
      '\nWorkflow testing complete. Check the logs, metrics, and reports directories for detailed results.'
    );
    console.log('Check data/memory.json for the persisted results.');
  } catch (error) {
    console.error('Error running workflow test:', error);
  }
}

// Run the test
runWorkflowTest().catch(console.error);

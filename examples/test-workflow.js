/**
 * Workflow Testing Example
 * 
 * This script demonstrates how to use the WorkflowTester to test workflows
 */

const { WorkflowTester } = require('../workflow-monitor');
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

    // Option 1: Test with mock responses
    // In mock mode, you can test the workflow without actual tool execution
    console.log('\n=== Running workflow in mock mode ===');
    tester.config.mockMode = true;

    // Register mock responses for tools
    tester.registerMockResponse('web_search', {
      results: [
        { title: 'Mock Search Result 1', snippet: 'This is a mock search result', url: 'https://example.com/1' },
        { title: 'Mock Search Result 2', snippet: 'Another mock search result', url: 'https://example.com/2' }
      ]
    });

    tester.registerMockResponse('mcp_sequential_thinking_sequentialthinking', {
      thought: 'Mock sequential thinking result',
      nextThoughtNeeded: false
    });

    // Load the workflow testing workflow
    const testingWorkflow = tester.loadWorkflow(
      path.resolve(__dirname, 'workflow-testing-workflow.json')
    );

    // Execute the workflow with mock responses
    const mockResult = await tester.executeWorkflow(testingWorkflow, {
      targetWorkflow: 'example-workflow',
      testEnvironment: 'development'
    });

    console.log(`Mock workflow execution ${mockResult.success ? 'succeeded' : 'failed'}`);
    console.log(`Test run ID: ${mockResult.testRunId}`);
    console.log(`Time taken: ${mockResult.timeTaken.toFixed(2)}ms`);

    // Option 2: Test with real tool execution
    // This will actually execute the tools
    console.log('\n=== Running workflow with real tool execution ===');
    tester.config.mockMode = false;

    // Execute the workflow with real tool execution
    const realResult = await tester.executeWorkflow(testingWorkflow, {
      targetWorkflow: 'example-workflow',
      testEnvironment: 'development'
    });

    console.log(`Real workflow execution ${realResult.success ? 'succeeded' : 'failed'}`);
    console.log(`Test run ID: ${realResult.testRunId}`);
    console.log(`Time taken: ${realResult.timeTaken.toFixed(2)}ms`);

    // Generate a comparison report
    console.log('\n=== Generating comparison report ===');
    const comparisonReport = tester.generateComparisonReport(
      [mockResult.testRunId, realResult.testRunId],
      'workflow_testing_comparison'
    );

    console.log('Comparison report generated');
    console.log(`Mock mode average duration: ${comparisonReport.comparison.duration.min.toFixed(2)}ms`);
    console.log(`Real execution average duration: ${comparisonReport.comparison.duration.max.toFixed(2)}ms`);
    console.log(`Performance difference: ${(comparisonReport.comparison.duration.max - comparisonReport.comparison.duration.min).toFixed(2)}ms`);

    // Example of how to test multiple workflow iterations
    console.log('\n=== Testing workflow iterations ===');
    
    // Run multiple times with different inputs to test consistency
    const iterationResults = [];
    for (let i = 0; i < 3; i++) {
      console.log(`Running iteration ${i + 1}...`);
      const iterResult = await tester.executeWorkflow(testingWorkflow, {
        targetWorkflow: 'example-workflow',
        testEnvironment: 'development',
        iteration: i + 1
      });
      
      iterationResults.push(iterResult.testRunId);
      console.log(`Iteration ${i + 1} completed: ${iterResult.success ? 'success' : 'failure'}`);
    }
    
    // Generate a report comparing all iterations
    const iterationsReport = tester.generateComparisonReport(
      iterationResults,
      'workflow_iterations_comparison'
    );
    
    console.log('Iterations comparison report generated');
    console.log(`Iterations average duration: ${iterationsReport.comparison.duration.avg.toFixed(2)}ms`);
    console.log(`Iterations min duration: ${iterationsReport.comparison.duration.min.toFixed(2)}ms`);
    console.log(`Iterations max duration: ${iterationsReport.comparison.duration.max.toFixed(2)}ms`);

    console.log('\nWorkflow testing complete. Check the logs, metrics, and reports directories for detailed results.');
    
  } catch (error) {
    console.error('Error running workflow test:', error);
  }
}

// Run the test
runWorkflowTest().catch(console.error); 
# Workflow Testing System

This document provides guidance on using the Smart MCP Server's workflow testing system to test, monitor, and optimize your workflows.

## Overview

The workflow testing system allows you to:

1. Run workflows in both mock and real execution modes
2. Gather performance metrics and execution logs
3. Compare different workflow runs to identify optimizations
4. Test workflow reliability and error handling
5. Measure the impact of changes to workflow design

## Components

The system consists of these key components:

- **WorkflowTester** (`workflow-monitor.js`): A class that handles workflow execution, monitoring, and metrics gathering
- **Testing Workflow** (`examples/workflow-testing-workflow.json`): A workflow that tests other workflows
- **Example Scripts** (`examples/test-workflow.js`): Example implementation of workflow testing

## Quick Start

To get started with workflow testing:

1. Import the WorkflowTester class:

   ```javascript
   const { WorkflowTester } = require('./workflow-monitor');
   ```

2. Create a tester instance:

   ```javascript
   const tester = new WorkflowTester({
     logDirectory: './logs',
     metricsDirectory: './metrics',
     reportsDirectory: './reports'
   });
   ```

3. Load a workflow:

   ```javascript
   const workflow = tester.loadWorkflow('./examples/workflow-testing-workflow.json');
   ```

4. Execute the workflow:

   ```javascript
   const result = await tester.executeWorkflow(workflow, {
     // Optional inputs for the workflow
     targetWorkflow: 'my-workflow-to-test'
   });
   ```

5. Generate reports:

   ```javascript
   const report = tester.generateComparisonReport(['run_12345', 'run_67890']);
   ```

## Mock vs. Real Execution

The workflow tester supports two execution modes:

### Mock Mode

Useful for testing workflow structure, dependencies, and logic without actual tool execution:

```javascript
tester.config.mockMode = true;

// Register mock responses for tools
tester.registerMockResponse('web_search', {
  results: [
    { title: 'Mock Result', snippet: 'This is a mock result', url: 'https://example.com' }
  ]
});

// Execute with mock responses
await tester.executeWorkflow(workflow);
```

### Real Execution Mode

Runs workflows with actual tool execution:

```javascript
tester.config.mockMode = false;
await tester.executeWorkflow(workflow);
```

## Workflow Metrics

The system captures the following metrics for each workflow execution:

- **Total duration**: Time taken to execute the entire workflow
- **Step durations**: Time taken for each individual step
- **Error rate**: Percentage of steps that failed
- **Step dependencies**: Impact of dependencies on execution time
- **Concurrency efficiency**: How effectively parallelization was utilized

## Testing Strategies

### 1. Incremental Testing

Test individual steps first, then progressively add more steps as you validate each part of the workflow:

```javascript
// Test a subset of steps
const workflowSubset = {
  ...workflow,
  steps: workflow.steps.slice(0, 3) // Test first 3 steps
};
await tester.executeWorkflow(workflowSubset);
```

### 2. Dependency Testing

Focus on testing dependencies between steps to ensure proper data flow:

```javascript
// Register custom mocks for dependency testing
const mockData = { key: 'value' };
tester.registerMockResponse('step1_tool', mockData);

// Then test steps that depend on step1
const dependentSteps = workflow.steps.filter(step => 
  step.dependencies && step.dependencies.includes('step1')
);
```

### 3. Performance Testing

Run the workflow multiple times and compare results to identify performance issues:

```javascript
const results = [];
for (let i = 0; i < 5; i++) {
  results.push(await tester.executeWorkflow(workflow));
}

const comparison = tester.generateComparisonReport(
  results.map(r => r.testRunId)
);
```

### 4. Error Handling Testing

Test how your workflow handles failures:

```javascript
// Register a mock that simulates failure
tester.registerMockResponse('critical_tool', () => {
  throw new Error('Simulated failure');
});

// Execute workflow to test error handling
await tester.executeWorkflow(workflow);
```

## The Testing Workflow

The `workflow-testing-workflow.json` file provides a comprehensive workflow for testing other workflows. It includes steps for:

1. Analyzing workflow structure
2. Setting up test environments
3. Creating test cases
4. Setting up mock servers
5. Testing individual steps
6. Testing error handling
7. Measuring performance
8. Generating reports

## Reading Test Results

Test results are stored in three locations:

- **Logs**: `./logs/{testRunId}_steps.jsonl` - Detailed logs of each step execution
- **Metrics**: `./metrics/{testRunId}_metrics.json` - Performance metrics for the workflow
- **Reports**: `./reports/{reportName}.json` - Comparison reports across multiple runs

Example of reading metrics:

```javascript
const fs = require('fs');
const metrics = JSON.parse(
  fs.readFileSync(`./metrics/${testRunId}_metrics.json`, 'utf8')
);

console.log(`Total duration: ${metrics.totalDuration}ms`);
console.log(`Error rate: ${metrics.errorRate}%`);
```

## Best Practices

1. **Start with mock mode** to validate workflow structure before real execution
2. **Use specific test cases** that cover both happy paths and error conditions
3. **Test concurrency limits** to find the optimal settings for your workflow
4. **Implement proper error handling** in workflows to ensure resilience
5. **Compare before and after** when making changes to workflow design
6. **Establish performance baselines** to track improvements over time
7. **Test with varying inputs** to ensure workflow robustness

## Example Implementation

See `examples/test-workflow.js` for a complete example of how to use the workflow testing system.

```javascript
// Run the example
node examples/test-workflow.js
```

## Extending the System

You can extend the workflow testing system in several ways:

1. **Add custom metrics**: Modify the `generateMetrics` method to capture additional metrics
2. **Create specialized test harnesses**: Build on top of WorkflowTester for specific testing needs
3. **Integrate with CI/CD**: Automate workflow testing as part of your deployment pipeline

## Troubleshooting

### Common Issues

1. **"Dependency not satisfied" errors**: Check for circular dependencies or missing steps
2. **Timeouts**: Adjust the `timeoutMs` config value for long-running steps
3. **File access errors**: Ensure the log, metrics, and reports directories are writable

### Debugging Tips

1. Set up detailed logging:

   ```javascript
   const tester = new WorkflowTester({
     logDirectory: './detailed-logs',
     // Additional config...
   });
   ```

2. Examine step logs in the log directory for specific error messages

3. Use mock mode to isolate issues with specific tools or steps 
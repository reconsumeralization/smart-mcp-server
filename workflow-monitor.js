/**
 * Workflow Monitor and Testing Tool
 * 
 * This script helps with executing and monitoring workflow tests,
 * capturing metrics, and generating reports on workflow performance.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { executeToolProxy } = require('./tool-proxy');

// Configuration
const DEFAULT_CONFIG = {
  logDirectory: './logs',
  metricsDirectory: './metrics',
  reportsDirectory: './reports',
  mockMode: false,
  timeoutMs: 30000 // 30 seconds default timeout
};

/**
 * Workflow Test Runner
 */
class WorkflowTester {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDirectories();
    this.testRuns = new Map();
    this.mockResponses = new Map();
  }

  /**
   * Create necessary directories for logs and metrics
   */
  ensureDirectories() {
    [
      this.config.logDirectory,
      this.config.metricsDirectory, 
      this.config.reportsDirectory
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Register mock responses for tools in mock mode
   */
  registerMockResponse(toolId, mockResponse) {
    this.mockResponses.set(toolId, mockResponse);
  }

  /**
   * Load a workflow from a JSON file
   */
  loadWorkflow(workflowPath) {
    try {
      const fullPath = path.resolve(workflowPath);
      console.log(`Loading workflow from ${fullPath}`);
      const workflowData = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(workflowData);
    } catch (error) {
      console.error(`Error loading workflow: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(step, workflowState, testRunId) {
    const startTime = performance.now();
    const stepLog = {
      stepId: step.id,
      toolId: step.toolId,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      status: 'pending',
      inputs: step.params || {},
      outputs: null,
      error: null
    };

    try {
      console.log(`Executing step: ${step.id} with tool: ${step.toolId}`);
      
      // Check dependencies
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          const dependency = workflowState.stepResults.get(depId);
          if (!dependency || dependency.status !== 'completed') {
            throw new Error(`Dependency not satisfied: ${depId}`);
          }
        }
      }

      // Mock mode or real execution
      let result;
      if (this.config.mockMode && this.mockResponses.has(step.toolId)) {
        result = this.mockResponses.get(step.toolId);
      } else {
        result = await executeToolProxy(step.toolId, step.params);
      }

      const endTime = performance.now();
      stepLog.status = 'completed';
      stepLog.outputs = result;
      stepLog.endTime = new Date().toISOString();
      stepLog.duration = endTime - startTime;
      
      // Update workflow state
      workflowState.stepResults.set(step.id, {
        status: 'completed',
        result,
        timeTaken: stepLog.duration
      });
      
      // Log step execution
      this.logStepExecution(testRunId, stepLog);
      
      return {
        success: true,
        result
      };
    } catch (error) {
      const endTime = performance.now();
      stepLog.status = 'failed';
      stepLog.error = error.message;
      stepLog.endTime = new Date().toISOString();
      stepLog.duration = endTime - startTime;
      
      // Update workflow state
      workflowState.stepResults.set(step.id, {
        status: 'failed',
        error: error.message,
        timeTaken: stepLog.duration
      });
      
      // Log step execution
      this.logStepExecution(testRunId, stepLog);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log step execution details
   */
  logStepExecution(testRunId, stepLog) {
    const logFile = path.join(this.config.logDirectory, `${testRunId}_steps.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(stepLog) + '\n');
  }

  /**
   * Determine which steps are ready to execute based on dependencies
   */
  getReadySteps(workflow, workflowState) {
    return workflow.steps.filter(step => {
      // Skip steps that have already been executed or are in progress
      if (workflowState.stepResults.has(step.id)) {
        return false;
      }
      
      // Check if all dependencies are satisfied
      if (!step.dependencies || step.dependencies.length === 0) {
        return true;
      }
      
      return step.dependencies.every(depId => {
        const depResult = workflowState.stepResults.get(depId);
        return depResult && depResult.status === 'completed';
      });
    });
  }

  /**
   * Execute an entire workflow
   */
  async executeWorkflow(workflow, inputs = {}) {
    const testRunId = `run_${Date.now()}`;
    console.log(`Starting workflow execution: ${workflow.id} (Run ID: ${testRunId})`);
    
    const startTime = performance.now();
    const workflowState = {
      id: workflow.id,
      testRunId,
      inputs,
      stepResults: new Map(),
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      error: null
    };
    
    this.testRuns.set(testRunId, workflowState);
    
    try {
      // Execute steps respecting concurrency limits and dependencies
      while (true) {
        const readySteps = this.getReadySteps(workflow, workflowState);
        
        if (readySteps.length === 0) {
          // Check if all steps have been executed
          if (workflowState.stepResults.size === workflow.steps.length) {
            break; // Workflow completed
          } else {
            // Check for stuck workflow (circular dependencies or failures)
            const pendingSteps = workflow.steps.filter(s => !workflowState.stepResults.has(s.id));
            const failedDeps = new Set();
            
            pendingSteps.forEach(step => {
              if (step.dependencies) {
                step.dependencies.forEach(depId => {
                  const depResult = workflowState.stepResults.get(depId);
                  if (depResult && depResult.status === 'failed') {
                    failedDeps.add(depId);
                  }
                });
              }
            });
            
            if (failedDeps.size > 0) {
              throw new Error(`Workflow stuck due to failed dependencies: ${Array.from(failedDeps).join(', ')}`);
            } else {
              throw new Error('Workflow stuck due to circular dependencies or other configuration issues');
            }
          }
        }
        
        // Execute steps in parallel respecting concurrency limit
        const concurrentLimit = workflow.concurrencyLimit || 1;
        const stepsToExecute = readySteps.slice(0, concurrentLimit);
        
        await Promise.all(stepsToExecute.map(step => 
          this.executeStep(step, workflowState, testRunId)
        ));
      }
      
      // Workflow completed successfully
      const endTime = performance.now();
      workflowState.status = 'completed';
      workflowState.endTime = new Date().toISOString();
      
      // Generate metrics
      this.generateMetrics(testRunId, workflowState, endTime - startTime);
      
      console.log(`Workflow execution completed: ${workflow.id} (Run ID: ${testRunId})`);
      return {
        success: true,
        testRunId,
        timeTaken: endTime - startTime
      };
    } catch (error) {
      // Workflow failed
      const endTime = performance.now();
      workflowState.status = 'failed';
      workflowState.error = error.message;
      workflowState.endTime = new Date().toISOString();
      
      // Generate metrics even for failed workflows
      this.generateMetrics(testRunId, workflowState, endTime - startTime);
      
      console.error(`Workflow execution failed: ${workflow.id} (Run ID: ${testRunId}) - ${error.message}`);
      return {
        success: false,
        testRunId,
        error: error.message,
        timeTaken: endTime - startTime
      };
    }
  }

  /**
   * Generate metrics for a completed workflow run
   */
  generateMetrics(testRunId, workflowState, totalDuration) {
    const metrics = {
      workflowId: workflowState.id,
      testRunId,
      totalDuration,
      status: workflowState.status,
      startTime: workflowState.startTime,
      endTime: workflowState.endTime,
      stepMetrics: [],
      errorRate: 0,
      averageStepDuration: 0,
      criticalPath: []
    };
    
    // Process step metrics
    const steps = [];
    workflowState.stepResults.forEach((result, stepId) => {
      steps.push({
        stepId,
        status: result.status,
        duration: result.timeTaken || 0
      });
    });
    
    metrics.stepMetrics = steps;
    
    // Calculate error rate
    const failedSteps = steps.filter(s => s.status === 'failed');
    metrics.errorRate = (failedSteps.length / steps.length) * 100;
    
    // Calculate average step duration
    const totalStepDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    metrics.averageStepDuration = totalStepDuration / steps.length;
    
    // Save metrics to file
    const metricsFile = path.join(this.config.metricsDirectory, `${testRunId}_metrics.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    
    return metrics;
  }

  /**
   * Generate a report comparing multiple test runs
   */
  generateComparisonReport(testRunIds, reportName = 'comparison_report') {
    const report = {
      generatedAt: new Date().toISOString(),
      testRuns: [],
      comparison: {
        duration: {
          min: Infinity,
          max: 0,
          avg: 0
        },
        errorRate: {
          min: Infinity,
          max: 0,
          avg: 0
        },
        stepPerformance: {}
      }
    };
    
    // Collect metrics for each test run
    testRunIds.forEach(runId => {
      try {
        const metricsFile = path.join(this.config.metricsDirectory, `${runId}_metrics.json`);
        const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        report.testRuns.push(metrics);
        
        // Update comparison data
        report.comparison.duration.min = Math.min(report.comparison.duration.min, metrics.totalDuration);
        report.comparison.duration.max = Math.max(report.comparison.duration.max, metrics.totalDuration);
        report.comparison.errorRate.min = Math.min(report.comparison.errorRate.min, metrics.errorRate);
        report.comparison.errorRate.max = Math.max(report.comparison.errorRate.max, metrics.errorRate);
        
        // Step performance
        metrics.stepMetrics.forEach(step => {
          if (!report.comparison.stepPerformance[step.stepId]) {
            report.comparison.stepPerformance[step.stepId] = {
              durations: [],
              errorCount: 0
            };
          }
          
          report.comparison.stepPerformance[step.stepId].durations.push(step.duration);
          if (step.status === 'failed') {
            report.comparison.stepPerformance[step.stepId].errorCount++;
          }
        });
      } catch (error) {
        console.error(`Error loading metrics for run ${runId}: ${error.message}`);
      }
    });
    
    // Calculate averages
    const totalRuns = report.testRuns.length;
    if (totalRuns > 0) {
      const totalDuration = report.testRuns.reduce((sum, run) => sum + run.totalDuration, 0);
      const totalErrorRate = report.testRuns.reduce((sum, run) => sum + run.errorRate, 0);
      
      report.comparison.duration.avg = totalDuration / totalRuns;
      report.comparison.errorRate.avg = totalErrorRate / totalRuns;
      
      // Calculate step averages
      Object.keys(report.comparison.stepPerformance).forEach(stepId => {
        const stepData = report.comparison.stepPerformance[stepId];
        const totalStepDuration = stepData.durations.reduce((sum, d) => sum + d, 0);
        stepData.avgDuration = totalStepDuration / stepData.durations.length;
        stepData.errorRate = (stepData.errorCount / stepData.durations.length) * 100;
        
        // Identify slowest and fastest steps
        stepData.min = Math.min(...stepData.durations);
        stepData.max = Math.max(...stepData.durations);
      });
    }
    
    // Save report
    const reportFile = path.join(this.config.reportsDirectory, `${reportName}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`Comparison report generated: ${reportFile}`);
    return report;
  }
}

module.exports = {
  WorkflowTester
}; 
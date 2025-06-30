/**
 * Workflow Monitor and Testing Tool
 *
 * This script helps with executing and monitoring workflow tests,
 * capturing metrics, and generating reports on workflow performance.
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { executeToolProxy } from './tool-proxy.js';
import logger from './logger.js';

// Configuration
const DEFAULT_CONFIG = {
  logDirectory: './logs',
  metricsDirectory: './metrics',
  reportsDirectory: './reports',
  mockMode: false,
  timeoutMs: 30000, // 30 seconds default timeout
};

/**
 * Workflow Test Runner
 */
export class WorkflowTester {
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
      this.config.reportsDirectory,
    ].forEach((dir) => {
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
      logger.info(`Loading workflow from ${fullPath}`);
      const workflowData = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(workflowData);
    } catch (error) {
      logger.error(`Error loading workflow:`, { error: error.message });
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
      error: null,
    };

    try {
      logger.info(`Executing step: ${step.id} with tool: ${step.toolId}`);

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
        timeTaken: stepLog.duration,
      });

      // Log step execution
      this.logStepExecution(testRunId, stepLog);

      return {
        success: true,
        result,
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
        timeTaken: stepLog.duration,
      });

      // Log step execution
      this.logStepExecution(testRunId, stepLog);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log step execution details
   */
  logStepExecution(testRunId, stepLog) {
    const logFile = path.join(
      this.config.logDirectory,
      `${testRunId}_steps.jsonl`
    );
    fs.appendFileSync(logFile, JSON.stringify(stepLog) + '\n');
  }

  /**
   * Determine which steps are ready to execute based on dependencies
   */
  getReadySteps(workflow, workflowState) {
    return workflow.steps.filter((step) => {
      // Skip steps that have already been executed or are in progress
      if (workflowState.stepResults.has(step.id)) {
        return false;
      }

      // Check if all dependencies are satisfied
      if (!step.dependencies || step.dependencies.length === 0) {
        return true;
      }

      return step.dependencies.every((depId) => {
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
    logger.info(
      `Starting workflow execution: ${workflow.id} (Run ID: ${testRunId})`
    );

    const startTime = performance.now();
    const workflowState = {
      id: workflow.id,
      testRunId,
      inputs,
      stepResults: new Map(),
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      error: null,
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
            const pendingSteps = workflow.steps.filter(
              (s) => !workflowState.stepResults.has(s.id)
            );
            const failedDeps = new Set();

            pendingSteps.forEach((step) => {
              if (step.dependencies) {
                step.dependencies.forEach((depId) => {
                  const depResult = workflowState.stepResults.get(depId);
                  if (depResult && depResult.status === 'failed') {
                    failedDeps.add(depId);
                  }
                });
              }
            });

            if (failedDeps.size > 0) {
              throw new Error(
                `Workflow stuck due to failed dependencies: ${Array.from(failedDeps).join(', ')}`
              );
            } else {
              throw new Error(
                'Workflow stuck due to circular dependencies or other configuration issues'
              );
            }
          }
        }

        // Execute steps in parallel respecting concurrency limit
        const concurrentLimit = workflow.concurrencyLimit || 1;
        const stepsToExecute = readySteps.slice(0, concurrentLimit);

        await Promise.all(
          stepsToExecute.map((step) =>
            this.executeStep(step, workflowState, testRunId)
          )
        );
      }

      // Workflow completed successfully
      const endTime = performance.now();
      workflowState.status = 'completed';
      workflowState.endTime = new Date().toISOString();

      // Generate metrics
      const totalDuration = endTime - startTime;
      const metrics = this.generateMetrics(
        testRunId,
        workflowState,
        totalDuration
      );

      // Write metrics to file
      const metricsFile = path.join(
        this.config.metricsDirectory,
        `${testRunId}_metrics.json`
      );
      fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));

      return {
        success: true,
        testRunId,
        timeTaken: totalDuration,
        metrics,
      };
    } catch (error) {
      const endTime = performance.now();
      workflowState.status = 'failed';
      workflowState.error = error.message;
      workflowState.endTime = new Date().toISOString();

      logger.error(`Workflow failed:`, { error: error.message });

      return {
        success: false,
        testRunId,
        error: error.message,
        timeTaken: endTime - startTime,
      };
    }
  }

  /**
   * Generate metrics for a workflow run
   */
  generateMetrics(testRunId, workflowState, totalDuration) {
    const metrics = {
      testRunId: testRunId,
      workflowId: workflowState.id,
      status: workflowState.status,
      totalDuration: totalDuration,
      stepDurations: {},
      successfulSteps: 0,
      failedSteps: 0,
    };

    for (const [stepId, result] of workflowState.stepResults.entries()) {
      metrics.stepDurations[stepId] = result.timeTaken;
      if (result.status === 'completed') {
        metrics.successfulSteps++;
      } else {
        metrics.failedSteps++;
      }
    }

    return metrics;
  }

  /**
   * Generate a report comparing multiple test runs
   */
  generateComparisonReport(testRunIds, reportName = 'comparison_report') {
    const report = {
      reportName,
      generatedAt: new Date().toISOString(),
      testRunIds,
      comparison: {
        duration: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
        successRate: { total: 0, successful: 0, percentage: 0 },
      },
      runs: [],
    };

    const allDurations = [];

    for (const testRunId of testRunIds) {
      const metricsFile = path.join(
        this.config.metricsDirectory,
        `${testRunId}_metrics.json`
      );
      if (fs.existsSync(metricsFile)) {
        const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        report.runs.push(metrics);

        // Update stats
        allDurations.push(metrics.totalDuration);
        report.comparison.duration.min = Math.min(
          report.comparison.duration.min,
          metrics.totalDuration
        );
        report.comparison.duration.max = Math.max(
          report.comparison.duration.max,
          metrics.totalDuration
        );
        report.comparison.successRate.total++;
        if (metrics.status === 'completed') {
          report.comparison.successRate.successful++;
        }
      }
    }

    if (allDurations.length > 0) {
      report.comparison.duration.total = allDurations.reduce(
        (acc, val) => acc + val,
        0
      );
      report.comparison.duration.avg =
        report.comparison.duration.total / allDurations.length;
      report.comparison.successRate.percentage =
        (report.comparison.successRate.successful /
          report.comparison.successRate.total) *
        100;
    }

    const reportFile = path.join(
      this.config.reportsDirectory,
      `${reportName}.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    return report;
  }
}

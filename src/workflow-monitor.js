/**
 * Advanced Workflow Monitor and Testing Tool
 *
 * This enhanced script provides comprehensive workflow execution monitoring,
 * testing capabilities, performance analytics, and intelligent optimization
 * recommendations using AI-powered insights.
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { executeToolProxy } from './tool-proxy.js';
import logger from './logger.js';
import { PredictiveAnalytics, IntelligentWorkflowOrchestrator } from './lib/ai-workflows/index.js';

// Enhanced Configuration
const DEFAULT_CONFIG = {
  logDirectory: './logs',
  metricsDirectory: './metrics',
  reportsDirectory: './reports',
  mockMode: false,
  timeoutMs: 30000, // 30 seconds default timeout
  enableAIAnalytics: true,
  enablePredictiveOptimization: true,
  maxRetries: 3,
  retryDelayMs: 1000,
  healthCheckInterval: 5000,
  performanceThresholds: {
    stepDurationWarning: 10000, // 10 seconds
    stepDurationError: 30000,   // 30 seconds
    memoryUsageWarning: 500 * 1024 * 1024, // 500MB
    cpuUsageWarning: 80 // 80%
  },
  alerting: {
    enabled: false,
    webhookUrl: null,
    emailRecipients: []
  }
};

/**
 * Enhanced Workflow Test Runner with AI-powered analytics and monitoring
 */
export class WorkflowTester {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDirectories();
    this.testRuns = new Map();
    this.mockResponses = new Map();
    this.performanceHistory = new Map();
    this.activeMonitors = new Map();
    
    // Initialize AI components if enabled
    if (this.config.enableAIAnalytics) {
      this.predictiveAnalytics = new PredictiveAnalytics();
      this.orchestrator = new IntelligentWorkflowOrchestrator();
    }
    
    // Performance monitoring
    this.systemMetrics = {
      startTime: Date.now(),
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      peakMemoryUsage: 0,
      currentActiveWorkflows: 0
    };
    
    this.startSystemMonitoring();
  }

  /**
   * Create necessary directories for logs and metrics
   */
  ensureDirectories() {
    [
      this.config.logDirectory,
      this.config.metricsDirectory,
      this.config.reportsDirectory,
      path.join(this.config.logDirectory, 'performance'),
      path.join(this.config.logDirectory, 'alerts'),
      path.join(this.config.reportsDirectory, 'ai-insights')
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Start system-level monitoring
   */
  startSystemMonitoring() {
    if (this.systemMonitorInterval) {
      clearInterval(this.systemMonitorInterval);
    }
    
    this.systemMonitorInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.healthCheckInterval);
  }

  /**
   * Collect system performance metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.systemMetrics.peakMemoryUsage = Math.max(
      this.systemMetrics.peakMemoryUsage,
      memUsage.heapUsed
    );
    
    // Check thresholds and alert if necessary
    if (memUsage.heapUsed > this.config.performanceThresholds.memoryUsageWarning) {
      this.handlePerformanceAlert('memory', {
        current: memUsage.heapUsed,
        threshold: this.config.performanceThresholds.memoryUsageWarning
      });
    }
    
    // Log system metrics periodically
    const metricsLog = {
      timestamp: new Date().toISOString(),
      memory: memUsage,
      cpu: cpuUsage,
      activeWorkflows: this.systemMetrics.currentActiveWorkflows,
      totalExecutions: this.systemMetrics.totalExecutions
    };
    
    this.logSystemMetrics(metricsLog);
  }

  /**
   * Handle performance alerts
   */
  async handlePerformanceAlert(type, data) {
    const alert = {
      type,
      severity: 'warning',
      timestamp: new Date().toISOString(),
      data,
      message: `Performance threshold exceeded for ${type}`
    };
    
    logger.warn('Performance alert triggered', alert);
    
    // Log alert
    const alertFile = path.join(
      this.config.logDirectory,
      'alerts',
      `alerts_${new Date().toISOString().split('T')[0]}.jsonl`
    );
    fs.appendFileSync(alertFile, JSON.stringify(alert) + '\n');
    
    // Send external alerts if configured
    if (this.config.alerting.enabled) {
      await this.sendExternalAlert(alert);
    }
  }

  /**
   * Send external alerts via webhook or email
   */
  async sendExternalAlert(alert) {
    try {
      if (this.config.alerting.webhookUrl) {
        // Send webhook alert (implementation would depend on specific webhook service)
        logger.info('Sending webhook alert', { url: this.config.alerting.webhookUrl });
      }
      
      if (this.config.alerting.emailRecipients.length > 0) {
        // Send email alert (implementation would depend on email service)
        logger.info('Sending email alert', { recipients: this.config.alerting.emailRecipients });
      }
    } catch (error) {
      logger.error('Failed to send external alert', error);
    }
  }

  /**
   * Log system metrics to file
   */
  logSystemMetrics(metrics) {
    const metricsFile = path.join(
      this.config.logDirectory,
      'performance',
      `system_metrics_${new Date().toISOString().split('T')[0]}.jsonl`
    );
    fs.appendFileSync(metricsFile, JSON.stringify(metrics) + '\n');
  }

  /**
   * Register mock responses for tools in mock mode
   */
  registerMockResponse(toolId, mockResponse) {
    this.mockResponses.set(toolId, mockResponse);
    logger.debug(`Registered mock response for tool: ${toolId}`);
  }

  /**
   * Load a workflow from a JSON file with validation
   */
  loadWorkflow(workflowPath) {
    try {
      const fullPath = path.resolve(workflowPath);
      logger.info(`Loading workflow from ${fullPath}`);
      const workflowData = fs.readFileSync(fullPath, 'utf8');
      const workflow = JSON.parse(workflowData);
      
      // Validate workflow structure
      this.validateWorkflowStructure(workflow);
      
      return workflow;
    } catch (error) {
      logger.error(`Error loading workflow:`, { error: error.message, path: workflowPath });
      throw error;
    }
  }

  /**
   * Validate workflow structure
   */
  validateWorkflowStructure(workflow) {
    if (!workflow.id) {
      throw new Error('Workflow must have an id');
    }
    
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      throw new Error('Workflow must have a steps array');
    }
    
    // Validate step structure
    workflow.steps.forEach((step, index) => {
      if (!step.id) {
        throw new Error(`Step at index ${index} must have an id`);
      }
      if (!step.toolId) {
        throw new Error(`Step ${step.id} must have a toolId`);
      }
    });
    
    // Check for circular dependencies
    this.detectCircularDependencies(workflow);
  }

  /**
   * Detect circular dependencies in workflow
   */
  detectCircularDependencies(workflow) {
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (stepId) => {
      if (recursionStack.has(stepId)) {
        return true;
      }
      if (visited.has(stepId)) {
        return false;
      }
      
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const step = workflow.steps.find(s => s.id === stepId);
      if (step && step.dependencies) {
        for (const depId of step.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    for (const step of workflow.steps) {
      if (hasCycle(step.id)) {
        throw new Error(`Circular dependency detected involving step: ${step.id}`);
      }
    }
  }

  /**
   * Execute a single workflow step with enhanced monitoring and retry logic
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
      retryCount: 0,
      memoryUsage: null,
      performanceWarnings: []
    };

    let lastError = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.info(`Executing step: ${step.id} with tool: ${step.toolId} (attempt ${attempt + 1})`);

        // Check dependencies
        if (step.dependencies) {
          for (const depId of step.dependencies) {
            const dependency = workflowState.stepResults.get(depId);
            if (!dependency || dependency.status !== 'completed') {
              throw new Error(`Dependency not satisfied: ${depId}`);
            }
          }
        }

        // Record memory usage before execution
        const memBefore = process.memoryUsage();

        // Mock mode or real execution with timeout
        let result;
        if (this.config.mockMode && this.mockResponses.has(step.toolId)) {
          result = this.mockResponses.get(step.toolId);
        } else {
          result = await Promise.race([
            executeToolProxy(step.toolId, step.params),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Step execution timeout')), this.config.timeoutMs)
            )
          ]);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Record memory usage after execution
        const memAfter = process.memoryUsage();
        stepLog.memoryUsage = {
          before: memBefore,
          after: memAfter,
          delta: memAfter.heapUsed - memBefore.heapUsed
        };

        // Check performance thresholds
        if (duration > this.config.performanceThresholds.stepDurationWarning) {
          stepLog.performanceWarnings.push({
            type: 'duration',
            message: `Step execution took ${Math.round(duration)}ms`,
            threshold: this.config.performanceThresholds.stepDurationWarning
          });
        }

        stepLog.status = 'completed';
        stepLog.outputs = result;
        stepLog.endTime = new Date().toISOString();
        stepLog.duration = duration;
        stepLog.retryCount = attempt;

        // Update workflow state
        workflowState.stepResults.set(step.id, {
          status: 'completed',
          result,
          timeTaken: stepLog.duration,
          memoryUsage: stepLog.memoryUsage,
          retryCount: attempt
        });

        // Log step execution
        this.logStepExecution(testRunId, stepLog);

        return {
          success: true,
          result,
          duration: stepLog.duration,
          retryCount: attempt
        };
        
      } catch (error) {
        lastError = error;
        stepLog.retryCount = attempt;
        
        if (attempt < this.config.maxRetries) {
          logger.warn(`Step ${step.id} failed on attempt ${attempt + 1}, retrying...`, { error: error.message });
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs * (attempt + 1)));
          continue;
        }
        
        // Final failure
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
          retryCount: attempt
        });

        // Log step execution
        this.logStepExecution(testRunId, stepLog);

        return {
          success: false,
          error: error.message,
          duration: stepLog.duration,
          retryCount: attempt
        };
      }
    }
  }

  /**
   * Enhanced step execution logging
   */
  logStepExecution(testRunId, stepLog) {
    const logFile = path.join(
      this.config.logDirectory,
      `${testRunId}_steps.jsonl`
    );
    fs.appendFileSync(logFile, JSON.stringify(stepLog) + '\n');
    
    // Also log performance warnings separately if any
    if (stepLog.performanceWarnings.length > 0) {
      const perfLogFile = path.join(
        this.config.logDirectory,
        'performance',
        `${testRunId}_performance_warnings.jsonl`
      );
      fs.appendFileSync(perfLogFile, JSON.stringify({
        testRunId,
        stepId: stepLog.stepId,
        warnings: stepLog.performanceWarnings,
        timestamp: stepLog.endTime
      }) + '\n');
    }
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
   * Execute an entire workflow with AI-powered optimization and monitoring
   */
  async executeWorkflow(workflow, inputs = {}) {
    const testRunId = `run_${Date.now()}`;
    logger.info(
      `Starting enhanced workflow execution: ${workflow.id} (Run ID: ${testRunId})`
    );

    // Increment active workflow counter
    this.systemMetrics.currentActiveWorkflows++;
    this.systemMetrics.totalExecutions++;

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
      aiInsights: null,
      optimizationApplied: false
    };

    this.testRuns.set(testRunId, workflowState);

    try {
      // Apply AI optimization if enabled
      if (this.config.enablePredictiveOptimization && this.orchestrator) {
        logger.info('Applying AI-powered workflow optimization');
        const optimizationResult = await this.orchestrator.optimizeAndRun(workflow, {
          enableOptimization: true,
          context: { inputs, testRunId }
        });
        
        if (optimizationResult.optimizationsApplied) {
          workflowState.optimizationApplied = true;
          workflowState.aiInsights = optimizationResult.insights;
          logger.info('AI optimizations applied', { optimizations: optimizationResult.optimizationsApplied });
        }
      }

      // Get predictive analytics if enabled
      let predictionResult = null;
      if (this.config.enableAIAnalytics && this.predictiveAnalytics) {
        predictionResult = await this.predictiveAnalytics.predictWorkflowSuccess(workflow, {
          context: { inputs, testRunId }
        });
        
        workflowState.aiInsights = {
          ...workflowState.aiInsights,
          prediction: predictionResult
        };
        
        logger.info('Workflow success prediction', {
          probability: predictionResult.probability,
          confidence: predictionResult.confidence
        });
      }

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

        const stepResults = await Promise.all(
          stepsToExecute.map((step) =>
            this.executeStep(step, workflowState, testRunId)
          )
        );

        // Check for any step failures that should halt execution
        const criticalFailures = stepResults.filter(result => 
          !result.success && workflow.haltOnFailure !== false
        );
        
        if (criticalFailures.length > 0) {
          throw new Error(`Critical step failures detected: ${criticalFailures.map(f => f.error).join(', ')}`);
        }
      }

      // Workflow completed successfully
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      workflowState.status = 'completed';
      workflowState.endTime = new Date().toISOString();

      // Update system metrics
      this.systemMetrics.successfulExecutions++;
      this.systemMetrics.averageExecutionTime = 
        (this.systemMetrics.averageExecutionTime * (this.systemMetrics.totalExecutions - 1) + totalDuration) / 
        this.systemMetrics.totalExecutions;

      // Generate enhanced metrics with AI insights
      const metrics = await this.generateEnhancedMetrics(
        testRunId,
        workflowState,
        totalDuration,
        predictionResult
      );

      // Write metrics to file
      const metricsFile = path.join(
        this.config.metricsDirectory,
        `${testRunId}_metrics.json`
      );
      fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));

      // Generate AI insights report if enabled
      if (this.config.enableAIAnalytics && workflowState.aiInsights) {
        await this.generateAIInsightsReport(testRunId, workflowState, metrics);
      }

      return {
        success: true,
        testRunId,
        timeTaken: totalDuration,
        metrics,
        aiInsights: workflowState.aiInsights,
        optimizationApplied: workflowState.optimizationApplied
      };
      
    } catch (error) {
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      workflowState.status = 'failed';
      workflowState.error = error.message;
      workflowState.endTime = new Date().toISOString();

      // Update system metrics
      this.systemMetrics.failedExecutions++;

      logger.error(`Enhanced workflow execution failed:`, { 
        error: error.message, 
        testRunId,
        duration: totalDuration
      });

      return {
        success: false,
        testRunId,
        error: error.message,
        timeTaken: totalDuration,
        aiInsights: workflowState.aiInsights
      };
    } finally {
      // Decrement active workflow counter
      this.systemMetrics.currentActiveWorkflows--;
    }
  }

  /**
   * Generate enhanced metrics with AI insights and performance analysis
   */
  async generateEnhancedMetrics(testRunId, workflowState, totalDuration, predictionResult) {
    const metrics = {
      testRunId: testRunId,
      workflowId: workflowState.id,
      status: workflowState.status,
      totalDuration: totalDuration,
      stepDurations: {},
      stepMemoryUsage: {},
      stepRetries: {},
      successfulSteps: 0,
      failedSteps: 0,
      performanceWarnings: [],
      aiInsights: workflowState.aiInsights,
      systemMetrics: {
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };

    for (const [stepId, result] of workflowState.stepResults.entries()) {
      metrics.stepDurations[stepId] = result.timeTaken;
      metrics.stepRetries[stepId] = result.retryCount || 0;
      
      if (result.memoryUsage) {
        metrics.stepMemoryUsage[stepId] = result.memoryUsage;
      }
      
      if (result.status === 'completed') {
        metrics.successfulSteps++;
      } else {
        metrics.failedSteps++;
      }
    }

    // Add performance analysis
    if (this.config.enableAIAnalytics && this.predictiveAnalytics) {
      try {
        const performanceAnalysis = await this.predictiveAnalytics.analyzePerformanceTrends(
          workflowState.id,
          { timeRange: '24h', includeRecommendations: true }
        );
        metrics.performanceAnalysis = performanceAnalysis;
      } catch (error) {
        logger.warn('Failed to generate performance analysis', error);
      }
    }

    // Store metrics in performance history
    if (!this.performanceHistory.has(workflowState.id)) {
      this.performanceHistory.set(workflowState.id, []);
    }
    this.performanceHistory.get(workflowState.id).push({
      testRunId,
      duration: totalDuration,
      status: workflowState.status,
      timestamp: workflowState.endTime
    });

    return metrics;
  }

  /**
   * Generate AI insights report
   */
  async generateAIInsightsReport(testRunId, workflowState, metrics) {
    const report = {
      testRunId,
      workflowId: workflowState.id,
      generatedAt: new Date().toISOString(),
      insights: workflowState.aiInsights,
      metrics: metrics,
      recommendations: []
    };

    // Generate optimization recommendations if analytics are enabled
    if (this.config.enableAIAnalytics && this.predictiveAnalytics) {
      try {
        const recommendations = await this.predictiveAnalytics.generateOptimizationRecommendations(
          { id: workflowState.id, steps: [] }, // Simplified workflow object
          metrics
        );
        report.recommendations = recommendations;
      } catch (error) {
        logger.warn('Failed to generate AI recommendations', error);
      }
    }

    const reportFile = path.join(
      this.config.reportsDirectory,
      'ai-insights',
      `${testRunId}_ai_insights.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    logger.info('AI insights report generated', { reportFile });
  }

  /**
   * Generate a comprehensive comparison report with AI-powered insights
   */
  generateComparisonReport(testRunIds, reportName = 'comparison_report') {
    const report = {
      reportName,
      generatedAt: new Date().toISOString(),
      testRunIds,
      comparison: {
        duration: { min: Infinity, max: -Infinity, avg: 0, total: 0 },
        successRate: { total: 0, successful: 0, percentage: 0 },
        retryAnalysis: { totalRetries: 0, avgRetriesPerRun: 0 },
        memoryAnalysis: { avgMemoryUsage: 0, peakMemoryUsage: 0 },
        performanceTrends: []
      },
      runs: [],
      aiInsights: {
        patterns: [],
        recommendations: [],
        riskFactors: []
      }
    };

    const allDurations = [];
    const allRetries = [];
    const memoryUsages = [];

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

        // Retry analysis
        const totalRetries = Object.values(metrics.stepRetries || {}).reduce((sum, retries) => sum + retries, 0);
        allRetries.push(totalRetries);
        report.comparison.retryAnalysis.totalRetries += totalRetries;

        // Memory analysis
        if (metrics.systemMetrics && metrics.systemMetrics.memoryUsage) {
          memoryUsages.push(metrics.systemMetrics.memoryUsage.heapUsed);
        }
      }
    }

    if (allDurations.length > 0) {
      report.comparison.duration.total = allDurations.reduce((acc, val) => acc + val, 0);
      report.comparison.duration.avg = report.comparison.duration.total / allDurations.length;
      report.comparison.successRate.percentage =
        (report.comparison.successRate.successful / report.comparison.successRate.total) * 100;
      
      report.comparison.retryAnalysis.avgRetriesPerRun = 
        report.comparison.retryAnalysis.totalRetries / allDurations.length;
      
      if (memoryUsages.length > 0) {
        report.comparison.memoryAnalysis.avgMemoryUsage = 
          memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
        report.comparison.memoryAnalysis.peakMemoryUsage = Math.max(...memoryUsages);
      }

      // Performance trend analysis
      report.comparison.performanceTrends = this.analyzePerformanceTrends(allDurations);
    }

    const reportFile = path.join(
      this.config.reportsDirectory,
      `${reportName}.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    logger.info('Enhanced comparison report generated', { 
      reportFile, 
      runsAnalyzed: testRunIds.length,
      successRate: report.comparison.successRate.percentage
    });

    return report;
  }

  /**
   * Analyze performance trends from duration data
   */
  analyzePerformanceTrends(durations) {
    if (durations.length < 2) return [];

    const trends = [];
    const windowSize = Math.min(5, durations.length);
    
    for (let i = windowSize; i < durations.length; i++) {
      const recentAvg = durations.slice(i - windowSize, i).reduce((sum, d) => sum + d, 0) / windowSize;
      const previousAvg = durations.slice(i - windowSize - 1, i - 1).reduce((sum, d) => sum + d, 0) / windowSize;
      
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;
      
      trends.push({
        position: i,
        recentAverage: recentAvg,
        previousAverage: previousAvg,
        changePercent: change,
        trend: change > 5 ? 'degrading' : change < -5 ? 'improving' : 'stable'
      });
    }

    return trends;
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    return {
      status: 'healthy', // Could be 'healthy', 'warning', 'critical'
      uptime: Date.now() - this.systemMetrics.startTime,
      metrics: this.systemMetrics,
      activeWorkflows: this.systemMetrics.currentActiveWorkflows,
      memoryUsage: process.memoryUsage(),
      performanceAlerts: this.getRecentAlerts()
    };
  }

  /**
   * Get recent performance alerts
   */
  getRecentAlerts(hours = 24) {
    const alertFile = path.join(
      this.config.logDirectory,
      'alerts',
      `alerts_${new Date().toISOString().split('T')[0]}.jsonl`
    );
    
    if (!fs.existsSync(alertFile)) {
      return [];
    }

    const alerts = [];
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    const lines = fs.readFileSync(alertFile, 'utf8').split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const alert = JSON.parse(line);
        if (new Date(alert.timestamp).getTime() > cutoffTime) {
          alerts.push(alert);
        }
      } catch (error) {
        // Skip invalid JSON lines
      }
    }

    return alerts;
  }

  /**
   * Cleanup resources and stop monitoring
   */
  cleanup() {
    if (this.systemMonitorInterval) {
      clearInterval(this.systemMonitorInterval);
    }
    
    logger.info('Workflow tester cleanup completed');
  }
}

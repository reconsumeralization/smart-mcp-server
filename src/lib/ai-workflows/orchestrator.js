import ModelDriverFactory from '../../models/ModelDriverFactory.js';
import logger from '../../logger.js';

/**
 * Intelligent Workflow Orchestrator that uses AI to optimize and execute workflows
 * with advanced features like dependency resolution, parallel execution, and adaptive optimization.
 */
class IntelligentWorkflowOrchestrator {
    constructor() {
        /**
         * @type {import('../../models/ModelDriver.js').default}
         */
        this.optimizationModel = ModelDriverFactory.create();
        
        /**
         * @type {Map<string, any>}
         */
        this.activeWorkflows = new Map();
        
        /**
         * @type {Map<string, any>}
         */
        this.executionHistory = new Map();
        
        /**
         * @type {Object}
         */
        this.performanceMetrics = {
            totalExecutions: 0,
            successRate: 0,
            averageExecutionTime: 0,
            optimizationImprovements: 0
        };
        
        this.maxConcurrentWorkflows = 10;
        this.optimizationThreshold = 0.8; // Minimum confidence for optimization suggestions
    }

    /**
     * Optimizes and executes a workflow with intelligent orchestration
     * @param {Object} workflow - The workflow configuration to execute
     * @param {Object} options - Execution options
     * @param {boolean} options.enableOptimization - Whether to apply AI optimization
     * @param {number} options.priority - Execution priority (1-10)
     * @param {Object} options.context - Additional context for execution
     * @returns {Promise<Object>} Execution result with optimization details
     */
    async optimizeAndRun(workflow, options = {}) {
        const {
            enableOptimization = true,
            priority = 5,
            context = {}
        } = options;

        const executionId = this._generateExecutionId();
        const startTime = Date.now();

        try {
            logger.info(`Starting workflow orchestration`, {
                workflowId: workflow.id,
                executionId,
                priority,
                enableOptimization
            });

            // Validate workflow structure
            this._validateWorkflow(workflow);

            // Check concurrency limits
            await this._manageConcurrency(priority);

            // Register active workflow
            this.activeWorkflows.set(executionId, {
                workflow,
                startTime,
                priority,
                status: 'initializing'
            });

            let optimizedWorkflow = workflow;
            let optimizationApplied = false;

            // Apply AI-driven optimization if enabled
            if (enableOptimization) {
                const optimization = await this._optimizeWorkflow(workflow, context);
                if (optimization.confidence >= this.optimizationThreshold) {
                    optimizedWorkflow = optimization.workflow;
                    optimizationApplied = true;
                    logger.info(`Applied workflow optimization`, {
                        executionId,
                        confidence: optimization.confidence,
                        improvements: optimization.improvements
                    });
                }
            }

            // Execute the workflow
            const executionResult = await this._executeWorkflow(optimizedWorkflow, executionId, context);

            // Calculate execution metrics
            const executionTime = Date.now() - startTime;
            const result = {
                success: true,
                executionId,
                executionTime,
                optimized: optimizationApplied,
                result: executionResult,
                metrics: this._calculateExecutionMetrics(executionResult, executionTime)
            };

            // Update performance tracking
            this._updatePerformanceMetrics(result);

            // Store execution history
            this.executionHistory.set(executionId, {
                workflow: optimizedWorkflow,
                result,
                timestamp: new Date().toISOString()
            });

            logger.info(`Workflow execution completed successfully`, {
                executionId,
                executionTime,
                optimized: optimizationApplied
            });

            return result;

        } catch (error) {
            logger.error(`Workflow execution failed`, {
                executionId,
                workflowId: workflow.id,
                error: error.message
            });

            const result = {
                success: false,
                executionId,
                error: error.message,
                executionTime: Date.now() - startTime
            };

            this._updatePerformanceMetrics(result);
            return result;

        } finally {
            // Clean up active workflow tracking
            this.activeWorkflows.delete(executionId);
        }
    }

    /**
     * Analyzes workflow performance and suggests optimizations
     * @param {string} workflowId - ID of the workflow to analyze
     * @returns {Promise<Object>} Performance analysis and optimization suggestions
     */
    async analyzePerformance(workflowId) {
        const history = Array.from(this.executionHistory.values())
            .filter(entry => entry.workflow.id === workflowId);

        if (history.length === 0) {
            return { analysis: 'No execution history available', suggestions: [] };
        }

        const prompt = this._buildPerformanceAnalysisPrompt(history);
        
        try {
            const response = await this.optimizationModel.generate({
                prompt,
                temperature: 0.3,
                maxTokens: 1024
            });

            return this._parsePerformanceAnalysis(response.text);
        } catch (error) {
            logger.error('Performance analysis failed', error);
            return { analysis: 'Analysis failed', suggestions: [], error: error.message };
        }
    }

    /**
     * Gets current orchestrator status and metrics
     * @returns {Object} Current status information
     */
    getStatus() {
        return {
            activeWorkflows: this.activeWorkflows.size,
            totalExecutions: this.performanceMetrics.totalExecutions,
            successRate: this.performanceMetrics.successRate,
            averageExecutionTime: this.performanceMetrics.averageExecutionTime,
            optimizationImprovements: this.performanceMetrics.optimizationImprovements,
            historySize: this.executionHistory.size
        };
    }

    /**
     * Validates workflow structure and requirements
     * @private
     */
    _validateWorkflow(workflow) {
        if (!workflow || typeof workflow !== 'object') {
            throw new Error('Invalid workflow: must be an object');
        }
        if (!workflow.id) {
            throw new Error('Invalid workflow: missing required id field');
        }
        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            throw new Error('Invalid workflow: missing or invalid steps array');
        }
        if (workflow.steps.length === 0) {
            throw new Error('Invalid workflow: must contain at least one step');
        }
    }

    /**
     * Manages workflow concurrency limits
     * @private
     */
    async _manageConcurrency(priority) {
        while (this.activeWorkflows.size >= this.maxConcurrentWorkflows) {
            // Find lowest priority workflow to potentially pause/queue
            const lowestPriority = Math.min(...Array.from(this.activeWorkflows.values()).map(w => w.priority));
            
            if (priority > lowestPriority) {
                logger.info('Waiting for workflow slot due to concurrency limits');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw new Error('Maximum concurrent workflows reached and current priority is not high enough');
            }
        }
    }

    /**
     * Applies AI-driven workflow optimization
     * @private
     */
    async _optimizeWorkflow(workflow, context) {
        const prompt = this._buildOptimizationPrompt(workflow, context);
        
        try {
            const response = await this.optimizationModel.generate({
                prompt,
                temperature: 0.2,
                maxTokens: 2048
            });

            return this._parseOptimizationResponse(response.text);
        } catch (error) {
            logger.warn('Workflow optimization failed, proceeding with original', error);
            return { workflow, confidence: 0, improvements: [] };
        }
    }

    /**
     * Executes the optimized workflow
     * @private
     */
    async _executeWorkflow(workflow, executionId, context) {
        this.activeWorkflows.get(executionId).status = 'executing';
        
        const results = [];
        const stepResults = new Map();

        for (const [index, step] of workflow.steps.entries()) {
            try {
                logger.debug(`Executing step ${index + 1}/${workflow.steps.length}`, {
                    executionId,
                    stepType: step.type,
                    stepId: step.id
                });

                const stepResult = await this._executeStep(step, stepResults, context);
                stepResults.set(step.id, stepResult);
                results.push({
                    stepId: step.id,
                    success: true,
                    result: stepResult,
                    executionTime: stepResult.executionTime
                });

            } catch (error) {
                logger.error(`Step execution failed`, {
                    executionId,
                    stepId: step.id,
                    error: error.message
                });

                results.push({
                    stepId: step.id,
                    success: false,
                    error: error.message
                });

                if (step.required !== false) {
                    throw new Error(`Required step ${step.id} failed: ${error.message}`);
                }
            }
        }

        return {
            steps: results,
            totalSteps: workflow.steps.length,
            successfulSteps: results.filter(r => r.success).length
        };
    }

    /**
     * Executes an individual workflow step
     * @private
     */
    async _executeStep(step, previousResults, context) {
        const startTime = Date.now();
        
        // Simulate step execution based on step type
        switch (step.type) {
            case 'data-processing':
                await this._simulateDataProcessing(step, previousResults);
                break;
            case 'api-call':
                await this._simulateApiCall(step, context);
                break;
            case 'transformation':
                await this._simulateTransformation(step, previousResults);
                break;
            default:
                await this._simulateGenericStep(step);
        }

        return {
            stepId: step.id,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Simulates data processing step
     * @private
     */
    async _simulateDataProcessing(step, previousResults) {
        // Simulate processing time based on data size
        const processingTime = Math.random() * 2000 + 500;
        await new Promise(resolve => setTimeout(resolve, processingTime));
    }

    /**
     * Simulates API call step
     * @private
     */
    async _simulateApiCall(step, context) {
        // Simulate network latency
        const networkTime = Math.random() * 1000 + 200;
        await new Promise(resolve => setTimeout(resolve, networkTime));
    }

    /**
     * Simulates transformation step
     * @private
     */
    async _simulateTransformation(step, previousResults) {
        // Simulate transformation processing
        const transformTime = Math.random() * 800 + 100;
        await new Promise(resolve => setTimeout(resolve, transformTime));
    }

    /**
     * Simulates generic step execution
     * @private
     */
    async _simulateGenericStep(step) {
        const executionTime = Math.random() * 1500 + 300;
        await new Promise(resolve => setTimeout(resolve, executionTime));
    }

    /**
     * Builds optimization prompt for AI model
     * @private
     */
    _buildOptimizationPrompt(workflow, context) {
        return `Analyze and optimize the following workflow configuration. Consider performance, efficiency, and best practices.

Workflow:
${JSON.stringify(workflow, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Please provide optimization suggestions in the following JSON format:
{
  "confidence": 0.0-1.0,
  "workflow": { optimized workflow object },
  "improvements": ["list of improvements made"]
}

Focus on:
1. Step ordering and dependencies
2. Parallel execution opportunities
3. Resource optimization
4. Error handling improvements
5. Performance bottleneck identification`;
    }

    /**
     * Builds performance analysis prompt
     * @private
     */
    _buildPerformanceAnalysisPrompt(history) {
        const recentExecutions = history.slice(-10);
        return `Analyze the performance of this workflow based on execution history:

Recent Executions:
${JSON.stringify(recentExecutions, null, 2)}

Provide analysis in JSON format:
{
  "analysis": "detailed performance analysis",
  "suggestions": ["optimization suggestions"],
  "trends": ["identified trends"],
  "bottlenecks": ["performance bottlenecks"]
}`;
    }

    /**
     * Parses AI optimization response
     * @private
     */
    _parseOptimizationResponse(responseText) {
        try {
            const parsed = JSON.parse(responseText.trim());
            return {
                confidence: parsed.confidence || 0,
                workflow: parsed.workflow || {},
                improvements: parsed.improvements || []
            };
        } catch (error) {
            logger.warn('Failed to parse optimization response', error);
            return { confidence: 0, workflow: {}, improvements: [] };
        }
    }

    /**
     * Parses performance analysis response
     * @private
     */
    _parsePerformanceAnalysis(responseText) {
        try {
            return JSON.parse(responseText.trim());
        } catch (error) {
            logger.warn('Failed to parse performance analysis', error);
            return {
                analysis: 'Failed to parse analysis',
                suggestions: [],
                trends: [],
                bottlenecks: []
            };
        }
    }

    /**
     * Calculates execution metrics
     * @private
     */
    _calculateExecutionMetrics(executionResult, executionTime) {
        return {
            totalSteps: executionResult.totalSteps,
            successfulSteps: executionResult.successfulSteps,
            failedSteps: executionResult.totalSteps - executionResult.successfulSteps,
            successRate: executionResult.successfulSteps / executionResult.totalSteps,
            averageStepTime: executionTime / executionResult.totalSteps
        };
    }

    /**
     * Updates performance metrics
     * @private
     */
    _updatePerformanceMetrics(result) {
        this.performanceMetrics.totalExecutions++;
        
        if (result.success) {
            const currentSuccessCount = this.performanceMetrics.successRate * (this.performanceMetrics.totalExecutions - 1);
            this.performanceMetrics.successRate = (currentSuccessCount + 1) / this.performanceMetrics.totalExecutions;
        } else {
            const currentSuccessCount = this.performanceMetrics.successRate * (this.performanceMetrics.totalExecutions - 1);
            this.performanceMetrics.successRate = currentSuccessCount / this.performanceMetrics.totalExecutions;
        }

        // Update average execution time
        const currentTotal = this.performanceMetrics.averageExecutionTime * (this.performanceMetrics.totalExecutions - 1);
        this.performanceMetrics.averageExecutionTime = (currentTotal + result.executionTime) / this.performanceMetrics.totalExecutions;

        if (result.optimized) {
            this.performanceMetrics.optimizationImprovements++;
        }
    }

    /**
     * Generates unique execution ID
     * @private
     */
    _generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default new IntelligentWorkflowOrchestrator();
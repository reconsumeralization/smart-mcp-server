import ModelDriverFactory from '../../models/ModelDriverFactory.js';
import logger from '../../logger.js';

/**
 * Advanced Predictive Analytics engine that uses AI models to predict workflow outcomes,
 * analyze performance patterns, and provide optimization recommendations.
 */
class PredictiveAnalytics {
    constructor() {
        /**
         * @type {import('../../models/ModelDriver.js').default}
         */
        this.modelDriver = ModelDriverFactory.create();
        
        /**
         * @type {Map<string, Object>}
         */
        this.historicalData = new Map();
        
        /**
         * @type {Object}
         */
        this.predictionCache = new Map();
        
        /**
         * @type {Object}
         */
        this.analyticsConfig = {
            minHistoricalSamples: 5,
            predictionConfidenceThreshold: 0.7,
            cacheExpirationMs: 300000, // 5 minutes
            maxCacheSize: 1000
        };
        
        this.featureWeights = {
            complexity: 0.3,
            historicalSuccess: 0.4,
            resourceRequirements: 0.2,
            dependencies: 0.1
        };
    }

    /**
     * Predicts the success probability of a workflow using AI analysis
     * @param {Object} workflow - The workflow to analyze
     * @param {Object} options - Prediction options
     * @param {boolean} options.useCache - Whether to use cached predictions
     * @param {Object} options.context - Additional context for prediction
     * @returns {Promise<Object>} Prediction result with confidence and factors
     */
    async predictWorkflowSuccess(workflow, options = {}) {
        const { useCache = true, context = {} } = options;
        
        if (!workflow || !workflow.id) {
            logger.warn('Invalid workflow provided for prediction');
            return { probability: 0, confidence: 0, error: 'Invalid workflow' };
        }

        const cacheKey = this._generateCacheKey(workflow, context);
        
        // Check cache first
        if (useCache && this.predictionCache.has(cacheKey)) {
            const cached = this.predictionCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.analyticsConfig.cacheExpirationMs) {
                logger.debug(`Using cached prediction for workflow ${workflow.id}`);
                return cached.result;
            }
        }

        try {
            logger.info(`Generating prediction for workflow: ${workflow.id}`);
            
            const features = await this._extractWorkflowFeatures(workflow, context);
            const historicalAnalysis = this._analyzeHistoricalData(workflow);
            const aiPrediction = await this._generateAIPrediction(workflow, features, historicalAnalysis);
            
            const result = {
                probability: aiPrediction.probability,
                confidence: aiPrediction.confidence,
                factors: aiPrediction.factors,
                recommendations: aiPrediction.recommendations,
                timestamp: Date.now(),
                workflowId: workflow.id
            };

            // Cache the result
            if (useCache) {
                this._cacheResult(cacheKey, result);
            }

            // Store for historical analysis
            this._updateHistoricalData(workflow, result);

            logger.info(`Prediction completed for workflow ${workflow.id}`, {
                probability: result.probability,
                confidence: result.confidence
            });

            return result;

        } catch (error) {
            logger.error(`Prediction failed for workflow ${workflow.id}`, error);
            return {
                probability: 0.5, // Neutral probability on error
                confidence: 0,
                error: error.message,
                timestamp: Date.now(),
                workflowId: workflow.id
            };
        }
    }

    /**
     * Analyzes workflow performance trends and patterns
     * @param {string} workflowId - ID of the workflow to analyze
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Performance analysis results
     */
    async analyzePerformanceTrends(workflowId, options = {}) {
        const { timeRange = '30d', includeRecommendations = true } = options;
        
        logger.info(`Analyzing performance trends for workflow: ${workflowId}`);
        
        try {
            const historicalData = this._getHistoricalData(workflowId, timeRange);
            
            if (historicalData.length < this.analyticsConfig.minHistoricalSamples) {
                return {
                    trend: 'insufficient_data',
                    message: 'Not enough historical data for trend analysis',
                    sampleCount: historicalData.length
                };
            }

            const trends = this._calculateTrends(historicalData);
            const patterns = this._identifyPatterns(historicalData);
            
            let recommendations = [];
            if (includeRecommendations) {
                recommendations = await this._generateRecommendations(trends, patterns);
            }

            return {
                trend: trends.overall,
                successRate: trends.successRate,
                performanceMetrics: trends.metrics,
                patterns: patterns,
                recommendations: recommendations,
                dataPoints: historicalData.length,
                timeRange: timeRange
            };

        } catch (error) {
            logger.error(`Performance trend analysis failed for workflow ${workflowId}`, error);
            return { error: error.message };
        }
    }

    /**
     * Generates optimization recommendations based on predictive analysis
     * @param {Object} workflow - The workflow to optimize
     * @param {Object} performanceData - Historical performance data
     * @returns {Promise<Array>} Array of optimization recommendations
     */
    async generateOptimizationRecommendations(workflow, performanceData = {}) {
        logger.info(`Generating optimization recommendations for workflow: ${workflow.id}`);
        
        try {
            const features = await this._extractWorkflowFeatures(workflow);
            const bottlenecks = this._identifyBottlenecks(workflow, performanceData);
            
            const prompt = this._buildOptimizationPrompt(workflow, features, bottlenecks, performanceData);
            
            const response = await this.modelDriver.generate({
                prompt,
                temperature: 0.3,
                maxTokens: 1500
            });

            const recommendations = this._parseOptimizationResponse(response.text);
            
            logger.info(`Generated ${recommendations.length} optimization recommendations`);
            
            return recommendations;

        } catch (error) {
            logger.error(`Failed to generate optimization recommendations`, error);
            return [];
        }
    }

    /**
     * Extracts relevant features from a workflow for prediction
     * @private
     */
    async _extractWorkflowFeatures(workflow, context = {}) {
        return {
            stepCount: workflow.steps?.length || 0,
            complexity: this._calculateComplexity(workflow),
            dependencies: workflow.dependencies?.length || 0,
            estimatedDuration: workflow.estimatedDuration || 0,
            resourceRequirements: this._assessResourceRequirements(workflow),
            hasConditionalLogic: this._hasConditionalLogic(workflow),
            parallelSteps: this._countParallelSteps(workflow),
            externalDependencies: this._countExternalDependencies(workflow),
            contextFactors: context
        };
    }

    /**
     * Generates AI-powered prediction using the model driver
     * @private
     */
    async _generateAIPrediction(workflow, features, historicalAnalysis) {
        const prompt = `
Analyze this workflow and predict its success probability:

Workflow Details:
- ID: ${workflow.id}
- Type: ${workflow.type || 'unknown'}
- Steps: ${features.stepCount}
- Complexity Score: ${features.complexity}
- Dependencies: ${features.dependencies}

Features:
${JSON.stringify(features, null, 2)}

Historical Analysis:
${JSON.stringify(historicalAnalysis, null, 2)}

Please provide a JSON response with:
1. probability (0-1): Success probability
2. confidence (0-1): Confidence in the prediction
3. factors: Key factors affecting success
4. recommendations: Specific recommendations to improve success rate

Format as valid JSON only.`;

        const response = await this.modelDriver.generate({
            prompt,
            temperature: 0.2,
            maxTokens: 1000
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            logger.warn('Failed to parse AI prediction response, using fallback');
            return {
                probability: 0.5,
                confidence: 0.3,
                factors: ['Unable to analyze'],
                recommendations: ['Review workflow configuration']
            };
        }
    }

    /**
     * Calculates workflow complexity score
     * @private
     */
    _calculateComplexity(workflow) {
        let complexity = 0;
        
        // Base complexity from step count
        complexity += (workflow.steps?.length || 0) * 0.1;
        
        // Add complexity for conditional logic
        if (this._hasConditionalLogic(workflow)) {
            complexity += 0.3;
        }
        
        // Add complexity for parallel execution
        complexity += this._countParallelSteps(workflow) * 0.2;
        
        // Add complexity for external dependencies
        complexity += this._countExternalDependencies(workflow) * 0.15;
        
        return Math.min(complexity, 1.0); // Cap at 1.0
    }

    /**
     * Analyzes historical data for patterns
     * @private
     */
    _analyzeHistoricalData(workflow) {
        const historical = this.historicalData.get(workflow.id) || [];
        
        if (historical.length === 0) {
            return { hasData: false, successRate: 0.5 };
        }

        const successCount = historical.filter(h => h.success).length;
        const successRate = successCount / historical.length;
        
        return {
            hasData: true,
            successRate,
            totalExecutions: historical.length,
            averageExecutionTime: historical.reduce((sum, h) => sum + (h.executionTime || 0), 0) / historical.length,
            recentTrend: this._calculateRecentTrend(historical)
        };
    }

    /**
     * Generates cache key for predictions
     * @private
     */
    _generateCacheKey(workflow, context) {
        const contextHash = JSON.stringify(context);
        return `${workflow.id}_${workflow.version || 'v1'}_${contextHash}`;
    }

    /**
     * Caches prediction result
     * @private
     */
    _cacheResult(key, result) {
        // Implement LRU cache behavior
        if (this.predictionCache.size >= this.analyticsConfig.maxCacheSize) {
            const firstKey = this.predictionCache.keys().next().value;
            this.predictionCache.delete(firstKey);
        }
        
        this.predictionCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Updates historical data with new execution result
     * @private
     */
    _updateHistoricalData(workflow, result) {
        const workflowHistory = this.historicalData.get(workflow.id) || [];
        workflowHistory.push({
            timestamp: Date.now(),
            prediction: result,
            workflowVersion: workflow.version || 'v1'
        });
        
        // Keep only recent history (last 100 executions)
        if (workflowHistory.length > 100) {
            workflowHistory.splice(0, workflowHistory.length - 100);
        }
        
        this.historicalData.set(workflow.id, workflowHistory);
    }

    /**
     * Helper methods for workflow analysis
     * @private
     */
    _hasConditionalLogic(workflow) {
        return workflow.steps?.some(step => 
            step.type === 'conditional' || 
            step.conditions || 
            step.branches
        ) || false;
    }

    _countParallelSteps(workflow) {
        return workflow.steps?.filter(step => step.parallel === true).length || 0;
    }

    _countExternalDependencies(workflow) {
        return workflow.steps?.filter(step => 
            step.type === 'api' || 
            step.type === 'external' || 
            step.externalService
        ).length || 0;
    }

    _assessResourceRequirements(workflow) {
        // Simple heuristic based on step types and complexity
        const heavySteps = workflow.steps?.filter(step => 
            step.type === 'data-processing' || 
            step.type === 'ml-inference' ||
            step.resourceIntensive === true
        ).length || 0;
        
        return heavySteps > 0 ? 'high' : 'low';
    }

    _calculateRecentTrend(historical) {
        if (historical.length < 3) return 'stable';
        
        const recent = historical.slice(-5);
        const older = historical.slice(-10, -5);
        
        if (older.length === 0) return 'stable';
        
        const recentSuccess = recent.filter(h => h.success).length / recent.length;
        const olderSuccess = older.filter(h => h.success).length / older.length;
        
        if (recentSuccess > olderSuccess + 0.1) return 'improving';
        if (recentSuccess < olderSuccess - 0.1) return 'declining';
        return 'stable';
    }

    _getHistoricalData(workflowId, timeRange) {
        const data = this.historicalData.get(workflowId) || [];
        const cutoff = this._parseTimeRange(timeRange);
        return data.filter(d => d.timestamp > cutoff);
    }

    _parseTimeRange(timeRange) {
        const now = Date.now();
        const match = timeRange.match(/^(\d+)([hdwm])$/);
        if (!match) return now - (30 * 24 * 60 * 60 * 1000); // Default 30 days
        
        const [, amount, unit] = match;
        const multipliers = { h: 3600000, d: 86400000, w: 604800000, m: 2592000000 };
        return now - (parseInt(amount) * multipliers[unit]);
    }

    _calculateTrends(data) {
        const successRate = data.filter(d => d.success).length / data.length;
        const avgExecutionTime = data.reduce((sum, d) => sum + (d.executionTime || 0), 0) / data.length;
        
        return {
            overall: successRate > 0.8 ? 'excellent' : successRate > 0.6 ? 'good' : 'needs_improvement',
            successRate,
            metrics: {
                averageExecutionTime: avgExecutionTime,
                totalExecutions: data.length
            }
        };
    }

    _identifyPatterns(data) {
        // Simple pattern identification
        return {
            timeOfDayPattern: this._analyzeTimePattern(data),
            failurePatterns: this._analyzeFailurePatterns(data)
        };
    }

    _analyzeTimePattern(data) {
        // Placeholder for time-based pattern analysis
        return 'no_clear_pattern';
    }

    _analyzeFailurePatterns(data) {
        const failures = data.filter(d => !d.success);
        return failures.length > 0 ? 'failures_detected' : 'no_failures';
    }

    async _generateRecommendations(trends, patterns) {
        // Generate AI-powered recommendations based on trends and patterns
        const prompt = `Based on these workflow performance trends and patterns, provide optimization recommendations:

Trends: ${JSON.stringify(trends)}
Patterns: ${JSON.stringify(patterns)}

Provide 3-5 specific, actionable recommendations as a JSON array.`;

        try {
            const response = await this.modelDriver.generate({
                prompt,
                temperature: 0.3,
                maxTokens: 500
            });
            
            return JSON.parse(response.text);
        } catch (error) {
            logger.warn('Failed to generate AI recommendations, using fallback');
            return ['Review workflow configuration', 'Monitor execution patterns', 'Consider performance optimization'];
        }
    }

    _identifyBottlenecks(workflow, performanceData) {
        // Identify potential bottlenecks in the workflow
        return workflow.steps?.filter(step => 
            step.estimatedDuration > 30000 || // Steps taking more than 30 seconds
            step.type === 'external' || // External dependencies
            step.resourceIntensive === true
        ) || [];
    }

    _buildOptimizationPrompt(workflow, features, bottlenecks, performanceData) {
        return `Analyze this workflow and provide optimization recommendations:

Workflow: ${workflow.id}
Features: ${JSON.stringify(features, null, 2)}
Identified Bottlenecks: ${JSON.stringify(bottlenecks, null, 2)}
Performance Data: ${JSON.stringify(performanceData, null, 2)}

Provide specific optimization recommendations as a JSON array with objects containing:
- type: optimization type
- description: detailed description
- impact: expected impact (high/medium/low)
- effort: implementation effort (high/medium/low)`;
    }

    _parseOptimizationResponse(responseText) {
        try {
            return JSON.parse(responseText);
        } catch (error) {
            logger.warn('Failed to parse optimization response');
            return [{
                type: 'general',
                description: 'Review workflow configuration for potential optimizations',
                impact: 'medium',
                effort: 'low'
            }];
        }
    }
}

export default PredictiveAnalytics;
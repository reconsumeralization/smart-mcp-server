const EventEmitter = require('events');

/**
 * Advanced Analytics Service
 * Provides comprehensive analytics, insights, and predictive capabilities
 */
class AdvancedAnalytics extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            retentionPeriod: config.retentionPeriod || 30 * 24 * 60 * 60 * 1000, // 30 days
            aggregationInterval: config.aggregationInterval || 60000, // 1 minute
            alertThresholds: {
                errorRate: 0.05, // 5%
                responseTime: 2000, // 2 seconds
                memoryUsage: 0.85, // 85%
                cpuUsage: 0.80, // 80%
                ...config.alertThresholds
            },
            ...config
        };

        // Data stores
        this.metrics = new Map();
        this.events = [];
        this.aggregatedData = new Map();
        this.insights = [];
        this.predictions = new Map();

        // Performance tracking
        this.performanceMetrics = {
            requests: { total: 0, success: 0, errors: 0, responseTime: [] },
            system: { memory: [], cpu: [], uptime: 0 },
            tools: new Map(),
            users: new Map(),
            financial: { trades: [], portfolio: [], risk: [] }
        };

        this.initializeAnalytics();
    }

    /**
     * Initialize analytics system
     */
    initializeAnalytics() {
        // Start aggregation interval
        setInterval(() => {
            this.aggregateMetrics();
            this.generateInsights();
            this.runPredictiveAnalysis();
        }, this.config.aggregationInterval);

        // Cleanup old data
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000); // Daily cleanup

        console.log('🔍 Advanced Analytics initialized');
    }

    /**
     * Event Tracking
     */
    trackEvent(type, data = {}) {
        const event = {
            id: this.generateId(),
            type,
            timestamp: new Date(),
            data: {
                ...data,
                sessionId: data.sessionId || 'anonymous',
                userId: data.userId || null,
                ip: data.ip || 'unknown'
            }
        };

        this.events.push(event);
        this.emit('event', event);

        // Real-time processing
        this.processEventRealTime(event);
    }

    /**
     * Metric Recording
     */
    recordMetric(name, value, tags = {}) {
        const metric = {
            id: this.generateId(),
            name,
            value,
            timestamp: new Date(),
            tags: {
                ...tags,
                source: tags.source || 'system'
            }
        };

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        this.metrics.get(name).push(metric);
        this.emit('metric', metric);
    }

    /**
     * Performance Tracking
     */
    trackRequest(req, res, responseTime) {
        this.performanceMetrics.requests.total++;
        this.performanceMetrics.requests.responseTime.push(responseTime);

        if (res.statusCode >= 400) {
            this.performanceMetrics.requests.errors++;
        } else {
            this.performanceMetrics.requests.success++;
        }

        this.trackEvent('request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        this.recordMetric('response_time', responseTime, {
            method: req.method,
            path: req.path,
            status: res.statusCode
        });
    }

    trackSystemMetrics(metrics) {
        this.performanceMetrics.system.memory.push({
            timestamp: new Date(),
            ...metrics.memory
        });

        this.performanceMetrics.system.cpu.push({
            timestamp: new Date(),
            ...metrics.cpu
        });

        this.recordMetric('memory_usage', metrics.memory.usagePercent);
        this.recordMetric('cpu_usage', metrics.cpu.usage);
        this.recordMetric('uptime', metrics.uptime);

        // Check for alerts
        this.checkAlerts(metrics);
    }

    trackToolUsage(toolName, operation, duration, success = true) {
        if (!this.performanceMetrics.tools.has(toolName)) {
            this.performanceMetrics.tools.set(toolName, {
                usage: 0,
                operations: [],
                errors: 0,
                totalDuration: 0
            });
        }

        const toolMetrics = this.performanceMetrics.tools.get(toolName);
        toolMetrics.usage++;
        toolMetrics.operations.push({
            operation,
            duration,
            success,
            timestamp: new Date()
        });

        if (!success) {
            toolMetrics.errors++;
        }

        toolMetrics.totalDuration += duration;

        this.trackEvent('tool_usage', {
            tool: toolName,
            operation,
            duration,
            success
        });
    }

    /**
     * Financial Analytics
     */
    trackFinancialMetrics(type, data) {
        this.performanceMetrics.financial[type].push({
            timestamp: new Date(),
            ...data
        });

        this.trackEvent(`financial_${type}`, data);

        // Calculate financial KPIs
        if (type === 'trades') {
            this.calculateTradingMetrics(data);
        } else if (type === 'portfolio') {
            this.calculatePortfolioMetrics(data);
        } else if (type === 'risk') {
            this.calculateRiskMetrics(data);
        }
    }

    calculateTradingMetrics(tradeData) {
        const trades = this.performanceMetrics.financial.trades;
        const recentTrades = trades.filter(t => 
            Date.now() - t.timestamp.getTime() < 24 * 60 * 60 * 1000
        );

        const totalVolume = recentTrades.reduce((sum, t) => sum + (t.volume || 0), 0);
        const successfulTrades = recentTrades.filter(t => t.success).length;
        const successRate = recentTrades.length > 0 ? successfulTrades / recentTrades.length : 0;

        this.recordMetric('trading_volume_24h', totalVolume);
        this.recordMetric('trading_success_rate', successRate);
        this.recordMetric('trades_count_24h', recentTrades.length);
    }

    calculatePortfolioMetrics(portfolioData) {
        this.recordMetric('portfolio_value', portfolioData.totalValue || 0);
        this.recordMetric('portfolio_pnl', portfolioData.pnl || 0);
        this.recordMetric('portfolio_risk_score', portfolioData.riskScore || 0);
    }

    calculateRiskMetrics(riskData) {
        this.recordMetric('var_limit_utilization', riskData.varUtilization || 0);
        this.recordMetric('max_drawdown', riskData.maxDrawdown || 0);
        this.recordMetric('risk_alerts', riskData.alertsCount || 0);
    }

    /**
     * Data Aggregation
     */
    aggregateMetrics() {
        const now = new Date();
        const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        
        if (!this.aggregatedData.has(hourKey)) {
            this.aggregatedData.set(hourKey, {
                timestamp: now,
                requests: { total: 0, errors: 0, avgResponseTime: 0 },
                system: { avgMemory: 0, avgCpu: 0 },
                tools: new Map(),
                events: new Map()
            });
        }

        const aggregated = this.aggregatedData.get(hourKey);

        // Aggregate request metrics
        const requests = this.performanceMetrics.requests;
        aggregated.requests.total = requests.total;
        aggregated.requests.errors = requests.errors;
        aggregated.requests.avgResponseTime = requests.responseTime.length > 0 
            ? requests.responseTime.reduce((a, b) => a + b, 0) / requests.responseTime.length 
            : 0;

        // Aggregate system metrics
        const recentMemory = this.performanceMetrics.system.memory.slice(-60); // Last hour
        const recentCpu = this.performanceMetrics.system.cpu.slice(-60);

        aggregated.system.avgMemory = recentMemory.length > 0
            ? recentMemory.reduce((sum, m) => sum + (m.usagePercent || 0), 0) / recentMemory.length
            : 0;

        aggregated.system.avgCpu = recentCpu.length > 0
            ? recentCpu.reduce((sum, c) => sum + (c.usage || 0), 0) / recentCpu.length
            : 0;

        // Aggregate tool usage
        this.performanceMetrics.tools.forEach((metrics, toolName) => {
            aggregated.tools.set(toolName, {
                usage: metrics.usage,
                avgDuration: metrics.operations.length > 0 
                    ? metrics.totalDuration / metrics.operations.length 
                    : 0,
                errorRate: metrics.usage > 0 ? metrics.errors / metrics.usage : 0
            });
        });

        // Aggregate events
        const recentEvents = this.events.filter(e => 
            now.getTime() - e.timestamp.getTime() < 60 * 60 * 1000
        );

        const eventCounts = {};
        recentEvents.forEach(event => {
            eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
        });

        Object.entries(eventCounts).forEach(([type, count]) => {
            aggregated.events.set(type, count);
        });
    }

    /**
     * Insight Generation
     */
    generateInsights() {
        const insights = [];
        const now = new Date();

        // Performance insights
        const avgResponseTime = this.getAverageResponseTime();
        if (avgResponseTime > this.config.alertThresholds.responseTime) {
            insights.push({
                type: 'performance',
                severity: 'warning',
                title: 'High Response Time Detected',
                description: `Average response time is ${avgResponseTime.toFixed(2)}ms, exceeding threshold of ${this.config.alertThresholds.responseTime}ms`,
                timestamp: now,
                recommendations: [
                    'Check system resources',
                    'Optimize database queries',
                    'Review caching strategy'
                ]
            });
        }

        // Error rate insights
        const errorRate = this.getErrorRate();
        if (errorRate > this.config.alertThresholds.errorRate) {
            insights.push({
                type: 'reliability',
                severity: 'critical',
                title: 'High Error Rate Detected',
                description: `Error rate is ${(errorRate * 100).toFixed(2)}%, exceeding threshold of ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%`,
                timestamp: now,
                recommendations: [
                    'Check application logs',
                    'Review recent deployments',
                    'Monitor external dependencies'
                ]
            });
        }

        // Usage pattern insights
        const topTools = this.getTopUsedTools();
        if (topTools.length > 0) {
            insights.push({
                type: 'usage',
                severity: 'info',
                title: 'Tool Usage Patterns',
                description: `Most used tools: ${topTools.slice(0, 3).map(t => t.name).join(', ')}`,
                timestamp: now,
                data: topTools
            });
        }

        // Financial insights
        const tradingSuccessRate = this.getTradingSuccessRate();
        if (tradingSuccessRate < 0.8) {
            insights.push({
                type: 'financial',
                severity: 'warning',
                title: 'Trading Performance Alert',
                description: `Trading success rate is ${(tradingSuccessRate * 100).toFixed(2)}%, below optimal threshold`,
                timestamp: now,
                recommendations: [
                    'Review trading strategies',
                    'Check market conditions',
                    'Analyze failed trades'
                ]
            });
        }

        // Store insights
        this.insights.push(...insights);
        
        // Emit insights for real-time processing
        insights.forEach(insight => this.emit('insight', insight));
    }

    /**
     * Predictive Analysis
     */
    runPredictiveAnalysis() {
        // Predict system resource usage
        this.predictResourceUsage();
        
        // Predict tool usage patterns
        this.predictToolUsage();
        
        // Predict financial metrics
        this.predictFinancialTrends();
    }

    predictResourceUsage() {
        const memoryData = this.performanceMetrics.system.memory.slice(-60);
        const cpuData = this.performanceMetrics.system.cpu.slice(-60);

        if (memoryData.length >= 10) {
            const memoryTrend = this.calculateTrend(memoryData.map(m => m.usagePercent || 0));
            const predictedMemory = memoryTrend.predict(60); // Predict 1 hour ahead

            this.predictions.set('memory_usage_1h', {
                value: predictedMemory,
                confidence: memoryTrend.confidence,
                timestamp: new Date()
            });
        }

        if (cpuData.length >= 10) {
            const cpuTrend = this.calculateTrend(cpuData.map(c => c.usage || 0));
            const predictedCpu = cpuTrend.predict(60);

            this.predictions.set('cpu_usage_1h', {
                value: predictedCpu,
                confidence: cpuTrend.confidence,
                timestamp: new Date()
            });
        }
    }

    predictToolUsage() {
        this.performanceMetrics.tools.forEach((metrics, toolName) => {
            if (metrics.operations.length >= 10) {
                const usagePattern = this.analyzeUsagePattern(metrics.operations);
                this.predictions.set(`${toolName}_usage_trend`, {
                    pattern: usagePattern,
                    nextPeakTime: usagePattern.nextPeak,
                    timestamp: new Date()
                });
            }
        });
    }

    predictFinancialTrends() {
        const trades = this.performanceMetrics.financial.trades;
        if (trades.length >= 20) {
            const volumeTrend = this.calculateTrend(trades.map(t => t.volume || 0));
            const predictedVolume = volumeTrend.predict(24); // 24 hours ahead

            this.predictions.set('trading_volume_24h', {
                value: predictedVolume,
                confidence: volumeTrend.confidence,
                timestamp: new Date()
            });
        }
    }

    /**
     * Utility Methods
     */
    calculateTrend(data) {
        if (data.length < 2) return { predict: () => 0, confidence: 0 };

        // Simple linear regression
        const n = data.length;
        const sumX = data.reduce((sum, _, i) => sum + i, 0);
        const sumY = data.reduce((sum, val) => sum + val, 0);
        const sumXY = data.reduce((sum, val, i) => sum + i * val, 0);
        const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared for confidence
        const yMean = sumY / n;
        const ssRes = data.reduce((sum, val, i) => {
            const predicted = slope * i + intercept;
            return sum + Math.pow(val - predicted, 2);
        }, 0);
        const ssTot = data.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
        const rSquared = 1 - (ssRes / ssTot);

        return {
            predict: (x) => slope * (n + x) + intercept,
            confidence: Math.max(0, Math.min(1, rSquared))
        };
    }

    analyzeUsagePattern(operations) {
        const hourlyUsage = new Array(24).fill(0);
        
        operations.forEach(op => {
            const hour = op.timestamp.getHours();
            hourlyUsage[hour]++;
        });

        const peakHour = hourlyUsage.indexOf(Math.max(...hourlyUsage));
        const nextPeak = new Date();
        nextPeak.setHours(peakHour, 0, 0, 0);
        if (nextPeak <= new Date()) {
            nextPeak.setDate(nextPeak.getDate() + 1);
        }

        return {
            hourlyDistribution: hourlyUsage,
            peakHour,
            nextPeak,
            totalOperations: operations.length
        };
    }

    /**
     * Alert System
     */
    checkAlerts(metrics) {
        const alerts = [];

        if (metrics.memory.usagePercent > this.config.alertThresholds.memoryUsage * 100) {
            alerts.push({
                type: 'memory_high',
                severity: 'warning',
                message: `Memory usage at ${metrics.memory.usagePercent.toFixed(2)}%`
            });
        }

        if (metrics.cpu.usage > this.config.alertThresholds.cpuUsage * 100) {
            alerts.push({
                type: 'cpu_high',
                severity: 'warning',
                message: `CPU usage at ${metrics.cpu.usage.toFixed(2)}%`
            });
        }

        alerts.forEach(alert => {
            this.emit('alert', alert);
            console.warn(`🚨 ALERT: ${alert.message}`);
        });
    }

    /**
     * Data Retrieval Methods
     */
    getAverageResponseTime(hours = 1) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        const recentTimes = this.performanceMetrics.requests.responseTime.filter(
            (_, index) => index >= this.performanceMetrics.requests.responseTime.length - 100
        );
        
        return recentTimes.length > 0 
            ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length 
            : 0;
    }

    getErrorRate(hours = 1) {
        const total = this.performanceMetrics.requests.total;
        const errors = this.performanceMetrics.requests.errors;
        return total > 0 ? errors / total : 0;
    }

    getTopUsedTools(limit = 10) {
        return Array.from(this.performanceMetrics.tools.entries())
            .map(([name, metrics]) => ({
                name,
                usage: metrics.usage,
                avgDuration: metrics.operations.length > 0 
                    ? metrics.totalDuration / metrics.operations.length 
                    : 0,
                errorRate: metrics.usage > 0 ? metrics.errors / metrics.usage : 0
            }))
            .sort((a, b) => b.usage - a.usage)
            .slice(0, limit);
    }

    getTradingSuccessRate() {
        const trades = this.performanceMetrics.financial.trades;
        const recentTrades = trades.filter(t => 
            Date.now() - t.timestamp.getTime() < 24 * 60 * 60 * 1000
        );
        
        if (recentTrades.length === 0) return 1;
        
        const successful = recentTrades.filter(t => t.success).length;
        return successful / recentTrades.length;
    }

    /**
     * Dashboard Data
     */
    getDashboardData() {
        return {
            overview: {
                totalRequests: this.performanceMetrics.requests.total,
                errorRate: this.getErrorRate(),
                avgResponseTime: this.getAverageResponseTime(),
                uptime: this.performanceMetrics.system.uptime
            },
            tools: this.getTopUsedTools(),
            insights: this.insights.slice(-10),
            predictions: Object.fromEntries(this.predictions),
            alerts: this.getRecentAlerts(),
            financial: {
                tradingVolume: this.performanceMetrics.financial.trades.reduce(
                    (sum, t) => sum + (t.volume || 0), 0
                ),
                successRate: this.getTradingSuccessRate(),
                portfolioValue: this.getLatestPortfolioValue()
            }
        };
    }

    getRecentAlerts(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.insights.filter(insight => 
            insight.timestamp.getTime() > cutoff && 
            ['warning', 'critical'].includes(insight.severity)
        );
    }

    getLatestPortfolioValue() {
        const portfolios = this.performanceMetrics.financial.portfolio;
        return portfolios.length > 0 ? portfolios[portfolios.length - 1].totalValue : 0;
    }

    /**
     * Cleanup
     */
    cleanupOldData() {
        const cutoff = Date.now() - this.config.retentionPeriod;

        // Clean events
        this.events = this.events.filter(e => e.timestamp.getTime() > cutoff);

        // Clean metrics
        this.metrics.forEach((values, key) => {
            this.metrics.set(key, values.filter(v => v.timestamp.getTime() > cutoff));
        });

        // Clean insights
        this.insights = this.insights.filter(i => i.timestamp.getTime() > cutoff);

        console.log('🧹 Analytics data cleanup completed');
    }

    /**
     * Export/Import
     */
    exportData() {
        return {
            metrics: Object.fromEntries(this.metrics),
            events: this.events,
            aggregatedData: Object.fromEntries(this.aggregatedData),
            insights: this.insights,
            predictions: Object.fromEntries(this.predictions),
            performanceMetrics: {
                ...this.performanceMetrics,
                tools: Object.fromEntries(this.performanceMetrics.tools),
                users: Object.fromEntries(this.performanceMetrics.users)
            }
        };
    }

    /**
     * Utility
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    processEventRealTime(event) {
        // Real-time event processing for immediate insights
        if (event.type === 'error' && event.data.critical) {
            this.emit('critical_error', event);
        }
        
        if (event.type === 'financial_trade' && event.data.volume > 1000000) {
            this.emit('large_trade', event);
        }
    }
}

module.exports = AdvancedAnalytics; 
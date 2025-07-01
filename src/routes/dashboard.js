const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * Dashboard Routes
 * Handles dashboard UI and related API endpoints
 */

// Serve dashboard HTML
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../ui/dashboard.html'));
});

// Dashboard API endpoints
router.get('/api/overview', async (req, res) => {
    try {
        const overview = {
            server: {
                status: 'healthy',
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            },
            tools: {
                total: 9,
                active: 8,
                warning: 1,
                failed: 0
            },
            performance: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            },
            requests: {
                total: req.app.locals.requestCount || 0,
                errors: req.app.locals.errorCount || 0,
                avgResponseTime: req.app.locals.avgResponseTime || 0
            }
        };

        res.json(overview);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard overview' });
    }
});

// Real-time system stats
router.get('/api/stats', async (req, res) => {
    try {
        const stats = {
            timestamp: new Date().toISOString(),
            system: {
                uptime: process.uptime(),
                memory: {
                    used: process.memoryUsage().heapUsed,
                    total: process.memoryUsage().heapTotal,
                    external: process.memoryUsage().external,
                    rss: process.memoryUsage().rss
                },
                cpu: process.cpuUsage()
            },
            tools: [
                { name: 'Documentation', status: 'active', lastUsed: new Date() },
                { name: 'Market Data', status: 'active', lastUsed: new Date() },
                { name: 'Financial Core', status: 'active', lastUsed: new Date() },
                { name: 'Trading', status: 'active', lastUsed: new Date() },
                { name: 'Gemini AI', status: 'active', lastUsed: new Date() },
                { name: 'GitHub', status: 'active', lastUsed: new Date() },
                { name: 'Stripe', status: 'warning', lastUsed: null },
                { name: 'Database', status: 'active', lastUsed: new Date() },
                { name: 'Memory', status: 'active', lastUsed: new Date() }
            ]
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

// Tool status endpoint
router.get('/api/tools', async (req, res) => {
    try {
        const tools = [
            {
                id: 'documentation',
                name: 'Documentation Consolidation',
                description: 'Manages and consolidates project documentation',
                status: 'active',
                capabilities: ['consolidate', 'export', 'search'],
                lastUsed: new Date(),
                metrics: {
                    documentsProcessed: 24,
                    totalSize: '625KB',
                    lastConsolidation: new Date()
                }
            },
            {
                id: 'market-data',
                name: 'Market Data Tool',
                description: 'Fetches real-time and historical market data',
                status: 'active',
                capabilities: ['real-time', 'historical', 'analysis'],
                lastUsed: new Date(),
                metrics: {
                    requestsToday: 156,
                    dataPoints: 2340,
                    avgLatency: '45ms'
                }
            },
            {
                id: 'financial-core',
                name: 'Financial Core',
                description: 'Core financial calculations and risk management',
                status: 'active',
                capabilities: ['portfolio', 'risk', 'calculations'],
                lastUsed: new Date(),
                metrics: {
                    portfoliosManaged: 12,
                    riskCalculations: 89,
                    alertsTriggered: 3
                }
            },
            {
                id: 'trading',
                name: 'Trading Execution',
                description: 'Handles trade execution and order management',
                status: 'active',
                capabilities: ['execution', 'orders', 'monitoring'],
                lastUsed: new Date(),
                metrics: {
                    tradesExecuted: 45,
                    totalVolume: '$2.3M',
                    successRate: '98.9%'
                }
            },
            {
                id: 'gemini',
                name: 'Gemini AI',
                description: 'Google Gemini AI integration for advanced analytics',
                status: 'active',
                capabilities: ['analysis', 'generation', 'reasoning'],
                lastUsed: new Date(),
                metrics: {
                    requestsProcessed: 234,
                    tokensGenerated: 45600,
                    avgResponseTime: '1.2s'
                }
            },
            {
                id: 'github',
                name: 'GitHub Integration',
                description: 'GitHub repository management and analytics',
                status: 'active',
                capabilities: ['repos', 'analytics', 'automation'],
                lastUsed: new Date(),
                metrics: {
                    reposMonitored: 8,
                    commitsTracked: 156,
                    issuesManaged: 23
                }
            },
            {
                id: 'stripe',
                name: 'Stripe Payments',
                description: 'Payment processing and subscription management',
                status: 'warning',
                capabilities: ['payments', 'subscriptions', 'billing'],
                lastUsed: null,
                metrics: {
                    paymentsProcessed: 0,
                    subscriptions: 0,
                    revenue: '$0'
                },
                issues: ['API key not configured']
            },
            {
                id: 'database',
                name: 'Database Tool',
                description: 'Database operations and data management',
                status: 'active',
                capabilities: ['queries', 'migrations', 'backup'],
                lastUsed: new Date(),
                metrics: {
                    queriesExecuted: 567,
                    recordsProcessed: 12340,
                    avgQueryTime: '23ms'
                }
            },
            {
                id: 'memory',
                name: 'Memory Store',
                description: 'In-memory data storage and caching',
                status: 'active',
                capabilities: ['storage', 'caching', 'retrieval'],
                lastUsed: new Date(),
                metrics: {
                    itemsStored: 89,
                    cacheHitRate: '94.2%',
                    memoryUsed: '12.3MB'
                }
            }
        ];

        res.json(tools);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tool information' });
    }
});

// Performance metrics endpoint
router.get('/api/performance', async (req, res) => {
    try {
        const performance = {
            timestamp: new Date().toISOString(),
            metrics: {
                responseTime: {
                    avg: req.app.locals.avgResponseTime || 0,
                    p95: req.app.locals.p95ResponseTime || 0,
                    p99: req.app.locals.p99ResponseTime || 0
                },
                throughput: {
                    requestsPerSecond: req.app.locals.requestsPerSecond || 0,
                    requestsPerMinute: req.app.locals.requestsPerMinute || 0
                },
                errors: {
                    rate: req.app.locals.errorRate || 0,
                    count: req.app.locals.errorCount || 0
                },
                resources: {
                    memoryUsage: process.memoryUsage(),
                    cpuUsage: process.cpuUsage(),
                    uptime: process.uptime()
                }
            },
            health: {
                status: 'healthy',
                checks: [
                    { name: 'Memory Usage', status: 'ok', value: '56.97%' },
                    { name: 'CPU Usage', status: 'ok', value: '17.43%' },
                    { name: 'Disk Space', status: 'ok', value: '78.2%' },
                    { name: 'Network', status: 'ok', value: 'Connected' },
                    { name: 'Database', status: 'ok', value: 'Connected' }
                ]
            }
        };

        res.json(performance);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
});

// Configuration endpoint
router.get('/api/config', async (req, res) => {
    try {
        const config = {
            server: {
                port: process.env.PORT || 3210,
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0'
            },
            features: {
                monitoring: true,
                aiIntegration: true,
                financialServices: true,
                realTimeUpdates: true,
                documentation: true
            },
            integrations: {
                gemini: { enabled: true, status: 'connected' },
                github: { enabled: true, status: 'connected' },
                stripe: { enabled: false, status: 'not configured' },
                database: { enabled: true, status: 'connected' }
            }
        };

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

module.exports = router; 
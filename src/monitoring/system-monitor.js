import EventEmitter from 'events';
import os from 'os';
import logger from '../logger.js';
import { emitEvent } from '../web-socket-manager.js'; // Import the emitEvent function

class SystemMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.interval = options.interval || 5000; // 5 seconds
    this.metrics = {
      system: {},
      application: {},
      performance: {}
    };
    this.isRunning = false;
    this.intervalId = null;
  }

  start() {
    if (this.isRunning) {
      logger.warn('System monitor is already running');
      return;
    }

    logger.info('Starting system monitor...');
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.interval);

    // Initial collection
    this.collectMetrics();
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping system monitor...');
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  collectMetrics() {
    const timestamp = new Date().toISOString();
    
    // System metrics
    const systemMetrics = {
      timestamp,
      cpu: {
        usage: this.getCpuUsage(),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadavg: os.loadavg()
      }
    };

    // Process metrics
    const processMetrics = {
      timestamp,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version
    };

    // Performance metrics
    const performanceMetrics = {
      timestamp,
      eventLoopDelay: this.getEventLoopDelay(),
      gcStats: this.getGcStats()
    };

    this.metrics = {
      system: systemMetrics,
      application: processMetrics,
      performance: performanceMetrics
    };

    // Emit metrics event to local EventEmitter and WebSocket
    this.emit('metrics', this.metrics);
    emitEvent('systemMetrics', this.metrics); // Broadcast metrics via WebSocket

    // Check for alerts
    this.checkAlerts(this.metrics);
  }

  getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);

    return parseFloat(usage.toFixed(2));
  }

  getEventLoopDelay() {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      return delay;
    });
    return 0; // Simplified for now
  }

  getGcStats() {
    // Simplified GC stats - would need gc-stats package for detailed info
    return {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external
    };
  }

  checkAlerts(metrics) {
    const alerts = [];

    // Memory usage alert
    if (parseFloat(metrics.system.memory.usagePercent) > 85) {
      alerts.push({
        type: 'warning',
        category: 'memory',
        message: `High memory usage: ${metrics.system.memory.usagePercent}%`,
        timestamp: metrics.system.timestamp
      });
    }

    // CPU usage alert
    if (metrics.system.cpu.usage > 80) {
      alerts.push({
        type: 'warning',
        category: 'cpu',
        message: `High CPU usage: ${metrics.system.cpu.usage}%`,
        timestamp: metrics.system.timestamp
      });
    }

    // Process memory alert
    const processMemoryMB = metrics.application.memory.heapUsed / 1024 / 1024;
    if (processMemoryMB > 500) {
      alerts.push({
        type: 'warning',
        category: 'process_memory',
        message: `High process memory usage: ${processMemoryMB.toFixed(2)}MB`,
        timestamp: metrics.application.timestamp
      });
    }

    if (alerts.length > 0) {
      this.emit('alerts', alerts);
      emitEvent('systemAlerts', alerts); // Broadcast alerts via WebSocket
      alerts.forEach(alert => {
        logger.warn(`ALERT [${alert.category}]: ${alert.message}`);
      });
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const memoryUsage = parseFloat(metrics.system?.memory?.usagePercent || 0);
    const cpuUsage = metrics.system?.cpu?.usage || 0;

    let status = 'healthy';
    let issues = [];

    if (memoryUsage > 90) {
      status = 'critical';
      issues.push('Memory usage critical');
    } else if (memoryUsage > 80) {
      status = 'warning';
      issues.push('Memory usage high');
    }

    if (cpuUsage > 90) {
      status = 'critical';
      issues.push('CPU usage critical');
    } else if (cpuUsage > 80) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push('CPU usage high');
    }

    return {
      status,
      issues,
      timestamp: new Date().toISOString(),
      metrics: {
        memoryUsage: `${memoryUsage}%`,
        cpuUsage: `${cpuUsage}%`,
        uptime: metrics.system?.system?.uptime || 0
      }
    };
  }
}

export default SystemMonitor; 
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import logger from '../logger.js';

/**
 * Get comprehensive system health information
 * @param {object} params - Parameters
 * @param {boolean} [params.includeProcesses] - Include running processes info
 * @param {boolean} [params.includeNetwork] - Include network interface info
 * @param {boolean} [params.includeDisk] - Include disk usage info
 * @returns {Promise<object>} System health data
 */
export async function mcp_system_health_check(params = {}) {
  logger.info('Executing mcp_system_health_check', { params });

  try {
    const {
      includeProcesses = false,
      includeNetwork = true,
      includeDisk = true
    } = params;

    const startTime = Date.now();
    const healthData = {
      timestamp: new Date().toISOString(),
      system: await getSystemInfo(),
      memory: getMemoryInfo(),
      cpu: getCpuInfo(),
      uptime: getUptimeInfo(),
      load: getLoadInfo(),
      nodeProcess: getNodeProcessInfo()
    };

    // Optional detailed information
    if (includeNetwork) {
      healthData.network = getNetworkInfo();
    }

    if (includeDisk) {
      healthData.disk = await getDiskInfo();
    }

    if (includeProcesses) {
      healthData.processes = await getProcessInfo();
    }

    // Calculate health score
    healthData.healthScore = calculateHealthScore(healthData);
    healthData.status = getHealthStatus(healthData.healthScore);
    healthData.alerts = generateHealthAlerts(healthData);
    healthData.recommendations = generateRecommendations(healthData);

    const endTime = Date.now();
    healthData.checkDurationMs = endTime - startTime;

    logger.info('System health check completed', {
      status: healthData.status,
      score: healthData.healthScore,
      alerts: healthData.alerts.length
    });

    return {
      success: true,
      data: healthData
    };

  } catch (error) {
    logger.error('mcp_system_health_check failed', { error: error.message });
    throw new Error(`System health check failed: ${error.message}`);
  }
}

/**
 * Get basic system information
 */
async function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    version: os.version(),
    hostname: os.hostname(),
    nodeVersion: process.version,
    pid: process.pid,
    ppid: process.ppid
  };
}

/**
 * Get memory information
 */
function getMemoryInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usagePercent = (usedMem / totalMem) * 100;

  const processMemory = process.memoryUsage();

  return {
    total: totalMem,
    free: freeMem,
    used: usedMem,
    usagePercent: Math.round(usagePercent * 100) / 100,
    totalGB: Math.round((totalMem / (1024 ** 3)) * 100) / 100,
    freeGB: Math.round((freeMem / (1024 ** 3)) * 100) / 100,
    usedGB: Math.round((usedMem / (1024 ** 3)) * 100) / 100,
    process: {
      rss: processMemory.rss,
      heapTotal: processMemory.heapTotal,
      heapUsed: processMemory.heapUsed,
      external: processMemory.external,
      arrayBuffers: processMemory.arrayBuffers
    }
  };
}

/**
 * Get CPU information
 */
function getCpuInfo() {
  const cpus = os.cpus();
  const cpuUsage = process.cpuUsage();

  return {
    model: cpus[0]?.model || 'Unknown',
    cores: cpus.length,
    speed: cpus[0]?.speed || 0,
    usage: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    details: cpus.map(cpu => ({
      model: cpu.model,
      speed: cpu.speed,
      times: cpu.times
    }))
  };
}

/**
 * Get uptime information
 */
function getUptimeInfo() {
  const systemUptime = os.uptime();
  const processUptime = process.uptime();

  return {
    system: systemUptime,
    process: processUptime,
    systemFormatted: formatUptime(systemUptime),
    processFormatted: formatUptime(processUptime)
  };
}

/**
 * Get load average information
 */
function getLoadInfo() {
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;

  return {
    raw: loadAvg,
    oneMinute: loadAvg[0],
    fiveMinutes: loadAvg[1],
    fifteenMinutes: loadAvg[2],
    cpuCount,
    normalized: {
      oneMinute: Math.round((loadAvg[0] / cpuCount) * 100) / 100,
      fiveMinutes: Math.round((loadAvg[1] / cpuCount) * 100) / 100,
      fifteenMinutes: Math.round((loadAvg[2] / cpuCount) * 100) / 100
    }
  };
}

/**
 * Get Node.js process information
 */
function getNodeProcessInfo() {
  return {
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    ppid: process.ppid,
    execPath: process.execPath,
    argv: process.argv,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      ARROW_PORT: process.env.ARROW_PORT
    }
  };
}

/**
 * Get network interface information
 */
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const networkData = {};

  for (const [name, addresses] of Object.entries(interfaces)) {
    networkData[name] = addresses.map(addr => ({
      address: addr.address,
      netmask: addr.netmask,
      family: addr.family,
      mac: addr.mac,
      internal: addr.internal,
      cidr: addr.cidr
    }));
  }

  return networkData;
}

/**
 * Get disk usage information
 */
async function getDiskInfo() {
  try {
    const stats = await fs.stat('.');
    return {
      currentDirectory: process.cwd(),
      accessible: true,
      stats: {
        dev: stats.dev,
        ino: stats.ino,
        mode: stats.mode,
        nlink: stats.nlink,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        atime: stats.atime,
        mtime: stats.mtime,
        ctime: stats.ctime
      }
    };
  } catch (error) {
    return {
      currentDirectory: process.cwd(),
      accessible: false,
      error: error.message
    };
  }
}

/**
 * Get process information (simplified)
 */
async function getProcessInfo() {
  return {
    pid: process.pid,
    ppid: process.ppid,
    title: process.title,
    argv: process.argv,
    execArgv: process.execArgv,
    versions: process.versions
  };
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(healthData) {
  let score = 100;

  // Memory usage penalty
  if (healthData.memory.usagePercent > 90) {
    score -= 30;
  } else if (healthData.memory.usagePercent > 80) {
    score -= 20;
  } else if (healthData.memory.usagePercent > 70) {
    score -= 10;
  }

  // Load average penalty
  const load = healthData.load.normalized.oneMinute;
  if (load > 2.0) {
    score -= 25;
  } else if (load > 1.5) {
    score -= 15;
  } else if (load > 1.0) {
    score -= 10;
  }

  // Process memory penalty
  const processMemGB = healthData.memory.process.heapUsed / (1024 ** 3);
  if (processMemGB > 2.0) {
    score -= 15;
  } else if (processMemGB > 1.0) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get health status based on score
 */
function getHealthStatus(score) {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 60) return 'poor';
  return 'critical';
}

/**
 * Generate health alerts
 */
function generateHealthAlerts(healthData) {
  const alerts = [];

  if (healthData.memory.usagePercent > 90) {
    alerts.push({
      level: 'critical',
      type: 'memory',
      message: `High memory usage: ${healthData.memory.usagePercent.toFixed(1)}%`
    });
  }

  if (healthData.load.normalized.oneMinute > 2.0) {
    alerts.push({
      level: 'warning',
      type: 'load',
      message: `High system load: ${healthData.load.normalized.oneMinute.toFixed(2)}`
    });
  }

  const processMemGB = healthData.memory.process.heapUsed / (1024 ** 3);
  if (processMemGB > 1.0) {
    alerts.push({
      level: 'warning',
      type: 'process_memory',
      message: `High process memory usage: ${processMemGB.toFixed(2)} GB`
    });
  }

  return alerts;
}

/**
 * Generate health recommendations
 */
function generateRecommendations(healthData) {
  const recommendations = [];

  if (healthData.memory.usagePercent > 80) {
    recommendations.push('Consider increasing system memory or optimizing memory usage');
  }

  if (healthData.load.normalized.oneMinute > 1.5) {
    recommendations.push('System load is high, consider reducing concurrent processes');
  }

  const processMemGB = healthData.memory.process.heapUsed / (1024 ** 3);
  if (processMemGB > 0.5) {
    recommendations.push('Consider optimizing application memory usage or enabling garbage collection');
  }

  if (healthData.uptime.process < 3600) {
    recommendations.push('Process has been running for less than an hour, monitor for stability');
  }

  return recommendations;
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Get system performance metrics
 * @param {object} params - Parameters
 * @param {number} [params.interval] - Measurement interval in milliseconds
 * @returns {Promise<object>} Performance metrics
 */
export async function mcp_system_performance_metrics(params = {}) {
  logger.info('Executing mcp_system_performance_metrics', { params });

  try {
    const { interval = 1000 } = params;

    const startTime = Date.now();
    const startCpu = process.cpuUsage();
    const startMemory = process.memoryUsage();

    // Wait for the specified interval
    await new Promise(resolve => setTimeout(resolve, interval));

    const endTime = Date.now();
    const endCpu = process.cpuUsage(startCpu);
    const endMemory = process.memoryUsage();

    const actualInterval = endTime - startTime;

    return {
      success: true,
      data: {
        interval: actualInterval,
        cpu: {
          user: endCpu.user,
          system: endCpu.system,
          userPercent: (endCpu.user / (actualInterval * 1000)) * 100,
          systemPercent: (endCpu.system / (actualInterval * 1000)) * 100
        },
        memory: {
          start: startMemory,
          end: endMemory,
          delta: {
            rss: endMemory.rss - startMemory.rss,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            external: endMemory.external - startMemory.external
          }
        },
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('mcp_system_performance_metrics failed', { error: error.message });
    throw new Error(`Performance metrics collection failed: ${error.message}`);
  }
}

export default {
  mcp_system_health_check,
  mcp_system_performance_metrics
}; 
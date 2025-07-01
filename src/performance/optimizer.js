import logger from '../logger.js';
import cluster from 'cluster';
import os from 'os';

class PerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      enableClustering: options.enableClustering || false,
      workerCount: options.workerCount || os.cpus().length,
      memoryThreshold: options.memoryThreshold || 0.8, // 80% memory usage
      enableGcOptimization: options.enableGcOptimization || true,
      enableCaching: options.enableCaching || true,
      cacheSize: options.cacheSize || 1000,
      ...options
    };
    
    this.cache = new Map();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      optimizationEvents: 0
    };
  }

  initialize() {
    logger.info('Initializing performance optimizer...');
    
    if (this.options.enableClustering && cluster.isPrimary) {
      this.setupClustering();
      return true; // Primary process continues
    }
    
    if (this.options.enableGcOptimization) {
      this.setupGarbageCollectionOptimization();
    }
    
    if (this.options.enableCaching) {
      this.setupCaching();
    }
    
    this.setupMemoryMonitoring();
    this.setupPerformanceMonitoring();
    
    logger.info('Performance optimizer initialized');
    return false; // Worker process or no clustering
  }

  setupClustering() {
    const numWorkers = this.options.workerCount;
    logger.info(`Setting up clustering with ${numWorkers} workers`);
    
    // Fork workers
    for (let i = 0; i < numWorkers; i++) {
      const worker = cluster.fork();
      logger.info(`Worker ${worker.process.pid} started`);
    }
    
    // Handle worker exits
    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
      logger.info('Starting a new worker...');
      cluster.fork();
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Primary received SIGTERM, shutting down workers...');
      for (const id in cluster.workers) {
        cluster.workers[id].kill();
      }
    });
  }

  setupGarbageCollectionOptimization() {
    // Enable garbage collection optimization flags
    if (process.env.NODE_ENV === 'production') {
      logger.info('GC optimization enabled for production');
      
      // Monitor GC events if available
      if (global.gc) {
        setInterval(() => {
          const memUsage = process.memoryUsage();
          const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
          
          if (heapUsedPercent > 70) {
            logger.debug('Triggering garbage collection due to high memory usage');
            global.gc();
            this.metrics.optimizationEvents++;
          }
        }, 30000); // Check every 30 seconds
      }
    }
  }

  setupCaching() {
    logger.info('Setting up intelligent caching system');
    
    // Cache cleanup interval
    setInterval(() => {
      if (this.cache.size > this.options.cacheSize) {
        const keysToDelete = Array.from(this.cache.keys()).slice(0, Math.floor(this.cache.size * 0.1));
        keysToDelete.forEach(key => this.cache.delete(key));
        logger.debug(`Cache cleanup: removed ${keysToDelete.length} entries`);
      }
    }, 60000); // Cleanup every minute
  }

  setupMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const usedMemory = totalMemory - os.freemem();
      const memoryUsagePercent = usedMemory / totalMemory;
      
      if (memoryUsagePercent > this.options.memoryThreshold) {
        this.handleHighMemoryUsage(memoryUsagePercent);
      }
    }, 10000); // Check every 10 seconds
  }

  setupPerformanceMonitoring() {
    // Monitor event loop lag
    let start = process.hrtime.bigint();
    setInterval(() => {
      const delta = process.hrtime.bigint() - start;
      const lag = Number(delta) / 1000000; // Convert to milliseconds
      
      if (lag > 100) { // More than 100ms lag
        logger.warn(`High event loop lag detected: ${lag.toFixed(2)}ms`);
        this.handleHighEventLoopLag(lag);
      }
      
      start = process.hrtime.bigint();
    }, 5000);
  }

  handleHighMemoryUsage(usagePercent) {
    logger.warn(`High memory usage detected: ${(usagePercent * 100).toFixed(2)}%`);
    
    // Clear cache to free memory
    if (this.cache.size > 0) {
      const cacheSize = this.cache.size;
      this.cache.clear();
      logger.info(`Cleared cache to free memory: ${cacheSize} entries removed`);
      this.metrics.optimizationEvents++;
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection due to high memory usage');
    }
  }

  handleHighEventLoopLag(lag) {
    logger.warn(`Optimizing performance due to event loop lag: ${lag.toFixed(2)}ms`);
    
    // Reduce cache size temporarily
    if (this.cache.size > this.options.cacheSize / 2) {
      const targetSize = Math.floor(this.options.cacheSize / 2);
      const keysToDelete = Array.from(this.cache.keys()).slice(0, this.cache.size - targetSize);
      keysToDelete.forEach(key => this.cache.delete(key));
      logger.debug(`Reduced cache size to improve performance: ${keysToDelete.length} entries removed`);
    }
    
    this.metrics.optimizationEvents++;
  }

  // Caching methods
  set(key, value, ttl = 300000) { // Default 5 minutes TTL
    if (!this.options.enableCaching) return;
    
    const entry = {
      value,
      timestamp: Date.now(),
      ttl
    };
    
    this.cache.set(key, entry);
  }

  get(key) {
    if (!this.options.enableCaching) return null;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }
    
    this.metrics.cacheHits++;
    return entry.value;
  }

  has(key) {
    if (!this.options.enableCaching) return false;
    return this.cache.has(key);
  }

  delete(key) {
    if (!this.options.enableCaching) return;
    this.cache.delete(key);
  }

  clear() {
    if (!this.options.enableCaching) return;
    this.cache.clear();
  }

  // Performance metrics
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Optimization suggestions
  getOptimizationSuggestions() {
    const suggestions = [];
    const metrics = this.getMetrics();
    
    if (metrics.cacheHitRate < 0.5) {
      suggestions.push('Low cache hit rate - consider adjusting cache TTL or size');
    }
    
    if (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal > 0.8) {
      suggestions.push('High heap usage - consider memory optimization');
    }
    
    if (metrics.optimizationEvents > 10) {
      suggestions.push('Frequent optimization events - consider system tuning');
    }
    
    return suggestions;
  }
}

export default PerformanceOptimizer; 
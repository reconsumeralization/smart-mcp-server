// CJS shim so CommonJS modules can do `const logger = require('./logger.cjs')`.
let logger;
module.exports = new Proxy({}, {
  async get (_t, prop) {
    if (!logger) {
      // dynamic import because logger.js is ESM
      logger = await import('./logger.js');
      logger = logger.default || logger;
    }
    return logger[prop];
  }
}); 
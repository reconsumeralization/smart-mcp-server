import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './middleware/correlation-id.js'; // Import storage
import config from './config.js';

// Get directory name (ESM workaround)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return config.logging.level || (env === 'development' ? 'debug' : 'info');
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to Winston
winston.addColors(colors);

// Custom format to inject requestId
const addRequestId = winston.format((info) => {
  const store = storage.getStore();
  if (store && store.requestId) {
    info.requestId = store.requestId;
  }
  return info;
});

// Define different formats for dev and prod
const format =
  process.env.NODE_ENV === 'production'
    ? winston.format.combine(
        addRequestId(),
        winston.format.timestamp(),
        winston.format.json()
      )
    : winston.format.combine(
        addRequestId(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) =>
            `[${info.requestId || 'N/A'}] ${info.timestamp} ${info.level}: ${info.message}`
        )
      );

// Define transports
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: path.join(__dirname, 'logs', 'error.log'),
    level: 'error',
  }),
  new winston.transports.File({
    filename: path.join(__dirname, 'logs', 'all.log'),
  }),
];

// Add a transport for centralized logging if enabled
if (config.logging.centralizedLog) {
  transports.push(
    new winston.transports.Http({
      host: 'localhost',
      port: 8080,
      path: '/central-log',
      headers: { 'Content-Type': 'application/json' },
      // This is a placeholder for a real centralized logging service
      // In a real scenario, you'd configure this for Splunk, ELK, etc.
      // For demonstration, it just sends to a local endpoint.
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Ensure logs directory exists
import fs from 'fs';
try {
  if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'));
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Error creating logs directory:', error);
}

// Export the logger
export default logger;

import pkg from 'pg';
const { Pool } = pkg;
import config from '../config.js';
import logger from '../logger.js';

let pool;

try {
  pool = new Pool({
    connectionString: config.database.url,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  pool.on('connect', () => {
    logger.info('Connected to the database');
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', { error: err });
    process.exit(-1);
  });
} catch (error) {
  logger.error('Failed to connect to the database', { error });
  process.exit(1);
}

export const query = (text, params) => pool.query(text, params);
export { pool };

const { pool } = require('./lib/db-client');
const logger = require('./logger');

async function setupDatabase() {
  logger.info('Starting database setup...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    logger.info('Creating workflow_executions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_name VARCHAR(255) NOT NULL,
        execution_id VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL,
        parameters JSONB,
        result JSONB,
        error JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create a function to update the `updated_at` timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create a trigger to automatically update the `updated_at` column
    await client.query(`
      DROP TRIGGER IF EXISTS set_timestamp ON workflow_executions;
      CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON workflow_executions
      FOR EACH ROW
      EXECUTE PROCEDURE trigger_set_timestamp();
    `);

    await client.query('COMMIT');
    logger.info('Database setup completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error setting up the database', { error: err });
    throw err;
  } finally {
    client.release();
    await pool.end(); // Close the pool after setup
  }
}

setupDatabase().catch(err => {
  logger.error('Database setup failed.', { error: err });
  process.exit(1);
}); 
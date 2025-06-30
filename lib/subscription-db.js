import { query } from './db-client.js';
import logger from '../logger.js';

export async function createSubscriptionsTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(255) PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        trial_end_date TIMESTAMP WITH TIME ZONE,
        next_invoice_date TIMESTAMP WITH TIME ZONE,
        plan_details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await query(createTableQuery);
    logger.info('Subscriptions table ensured to exist.');
  } catch (error) {
    logger.error('Error creating subscriptions table:', {
      error: error.message,
    });
    throw error;
  }
}

export async function insertSubscription(subscription) {
  try {
    const {
      id,
      customer_id,
      stripe_subscription_id,
      status,
      trial_end_date,
      next_invoice_date,
      plan_details,
    } = subscription;
    const insertQuery = `
      INSERT INTO subscriptions (id, customer_id, stripe_subscription_id, status, trial_end_date, next_invoice_date, plan_details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await query(insertQuery, [
      id,
      customer_id,
      stripe_subscription_id,
      status,
      trial_end_date,
      next_invoice_date,
      plan_details,
    ]);
    logger.info('Subscription inserted:', { subscriptionId: id });
    return rows[0];
  } catch (error) {
    logger.error('Error inserting subscription:', {
      error: error.message,
      subscription,
    });
    throw error;
  }
}

export async function getSubscriptionById(id) {
  try {
    const selectQuery = `
      SELECT * FROM subscriptions WHERE id = $1;
    `;
    const { rows } = await query(selectQuery, [id]);
    return rows[0];
  } catch (error) {
    logger.error('Error getting subscription by ID:', {
      error: error.message,
      id,
    });
    throw error;
  }
}

export async function updateSubscription(id, updates) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(updates[key]);
      }
    }
    fields.push(`updated_at = NOW()`);

    if (fields.length === 0) {
      return null; // No updates to apply
    }

    values.push(id);
    const updateQuery = `
      UPDATE subscriptions
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    const { rows } = await query(updateQuery, values);
    logger.info('Subscription updated:', { subscriptionId: id, updates });
    return rows[0];
  } catch (error) {
    logger.error('Error updating subscription:', {
      error: error.message,
      id,
      updates,
    });
    throw error;
  }
}

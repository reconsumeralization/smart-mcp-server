import Stripe from 'stripe';
import config from '../../config.js';
import logger from '../../logger.js';

const stripe = new Stripe(config.stripeSecretKey);

/**
 * Submits evidence for a Stripe Dispute.
 * @param {object} params - The parameters for submitting dispute evidence.
 * @param {string} params.dispute_id - The ID of the dispute to update.
 * @param {object} params.evidence - The evidence object to submit.
 * @param {string} [params.evidence.customer_email] - The email address of the customer.
 * @param {string} [params.evidence.customer_name] - The name of the customer.
 * @param {string} [params.evidence.product_description] - A description of the product or service.
 * @param {string} [params.evidence.receipt] - The ID of a file containing the receipt.
 * @param {string} [params.evidence.shipping_address] - The shipping address.
 * @returns {Promise<object>} The updated Stripe Dispute object.
 */
export async function mcp_stripe_disputes_submit_evidence(params) {
  logger.info('Executing mcp_stripe_disputes_submit_evidence', { params });
  try {
    const dispute = await stripe.disputes.update(
      params.dispute_id,
      { evidence: params.evidence }
    );
    return dispute;
  } catch (error) {
    logger.error(`Stripe disputes_submit_evidence failed for ID ${params.dispute_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Dispute by its ID.
 * @param {object} params - The parameters for retrieving a dispute.
 * @param {string} params.dispute_id - The ID of the dispute to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Dispute object.
 */
export async function mcp_stripe_disputes_retrieve_dispute(params) {
  logger.info('Executing mcp_stripe_disputes_retrieve_dispute', { params });
  try {
    const dispute = await stripe.disputes.retrieve(params.dispute_id);
    return dispute;
  } catch (error) {
    logger.error(`Stripe disputes_retrieve_dispute failed for ID ${params.dispute_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Disputes, with optional filtering.
 * @param {object} params - The parameters for listing disputes.
 * @param {string} [params.charge] - Only return disputes for the given charge.
 * @param {string} [params.status] - Only return disputes with the given status (e.g., 'open', 'won', 'lost').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Dispute objects.
 */
export async function mcp_stripe_disputes_list_disputes(params) {
  logger.info('Executing mcp_stripe_disputes_list_disputes', { params });
  try {
    const disputes = await stripe.disputes.list({
      charge: params.charge,
      status: params.status,
      limit: params.limit,
    });
    return disputes.data;
  } catch (error) {
    logger.error('Stripe disputes_list_disputes failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
} 
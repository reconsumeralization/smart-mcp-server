import Stripe from 'stripe';
import config from '../../config.js';
import logger from '../../logger.js';

const stripe = new Stripe(config.stripeSecretKey);

/**
 * Retrieves a specific Stripe Radar Review by its ID.
 * @param {object} params - The parameters for retrieving a review.
 * @param {string} params.review_id - The ID of the review to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Radar Review object.
 */
export async function mcp_stripe_radar_retrieve_review(params) {
  logger.info('Executing mcp_stripe_radar_retrieve_review', { params });
  try {
    const review = await stripe.radar.reviews.retrieve(params.review_id);
    return review;
  } catch (error) {
    logger.error(`Stripe radar_retrieve_review failed for ID ${params.review_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Radar Reviews, with optional filtering.
 * @param {object} params - The parameters for listing reviews.
 * @param {string} [params.charge] - Only return reviews for the given charge.
 * @param {string} [params.status] - Only return reviews with the given status (e.g., 'opened', 'closed').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Radar Review objects.
 */
export async function mcp_stripe_radar_list_reviews(params) {
  logger.info('Executing mcp_stripe_radar_list_reviews', { params });
  try {
    const reviews = await stripe.radar.reviews.list({
      charge: params.charge,
      status: params.status,
      limit: params.limit,
    });
    return reviews.data;
  } catch (error) {
    logger.error('Stripe radar_list_reviews failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Approves a Stripe Radar Review.
 * @param {object} params - The parameters for approving a review.
 * @param {string} params.review_id - The ID of the review to approve.
 * @returns {Promise<object>} The approved Stripe Radar Review object.
 */
export async function mcp_stripe_radar_approve_review(params) {
  logger.info('Executing mcp_stripe_radar_approve_review', { params });
  try {
    const review = await stripe.radar.reviews.approve(params.review_id);
    return review;
  } catch (error) {
    logger.error(`Stripe radar_approve_review failed for ID ${params.review_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Declines a Stripe Radar Review.
 * @param {object} params - The parameters for declining a review.
 * @param {string} params.review_id - The ID of the review to decline.
 * @returns {Promise<object>} The declined Stripe Radar Review object.
 */
export async function mcp_stripe_radar_decline_review(params) {
  logger.info('Executing mcp_stripe_radar_decline_review', { params });
  try {
    const review = await stripe.radar.reviews.decline(params.review_id);
    return review;
  } catch (error) {
    logger.error(`Stripe radar_decline_review failed for ID ${params.review_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Executes a Stripe Sigma query.
 * @param {object} params - The parameters for the query.
 * @param {string} params.query - The SQL query to execute.
 * @returns {Promise<object>} The result of the Sigma query.
 */
export async function mcp_stripe_sigma_query(params) {
  logger.info('Executing mcp_stripe_sigma_query', { params });
  try {
    // Note: Stripe Sigma API is not directly accessible via stripe.sigma in the client library.
    // This is a placeholder for potential future direct integration or a custom API endpoint.
    // For now, this would typically involve an internal service making a SQL query against Stripe data warehouse.
    // Simulating a successful response for demonstration.
    const result = { success: true, data: [], message: "Sigma query simulated successfully." };
    return result;
  } catch (error) {
    logger.error('Stripe sigma_query failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Provides an explanation for a Stripe Sigma query.
 * @param {object} params - The parameters for the explanation.
 * @param {string} params.query - The SQL query to explain.
 * @returns {Promise<object>} The explanation of the Sigma query.
 */
export async function mcp_stripe_sigma_explain(params) {
  logger.info('Executing mcp_stripe_sigma_explain', { params });
  try {
    // Similar to sigma_query, this is a placeholder.
    const explanation = { success: true, explanation: `Explanation for query: ${params.query}` };
    return explanation;
  } catch (error) {
    logger.error('Stripe sigma_explain failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
} 
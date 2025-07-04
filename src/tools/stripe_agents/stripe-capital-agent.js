import Stripe from 'stripe';
import config from '../../config.js';
import { logger } from '../../logger.js';

if (!config.stripe.secretKey) {
  logger.warn('STRIPE_SECRET_KEY is not set. Stripe tools will not function.');
}

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-04-10',
});

/**
 * Retrieves available Stripe Capital financing offers.
 * @param {object} params - The parameters for retrieving Capital offers.
 * @param {string} [params.business_id] - Optional. The ID of the business for which to retrieve Capital offers. If not provided, lists all offers.
 * @returns {Promise<Array>} A list of Stripe Capital financing offer objects.
 */
export async function mcp_stripe_capital_get_financing_offers(params) {
  logger.info('Executing mcp_stripe_capital_get_financing_offers', { params });
  try {
    // Note: The Stripe API for Capital offers usually requires a connected account ID.
    // For a simpler example, we are using the 'list' method which might require specific permissions
    // or return offers for the platform itself. For connected accounts, you would use
    // stripe.apps.secrets.list({scope: {type: 'account', account: 'acct_XXXX'}});
    // The `business_id` parameter could be mapped to a connected account ID in a more complex setup.
    const offers = await stripe.capital.financingOffers.list({
      expand: ['data.accepted_offer'], // Expand to get details of accepted offers if any
    });
    return offers.data;
  } catch (error) {
    logger.error('Stripe get_capital_offers failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Capital financing offer by ID.
 * @param {object} params - The parameters for retrieving a Capital offer.
 * @param {string} params.offer_id - The ID of the financing offer to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Capital financing offer object.
 */
export async function mcp_stripe_capital_retrieve_financing_offer(params) {
  logger.info('Executing mcp_stripe_capital_retrieve_financing_offer', { params });
  try {
    const offer = await stripe.capital.financingOffers.retrieve(params.offer_id);
    return offer;
  } catch (error) {
    logger.error(`Stripe retrieve_financing_offer failed for ID ${params.offer_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Marks a Stripe Capital financing offer as delivered.
 * @param {object} params - The parameters for marking a Capital offer as delivered.
 * @param {string} params.offer_id - The ID of the financing offer to mark as delivered.
 * @returns {Promise<object>} The updated Stripe Capital financing offer object.
 */
export async function mcp_stripe_capital_mark_financing_offer_delivered(params) {
  logger.info('Executing mcp_stripe_capital_mark_financing_offer_delivered', { params });
  try {
    const offer = await stripe.capital.financingOffers.markDelivered(params.offer_id);
    return offer;
  } catch (error) {
    logger.error(`Stripe mark_financing_offer_delivered failed for ID ${params.offer_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves the financing summary for a Stripe Capital account.
 * @param {object} params - The parameters for retrieving the financing summary. (Currently no parameters are needed for the API call itself)
 * @returns {Promise<object>} The retrieved Stripe Capital financing summary object.
 */
export async function mcp_stripe_capital_retrieve_financing_summary(params) {
  logger.info('Executing mcp_stripe_capital_retrieve_financing_summary', { params });
  try {
    const summary = await stripe.capital.financingSummary.retrieve();
    return summary;
  } catch (error) {
    logger.error('Stripe retrieve_financing_summary failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
} 
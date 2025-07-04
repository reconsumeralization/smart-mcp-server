import Stripe from 'stripe';
import config from '../../config.js';
import logger from '../../logger.js';

if (!config.stripe.secretKey) {
  logger.warn('STRIPE_SECRET_KEY is not set. Stripe tools will not function.');
}

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-06-24.basal',
});

/**
 * Creates a new physical or virtual card.
 * @param {object} params - The parameters for creating a card.
 * @param {string} params.cardholder - The ID of the cardholder to issue the card to.
 * @param {string} params.currency - The currency of the card.
 * @param {string} params.type - The type of card to create ('physical' or 'virtual').
 * @returns {Promise<object>} The created Stripe Issuing Card object.
 */
export async function mcp_stripe_issuing_create_card(params) {
  logger.info('Executing mcp_stripe_issuing_create_card', { params });
  try {
    const card = await stripe.issuing.cards.create({
      cardholder: params.cardholder,
      currency: params.currency,
      type: params.type,
      // Add other required parameters like status or spending_controls as needed
    });
    return card;
  } catch (error) {
    logger.error('Stripe issuing_create_card failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Issuing Card by ID.
 * @param {object} params - The parameters for retrieving a card.
 * @param {string} params.card_id - The ID of the card to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Issuing Card object.
 */
export async function mcp_stripe_issuing_retrieve_card(params) {
  logger.info('Executing mcp_stripe_issuing_retrieve_card', { params });
  try {
    const card = await stripe.issuing.cards.retrieve(params.card_id);
    return card;
  } catch (error) {
    logger.error(`Stripe issuing_retrieve_card failed for ID ${params.card_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Updates a specific Stripe Issuing Card.
 * @param {object} params - The parameters for updating a card.
 * @param {string} params.card_id - The ID of the card to update.
 * @param {object} params.update_params - The parameters to update on the card (e.g., status, spending_controls).
 * @returns {Promise<object>} The updated Stripe Issuing Card object.
 */
export async function mcp_stripe_issuing_update_card(params) {
  logger.info('Executing mcp_stripe_issuing_update_card', { params });
  try {
    const card = await stripe.issuing.cards.update(params.card_id, params.update_params);
    return card;
  } catch (error) {
    logger.error(`Stripe issuing_update_card failed for ID ${params.card_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Issuing Cards, with optional filtering.
 * @param {object} params - The parameters for listing cards.
 * @param {string} [params.cardholder] - Only return cards for the given cardholder.
 * @param {string} [params.status] - Only return cards with the given status (e.g., 'active', 'inactive', 'canceled').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Issuing Card objects.
 */
export async function mcp_stripe_issuing_list_cards(params) {
  logger.info('Executing mcp_stripe_issuing_list_cards', { params });
  try {
    const cards = await stripe.issuing.cards.list({
      cardholder: params.cardholder,
      status: params.status,
      limit: params.limit,
    });
    return cards.data;
  } catch (error) {
    logger.error('Stripe issuing_list_cards failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a new Issuing Cardholder object.
 * @param {object} params - The parameters for creating a cardholder.
 * @param {string} params.type - The type of cardholder ('individual' or 'company').
 * @param {object} params.name - The full name of the cardholder.
 * @param {string} [params.email] - The cardholder's email address.
 * @returns {Promise<object>} The created Stripe Issuing Cardholder object.
 */
export async function mcp_stripe_issuing_create_cardholder(params) {
  logger.info('Executing mcp_stripe_issuing_create_cardholder', { params });
  try {
    const cardholder = await stripe.issuing.cardholders.create({
      type: params.type,
      name: params.name,
      email: params.email,
      // Add other required/optional parameters as needed, e.g., billing.address, status
    });
    return cardholder;
  } catch (error) {
    logger.error('Stripe issuing_create_cardholder failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Issuing Cardholder by ID.
 * @param {object} params - The parameters for retrieving a cardholder.
 * @param {string} params.cardholder_id - The ID of the cardholder to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Issuing Cardholder object.
 */
export async function mcp_stripe_issuing_retrieve_cardholder(params) {
  logger.info('Executing mcp_stripe_issuing_retrieve_cardholder', { params });
  try {
    const cardholder = await stripe.issuing.cardholders.retrieve(params.cardholder_id);
    return cardholder;
  } catch (error) {
    logger.error(`Stripe issuing_retrieve_cardholder failed for ID ${params.cardholder_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Issuing Authorization.
 * @param {object} params - The parameters for retrieving an authorization.
 * @param {string} params.authorization_id - The ID of the authorization to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Issuing Authorization object.
 */
export async function mcp_stripe_issuing_retrieve_authorization(params) {
  logger.info('Executing mcp_stripe_issuing_retrieve_authorization', { params });
  try {
    const authorization = await stripe.issuing.authorizations.retrieve(params.authorization_id);
    return authorization;
  } catch (error) {
    logger.error(`Stripe issuing_retrieve_authorization failed for ID ${params.authorization_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Issuing Authorizations, with optional filtering.
 * @param {object} params - The parameters for listing authorizations.
 * @param {string} [params.cardholder] - Only return authorizations for the given cardholder.
 * @param {string} [params.status] - Only return authorizations with the given status (e.g., 'pending', 'closed').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Issuing Authorization objects.
 */
export async function mcp_stripe_issuing_list_authorizations(params) {
  logger.info('Executing mcp_stripe_issuing_list_authorizations', { params });
  try {
    const authorizations = await stripe.issuing.authorizations.list({
      cardholder: params.cardholder,
      status: params.status,
      limit: params.limit,
    });
    return authorizations.data;
  } catch (error) {
    logger.error('Stripe issuing_list_authorizations failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Approves a specific Stripe Issuing Authorization.
 * @param {object} params - The parameters for approving an authorization.
 * @param {string} params.authorization_id - The ID of the authorization to approve.
 * @param {object} [params.amount] - The amount to approve. Defaults to the authorization_amount.
 * @returns {Promise<object>} The updated Stripe Issuing Authorization object.
 */
export async function mcp_stripe_issuing_approve_authorization(params) {
  logger.info('Executing mcp_stripe_issuing_approve_authorization', { params });
  try {
    const authorization = await stripe.issuing.authorizations.approve(params.authorization_id, {
      amount: params.amount,
    });
    return authorization;
  } catch (error) {
    logger.error(`Stripe issuing_approve_authorization failed for ID ${params.authorization_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Declines a specific Stripe Issuing Authorization.
 * @param {object} params - The parameters for declining an authorization.
 * @param {string} params.authorization_id - The ID of the authorization to decline.
 * @returns {Promise<object>} The updated Stripe Issuing Authorization object.
 */
export async function mcp_stripe_issuing_decline_authorization(params) {
  logger.info('Executing mcp_stripe_issuing_decline_authorization', { params });
  try {
    const authorization = await stripe.issuing.authorizations.decline(params.authorization_id);
    return authorization;
  } catch (error) {
    logger.error(`Stripe issuing_decline_authorization failed for ID ${params.authorization_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a new Issuing Dispute in Stripe.
 * @param {object} params - The parameters for creating a dispute.
 * @param {string} params.transaction_id - The ID of the transaction to dispute.
 * @param {string} params.reason - The reason for the dispute (e.g., 'fraudulent', 'duplicate').
 * @param {object} [params.evidence] - Optional. Evidence to support the dispute.
 * @returns {Promise<object>} The created Stripe Issuing Dispute object.
 */
export async function mcp_stripe_issuing_create_dispute(params) {
  logger.info('Executing mcp_stripe_issuing_create_dispute', { params });
  try {
    const dispute = await stripe.issuing.disputes.create({
      transaction: params.transaction_id,
      reason: params.reason,
      evidence: params.evidence,
    });
    return dispute;
  } catch (error) {
    logger.error('Stripe issuing_create_dispute failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Issuing Dispute by ID.
 * @param {object} params - The parameters for retrieving a dispute.
 * @param {string} params.dispute_id - The ID of the dispute to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Issuing Dispute object.
 */
export async function mcp_stripe_issuing_retrieve_dispute(params) {
  logger.info('Executing mcp_stripe_issuing_retrieve_dispute', { params });
  try {
    const dispute = await stripe.issuing.disputes.retrieve(params.dispute_id);
    return dispute;
  } catch (error) {
    logger.error(`Stripe issuing_retrieve_dispute failed for ID ${params.dispute_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Issuing Transaction by ID.
 * @param {object} params - The parameters for retrieving a transaction.
 * @param {string} params.transaction_id - The ID of the transaction to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Issuing Transaction object.
 */
export async function mcp_stripe_issuing_retrieve_transaction(params) {
  logger.info('Executing mcp_stripe_issuing_retrieve_transaction', { params });
  try {
    const transaction = await stripe.issuing.transactions.retrieve(params.transaction_id);
    return transaction;
  } catch (error) {
    logger.error(`Stripe issuing_retrieve_transaction failed for ID ${params.transaction_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Issuing Transactions, with optional filtering.
 * @param {object} params - The parameters for listing transactions.
 * @param {string} [params.cardholder] - Only return transactions for the given cardholder.
 * @param {string} [params.params.card] - Only return transactions for the given card.
 * @param {string} [params.type] - Only return transactions of the given type (e.g., 'capture', 'refund').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Issuing Transaction objects.
 */
export async function mcp_stripe_issuing_list_transactions(params) {
  logger.info('Executing mcp_stripe_issuing_list_transactions', { params });
  try {
    const transactions = await stripe.issuing.transactions.list({
      cardholder: params.cardholder,
      card: params.card,
      type: params.type,
      limit: params.limit,
    });
    return transactions.data;
  } catch (error) {
    logger.error('Stripe issuing_list_transactions failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
} 
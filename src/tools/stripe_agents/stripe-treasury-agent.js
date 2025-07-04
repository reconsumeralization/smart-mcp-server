import Stripe from 'stripe';
import config from '../../config.js';
import logger from '../../logger.js';

if (!config.stripe.secretKey) {
  logger.warn('STRIPE_SECRET_KEY is not set. Stripe tools will not function.');
}

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Creates a new Stripe Treasury Financial Account.
 * @param {object} params - The parameters for creating a financial account.
 * @param {string} params.supported_currencies - The list of currencies supported by the financial account.
 * @param {object} params.features - The features to enable for the financial account.
 * @param {string} params.country - The country of the financial account (e.g., 'US').
 * @returns {Promise<object>} The created Stripe Treasury Financial Account object.
 */
export async function mcp_stripe_treasury_create_financial_account(params) {
  logger.info('Executing mcp_stripe_treasury_create_financial_account', { params });
  try {
    const financialAccount = await stripe.treasury.financialAccounts.create({
      country: params.country,
      supported_currencies: params.supported_currencies,
      features: params.features,
    });
    return financialAccount;
  } catch (error) {
    logger.error('Stripe treasury_create_financial_account failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Treasury Financial Account by ID.
 * @param {object} params - The parameters for retrieving a financial account.
 * @param {string} params.financial_account_id - The ID of the financial account to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Treasury Financial Account object.
 */
export async function mcp_stripe_treasury_retrieve_financial_account(params) {
  logger.info('Executing mcp_stripe_treasury_retrieve_financial_account', { params });
  try {
    const financialAccount = await stripe.treasury.financialAccounts.retrieve(params.financial_account_id);
    return financialAccount;
  } catch (error) {
    logger.error(`Stripe treasury_retrieve_financial_account failed for ID ${params.financial_account_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Treasury Financial Accounts.
 * @param {object} params - The parameters for listing financial accounts.
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Treasury Financial Account objects.
 */
export async function mcp_stripe_treasury_list_financial_accounts(params) {
  logger.info('Executing mcp_stripe_treasury_list_financial_accounts', { params });
  try {
    const financialAccounts = await stripe.treasury.financialAccounts.list({
      limit: params.limit,
    });
    return financialAccounts.data;
  } catch (error) {
    logger.error('Stripe treasury_list_financial_accounts failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a specific Stripe Treasury Transaction by ID.
 * @param {object} params - The parameters for retrieving a transaction.
 * @param {string} params.transaction_id - The ID of the transaction to retrieve.
 * @returns {Promise<object>} The retrieved Stripe Treasury Transaction object.
 */
export async function mcp_stripe_treasury_retrieve_transaction(params) {
  logger.info('Executing mcp_stripe_treasury_retrieve_transaction', { params });
  try {
    const transaction = await stripe.treasury.transactions.retrieve(params.transaction_id);
    return transaction;
  } catch (error) {
    logger.error(`Stripe treasury_retrieve_transaction failed for ID ${params.transaction_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Treasury Transactions, with optional filtering.
 * @param {object} params - The parameters for listing transactions.
 * @param {string} [params.financial_account] - Only return transactions for the given Financial Account.
 * @param {string} [params.status] - Only return transactions with the given status (e.g., 'posted', 'void').
 * @param {string} [params.flow_type] - Only return transactions of the given flow type (e.g., 'inbound_transfer', 'outbound_transfer').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Treasury Transaction objects.
 */
export async function mcp_stripe_treasury_list_transactions(params) {
  logger.info('Executing mcp_stripe_treasury_list_transactions', { params });
  try {
    const transactions = await stripe.treasury.transactions.list({
      financial_account: params.financial_account,
      status: params.status,
      flow_type: params.flow_type,
      limit: params.limit,
    });
    return transactions.data;
  } catch (error) {
    logger.error('Stripe treasury_list_transactions failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates an Outbound Transfer in Stripe Treasury.
 * @param {object} params - The parameters for creating an outbound transfer.
 * @param {string} params.amount - The amount to be transferred.
 * @param {string} params.currency - The currency of the amount.
 * @param {string} params.financial_account - The ID of the financial account to transfer funds from.
 * @param {string} params.destination_payment_method - The ID of the payment method to transfer funds to (e.g., bank account).
 * @returns {Promise<object>} The created Stripe Treasury Outbound Transfer object.
 */
export async function mcp_stripe_treasury_create_outbound_transfer(params) {
  logger.info('Executing mcp_stripe_treasury_create_outbound_transfer', { params });
  try {
    const outboundTransfer = await stripe.treasury.outboundTransfers.create({
      amount: params.amount,
      currency: params.currency,
      financial_account: params.financial_account,
      destination_payment_method: params.destination_payment_method,
      // Add other required/optional parameters as needed
    });
    return outboundTransfer;
  } catch (error) {
    logger.error('Stripe treasury_create_outbound_transfer failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Cancels an Outbound Transfer in Stripe Treasury.
 * @param {object} params - The parameters for canceling an outbound transfer.
 * @param {string} params.outbound_transfer_id - The ID of the outbound transfer to cancel.
 * @returns {Promise<object>} The canceled Stripe Treasury Outbound Transfer object.
 */
export async function mcp_stripe_treasury_cancel_outbound_transfer(params) {
  logger.info('Executing mcp_stripe_treasury_cancel_outbound_transfer', { params });
  try {
    const outboundTransfer = await stripe.treasury.outboundTransfers.cancel(params.outbound_transfer_id);
    return outboundTransfer;
  } catch (error) {
    logger.error(`Stripe treasury_cancel_outbound_transfer failed for ID ${params.outbound_transfer_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates an Outbound Payment in Stripe Treasury.
 * @param {object} params - The parameters for creating an outbound payment.
 * @param {string} params.amount - The amount to be paid.
 * @param {string} params.currency - The currency of the amount.
 * @param {string} params.financial_account - The ID of the financial account to pay from.
 * @param {string} params.destination_payment_method - The ID of the payment method to pay to (e.g., bank account).
 * @returns {Promise<object>} The created Stripe Treasury Outbound Payment object.
 */
export async function mcp_stripe_treasury_create_outbound_payment(params) {
  logger.info('Executing mcp_stripe_treasury_create_outbound_payment', { params });
  try {
    const outboundPayment = await stripe.treasury.outboundPayments.create({
      amount: params.amount,
      currency: params.currency,
      financial_account: params.financial_account,
      destination_payment_method: params.destination_payment_method,
      // Add other required/optional parameters as needed
    });
    return outboundPayment;
  } catch (error) {
    logger.error('Stripe treasury_create_outbound_payment failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Cancels an Outbound Payment in Stripe Treasury.
 * @param {object} params - The parameters for canceling an outbound payment.
 * @param {string} params.outbound_payment_id - The ID of the outbound payment to cancel.
 * @returns {Promise<object>} The canceled Stripe Treasury Outbound Payment object.
 */
export async function mcp_stripe_treasury_cancel_outbound_payment(params) {
  logger.info('Executing mcp_stripe_treasury_cancel_outbound_payment', { params });
  try {
    const outboundPayment = await stripe.treasury.outboundPayments.cancel(params.outbound_payment_id);
    return outboundPayment;
  } catch (error) {
    logger.error(`Stripe treasury_cancel_outbound_payment failed for ID ${params.outbound_payment_id}`, { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a test-mode ReceivedCredit object in Stripe Treasury.
 * This is a test helper for simulating inbound transfers.
 * @param {object} params - The parameters for creating a received credit.
 * @param {string} params.amount - The amount of the received credit.
 * @param {string} params.currency - The currency of the amount.
 * @param {string} params.financial_account - The ID of the financial account to receive the credit.
 * @returns {Promise<object>} The created Stripe Treasury Received Credit object.
 */
export async function mcp_stripe_treasury_test_create_received_credit(params) {
  logger.info('Executing mcp_stripe_treasury_test_create_received_credit', { params });
  try {
    const receivedCredit = await stripe.treasury.receivedCredits.create({
      amount: params.amount,
      currency: params.currency,
      financial_account: params.financial_account,
      // Add other required/optional parameters for testing as needed
    });
    return receivedCredit;
  } catch (error) {
    logger.error('Stripe treasury_test_create_received_credit failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Treasury Received Credits.
 * @param {object} params - The parameters for listing received credits.
 * @param {string} [params.financial_account] - Only return received credits for the given Financial Account.
 * @param {string} [params.status] - Only return received credits with the given status (e.g., 'succeeded', 'failed').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Treasury Received Credit objects.
 */
export async function mcp_stripe_treasury_list_received_credits(params) {
  logger.info('Executing mcp_stripe_treasury_list_received_credits', { params });
  try {
    const receivedCredits = await stripe.treasury.receivedCredits.list({
      financial_account: params.financial_account,
      status: params.status,
      limit: params.limit,
    });
    return receivedCredits.data;
  } catch (error) {
    logger.error('Stripe treasury_list_received_credits failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a test-mode ReceivedDebit object in Stripe Treasury.
 * This is a test helper for simulating inbound debits.
 * @param {object} params - The parameters for creating a received debit.
 * @param {string} params.amount - The amount of the received debit.
 * @param {string} params.currency - The currency of the amount.
 * @param {string} params.financial_account - The ID of the financial account to debit from.
 * @returns {Promise<object>} The created Stripe Treasury Received Debit object.
 */
export async function mcp_stripe_treasury_test_create_received_debit(params) {
  logger.info('Executing mcp_stripe_treasury_test_create_received_debit', { params });
  try {
    const receivedDebit = await stripe.treasury.receivedDebits.create({
      amount: params.amount,
      currency: params.currency,
      financial_account: params.financial_account,
      // Add other required/optional parameters for testing as needed
    });
    return receivedDebit;
  } catch (error) {
    logger.error('Stripe treasury_test_create_received_debit failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists all Stripe Treasury Received Debits.
 * @param {object} params - The parameters for listing received debits.
 * @param {string} [params.financial_account] - Only return received debits for the given Financial Account.
 * @param {string} [params.status] - Only return received debits with the given status (e.g., 'succeeded', 'failed').
 * @param {number} [params.limit] - A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.
 * @returns {Promise<Array>} A list of Stripe Treasury Received Debit objects.
 */
export async function mcp_stripe_treasury_list_received_debits(params) {
  logger.info('Executing mcp_stripe_treasury_list_received_debits', { params });
  try {
    const receivedDebits = await stripe.treasury.receivedDebits.list({
      financial_account: params.financial_account,
      status: params.status,
      limit: params.limit,
    });
    return receivedDebits.data;
  } catch (error) {
    logger.error('Stripe treasury_list_received_debits failed', { error: error.message, stack: error.stack });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
} 
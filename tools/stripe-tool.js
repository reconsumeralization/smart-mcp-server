import Stripe from 'stripe';
import config from '../config.js';
import logger from '../logger.js';
// The official Stripe Node.js library will be initialized here later.

if (!config.stripe.secretKey) {
  logger.warn('STRIPE_SECRET_KEY is not set. Stripe tools will not function.');
}

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-04-10',
});

/**
 * Creates a new customer in Stripe.
 * @param {object} params - The parameters for creating a customer.
 * @param {string} params.email - The customer's email address.
 * @param {string} params.name - The customer's full name.
 * @returns {Promise<object>} The created Stripe customer object.
 */
export async function mcp_stripe_create_customer(params) {
  logger.info('Executing mcp_stripe_create_customer', { params });
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
    });
    return customer;
  } catch (error) {
    logger.error('Stripe create_customer failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a new product in Stripe.
 * @param {object} params - The parameters for creating a product.
 * @param {string} params.name - The name of the product.
 * @returns {Promise<object>} The created Stripe product object.
 */
export async function mcp_stripe_create_product(params) {
  logger.info('Executing mcp_stripe_create_product', { params });
  try {
    const product = await stripe.products.create({
      name: params.name,
    });
    return product;
  } catch (error) {
    logger.error('Stripe create_product failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a new price for a product in Stripe.
 * @param {object} params - The parameters for creating a price.
 * @param {string} params.product_id - The ID of the product this price belongs to.
 * @param {number} params.unit_amount - The price in the smallest currency unit (e.g., cents).
 * @param {string} params.currency - The three-letter ISO currency code.
 * @returns {Promise<object>} The created Stripe price object.
 */
export async function mcp_stripe_create_price(params) {
  logger.info('Executing mcp_stripe_create_price', { params });
  try {
    const price = await stripe.prices.create({
      product: params.product_id,
      unit_amount: params.unit_amount,
      currency: params.currency,
      recurring: params.recurring, // e.g., { interval: 'month' }
    });
    return price;
  } catch (error) {
    logger.error('Stripe create_price failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a new payment link in Stripe.
 * @param {object} params - The parameters for creating a payment link.
 * @param {string} params.price_id - The ID of the price to include in the payment link.
 * @returns {Promise<object>} The created Stripe payment link object.
 */
export async function mcp_stripe_create_payment_link(params) {
  logger.info('Executing mcp_stripe_create_payment_link', { params });
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price: params.price_id,
        quantity: 1,
      }],
    });
    return paymentLink;
  } catch (error) {
    logger.error('Stripe create_payment_link failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a draft invoice for a customer.
 * @param {object} params - The parameters for creating an invoice.
 * @param {string} params.customer_id - The ID of the customer to invoice.
 * @returns {Promise<object>} The created Stripe invoice object.
 */
export async function mcp_stripe_create_invoice(params) {
  logger.info('Executing mcp_stripe_create_invoice', { params });
  try {
    const invoice = await stripe.invoices.create({
      customer: params.customer_id,
      collection_method: 'send_invoice',
      days_until_due: 30,
    });
    return invoice;
  } catch (error) {
    logger.error('Stripe create_invoice failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Finalizes a draft invoice, making it ready for payment.
 * @param {object} params - The parameters for finalizing an invoice.
 * @param {string} params.invoice_id - The ID of the draft invoice to finalize.
 * @returns {Promise<object>} The finalized Stripe invoice object.
 */
export async function mcp_stripe_finalize_invoice(params) {
  logger.info('Executing mcp_stripe_finalize_invoice', { params });
  try {
    const invoice = await stripe.invoices.finalizeInvoice(params.invoice_id);
    return invoice;
  } catch (error) {
    logger.error('Stripe finalize_invoice failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists subscriptions, optionally filtered by customer or status.
 * @param {object} params - The parameters for listing subscriptions.
 * @param {string} [params.customer_id] - The ID of the customer to filter by.
 * @param {string} [params.status] - The status to filter by (e.g., 'active').
 * @returns {Promise<Array>} A list of Stripe subscription objects.
 */
export async function mcp_stripe_list_subscriptions(params) {
  logger.info('Executing mcp_stripe_list_subscriptions', { params });
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: params.customer_id,
      status: params.status,
    });
    return subscriptions.data;
  } catch (error) {
    logger.error('Stripe list_subscriptions failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a new subscription for a customer.
 * @param {object} params - The parameters for creating a subscription.
 * @param {string} params.customer_id - The ID of the customer.
 * @param {string} params.price_id - The ID of the price to subscribe the customer to.
 * @returns {Promise<object>} The created Stripe subscription object.
 */
export async function mcp_stripe_create_subscription(params) {
  logger.info('Executing mcp_stripe_create_subscription', { params });
  try {
    const subscription = await stripe.subscriptions.create({
      customer: params.customer_id,
      items: [{
        price: params.price_id,
      }],
    });
    return subscription;
  } catch (error) {
    logger.error('Stripe create_subscription failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Lists payment intents, optionally filtered by customer.
 * @param {object} params - The parameters for listing payment intents.
 * @param {string} [params.customer_id] - The ID of the customer to filter by.
 * @returns {Promise<Array>} A list of Stripe payment intent objects.
 */
export async function mcp_stripe_list_payment_intents(params) {
  logger.info('Executing mcp_stripe_list_payment_intents', { params });
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      customer: params.customer_id,
    });
    return paymentIntents.data;
  } catch (error) {
    logger.error('Stripe list_payment_intents failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a refund for a specific charge.
 * @param {object} params - The parameters for creating a refund.
 * @param {string} params.payment_intent_id - The ID of the PaymentIntent to refund.
 * @param {number} [params.amount] - The amount to refund, in the smallest currency unit. If not provided, a full refund is issued.
 * @returns {Promise<object>} The created Stripe refund object.
 */
export async function mcp_stripe_create_refund(params) {
  logger.info('Executing mcp_stripe_create_refund', { params });
  try {
    const refund = await stripe.refunds.create({
      payment_intent: params.payment_intent_id,
      amount: params.amount, // Optional: for partial refunds
    });
    return refund;
  } catch (error) {
    logger.error('Stripe create_refund failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
} 
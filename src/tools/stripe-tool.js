import Stripe from 'stripe';
import config from '../config.js';
import { logger } from '../logger.js';

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
      line_items: [
        {
          price: params.price_id,
          quantity: 1,
        },
      ],
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
      items: [
        {
          price: params.price_id,
        },
      ],
    });
    return subscription;
  } catch (error) {
    logger.error('Stripe create_subscription failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Creates a new refund in Stripe.
 * @param {object} params - The parameters for creating a refund.
 * @param {string} params.charge_id - The ID of the charge to refund.
 * @param {number} [params.amount] - The amount to refund in the smallest currency unit (e.g., cents). If not provided, the entire charge will be refunded.
 * @returns {Promise<object>} The created Stripe refund object.
 */
export async function mcp_stripe_create_refund(params) {
  logger.info('Executing mcp_stripe_create_refund', { params });
  try {
    const refund = await stripe.refunds.create({
      charge: params.charge_id,
      amount: params.amount,
    });
    return refund;
  } catch (error) {
    logger.error('Stripe create_refund failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Manages a dispute in Stripe.
 * @param {object} params - The parameters for managing a dispute.
 * @param {string} params.dispute_id - The ID of the dispute to manage.
 * @param {object} params.evidence - The evidence to submit for the dispute.
 * @returns {Promise<object>} The updated Stripe dispute object.
 */
export async function mcp_stripe_manage_dispute(params) {
  logger.info('Executing mcp_stripe_manage_dispute', { params });
  try {
    const dispute = await stripe.disputes.update(params.dispute_id, {
      evidence: params.evidence,
    });
    return dispute;
  } catch (error) {
    logger.error('Stripe manage_dispute failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Retrieves a financial report run from Stripe.
 * @param {object} params - The parameters for retrieving a financial report.
 * @param {string} params.report_run_id - The ID of the report run to retrieve.
 * @returns {Promise<object>} The Stripe financial report run object.
 */
export async function mcp_stripe_retrieve_financial_report(params) {
  logger.info('Executing mcp_stripe_retrieve_financial_report', { params });
  try {
    const reportRun = await stripe.reporting.reportRuns.retrieve(
      params.report_run_id
    );
    return reportRun;
  } catch (error) {
    logger.error('Stripe retrieve_financial_report failed', {
      error: error.message,
    });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Updates a subscription in Stripe.
 * @param {object} params - The parameters for updating a subscription.
 * @param {string} params.subscription_id - The ID of the subscription to update.
 * @param {Array<object>} params.items - The new list of items for the subscription.
 * @returns {Promise<object>} The updated Stripe subscription object.
 */
export async function mcp_stripe_update_subscription(params) {
  logger.info('Executing mcp_stripe_update_subscription', { params });
  try {
    // To update a subscription, you typically need to retrieve it first
    // to get the IDs of the existing subscription items.
    const subscription = await stripe.subscriptions.retrieve(
      params.subscription_id
    );

    const updatedSubscription = await stripe.subscriptions.update(
      params.subscription_id,
      {
        items: params.items.map((item) => {
          // Find the existing item to replace, if necessary
          const existingItem = subscription.items.data.find(
            (i) => i.price.id === item.old_price_id
          );
          if (existingItem) {
            return { id: existingItem.id, deleted: true };
          }
          return { price: item.new_price_id };
        }),
      }
    );
    return updatedSubscription;
  } catch (error) {
    logger.error('Stripe update_subscription failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

/**
 * Cancels a subscription in Stripe.
 * @param {object} params - The parameters for canceling a subscription.
 * @param {string} params.subscription_id - The ID of the subscription to cancel.
 * @returns {Promise<object>} The canceled Stripe subscription object.
 */
export async function mcp_stripe_cancel_subscription(params) {
  logger.info('Executing mcp_stripe_cancel_subscription', { params });
  try {
    const subscription = await stripe.subscriptions.cancel(
      params.subscription_id
    );
    return subscription;
  } catch (error) {
    logger.error('Stripe cancel_subscription failed', { error: error.message });
    throw new Error(`Stripe API Error: ${error.message}`);
  }
}

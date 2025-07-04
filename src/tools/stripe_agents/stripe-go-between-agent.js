import logger from '../../logger.js';
import {
  mcp_stripe_capital_get_financing_offers,
  mcp_stripe_capital_retrieve_financing_offer,
  mcp_stripe_capital_mark_financing_offer_delivered,
  mcp_stripe_capital_retrieve_financing_summary
} from './stripe-capital-agent.js';
import {
  mcp_stripe_issuing_create_card,
  mcp_stripe_issuing_retrieve_card,
  mcp_stripe_issuing_update_card,
  mcp_stripe_issuing_list_cards,
  mcp_stripe_issuing_create_cardholder,
  mcp_stripe_issuing_retrieve_cardholder,
  mcp_stripe_issuing_retrieve_authorization,
  mcp_stripe_issuing_list_authorizations,
  mcp_stripe_issuing_approve_authorization,
  mcp_stripe_issuing_decline_authorization,
  mcp_stripe_issuing_create_dispute,
  mcp_stripe_issuing_retrieve_dispute,
  mcp_stripe_issuing_retrieve_transaction,
  mcp_stripe_issuing_list_transactions
} from './stripe-issuing-agent.js';
import {
  mcp_stripe_treasury_create_financial_account,
  mcp_stripe_treasury_retrieve_financial_account,
  mcp_stripe_treasury_list_financial_accounts,
  mcp_stripe_treasury_retrieve_transaction,
  mcp_stripe_treasury_list_transactions,
  mcp_stripe_treasury_create_outbound_transfer,
  mcp_stripe_treasury_cancel_outbound_transfer,
  mcp_stripe_treasury_create_outbound_payment,
  mcp_stripe_treasury_cancel_outbound_payment,
  mcp_stripe_treasury_test_create_received_credit,
  mcp_stripe_treasury_list_received_credits,
  mcp_stripe_treasury_test_create_received_debit,
  mcp_stripe_treasury_list_received_debits
} from './stripe-treasury-agent.js';
import {
  mcp_stripe_radar_retrieve_review,
  mcp_stripe_radar_list_reviews,
  mcp_stripe_radar_approve_review,
  mcp_stripe_radar_decline_review,
  mcp_stripe_sigma_query,
  mcp_stripe_sigma_explain
} from './stripe-highest-end-agent.js';
import {
  mcp_stripe_disputes_submit_evidence,
  mcp_stripe_disputes_retrieve_dispute,
  mcp_stripe_disputes_list_disputes
} from './stripe-security-compliance-agent.js';
import {
  mcp_risk_underwriting_ingest_data,
  mcp_risk_underwriting_calculate_risk_score,
  mcp_risk_underwriting_make_decision
} from './stripe-risk-underwriting-agent.js';

const stripeToolMap = {
    // Capital Agent Tools
    'mcp_stripe_capital_get_financing_offers': mcp_stripe_capital_get_financing_offers,
    'mcp_stripe_capital_retrieve_financing_offer': mcp_stripe_capital_retrieve_financing_offer,
    'mcp_stripe_capital_mark_financing_offer_delivered': mcp_stripe_capital_mark_financing_offer_delivered,
    'mcp_stripe_capital_retrieve_financing_summary': mcp_stripe_capital_retrieve_financing_summary,

    // Issuing Agent Tools
    'mcp_stripe_issuing_create_card': mcp_stripe_issuing_create_card,
    'mcp_stripe_issuing_retrieve_card': mcp_stripe_issuing_retrieve_card,
    'mcp_stripe_issuing_update_card': mcp_stripe_issuing_update_card,
    'mcp_stripe_issuing_list_cards': mcp_stripe_issuing_list_cards,
    'mcp_stripe_issuing_create_cardholder': mcp_stripe_issuing_create_cardholder,
    'mcp_stripe_issuing_retrieve_cardholder': mcp_stripe_issuing_retrieve_cardholder,
    'mcp_stripe_issuing_retrieve_authorization': mcp_stripe_issuing_retrieve_authorization,
    'mcp_stripe_issuing_list_authorizations': mcp_stripe_issuing_list_authorizations,
    'mcp_stripe_issuing_approve_authorization': mcp_stripe_issuing_approve_authorization,
    'mcp_stripe_issuing_decline_authorization': mcp_stripe_issuing_decline_authorization,
    'mcp_stripe_issuing_create_dispute': mcp_stripe_issuing_create_dispute,
    'mcp_stripe_issuing_retrieve_dispute': mcp_stripe_issuing_retrieve_dispute,
    'mcp_stripe_issuing_retrieve_transaction': mcp_stripe_issuing_retrieve_transaction,
    'mcp_stripe_issuing_list_transactions': mcp_stripe_issuing_list_transactions,

    // Treasury Agent Tools
    'mcp_stripe_treasury_create_financial_account': mcp_stripe_treasury_create_financial_account,
    'mcp_stripe_treasury_retrieve_financial_account': mcp_stripe_treasury_retrieve_financial_account,
    'mcp_stripe_treasury_list_financial_accounts': mcp_stripe_treasury_list_financial_accounts,
    'mcp_stripe_treasury_retrieve_transaction': mcp_stripe_treasury_retrieve_transaction,
    'mcp_stripe_treasury_list_transactions': mcp_stripe_treasury_list_transactions,
    'mcp_stripe_treasury_create_outbound_transfer': mcp_stripe_treasury_create_outbound_transfer,
    'mcp_stripe_treasury_cancel_outbound_transfer': mcp_stripe_treasury_cancel_outbound_transfer,
    'mcp_stripe_treasury_create_outbound_payment': mcp_stripe_treasury_create_outbound_payment,
    'mcp_stripe_treasury_cancel_outbound_payment': mcp_stripe_treasury_cancel_outbound_payment,
    'mcp_stripe_treasury_test_create_received_credit': mcp_stripe_treasury_test_create_received_credit,
    'mcp_stripe_treasury_list_received_credits': mcp_stripe_treasury_list_received_credits,
    'mcp_stripe_treasury_test_create_received_debit': mcp_stripe_treasury_test_create_received_debit,
    'mcp_stripe_treasury_list_received_debits': mcp_stripe_treasury_list_received_debits,

    // Highest-End Agent Tools (Radar and Sigma)
    'mcp_stripe_radar_retrieve_review': mcp_stripe_radar_retrieve_review,
    'mcp_stripe_radar_list_reviews': mcp_stripe_radar_list_reviews,
    'mcp_stripe_radar_approve_review': mcp_stripe_radar_approve_review,
    'mcp_stripe_radar_decline_review': mcp_stripe_radar_decline_review,
    'mcp_stripe_sigma_query': mcp_stripe_sigma_query,
    'mcp_stripe_sigma_explain': mcp_stripe_sigma_explain,

    // Security and Compliance Agent Tools
    'mcp_stripe_disputes_submit_evidence': mcp_stripe_disputes_submit_evidence,
    'mcp_stripe_disputes_retrieve_dispute': mcp_stripe_disputes_retrieve_dispute,
    'mcp_stripe_disputes_list_disputes': mcp_stripe_disputes_list_disputes,

    // Risk Assessment and Underwriting Agent Tools
    'mcp_risk_underwriting_ingest_data': mcp_risk_underwriting_ingest_data,
    'mcp_risk_underwriting_calculate_risk_score': mcp_risk_underwriting_calculate_risk_score,
    'mcp_risk_underwriting_make_decision': mcp_risk_underwriting_make_decision,
};

/**
 * The Go-Between Agent for intelligent routing of Stripe API calls.
 * This function acts as a central dispatcher, directing requests to the appropriate
 * segmented Stripe agent based on the `toolName`.
 * @param {string} toolName - The name of the specific Stripe tool to call (e.g., 'mcp_stripe_capital_get_financing_offers').
 * @param {object} parameters - The parameters to pass to the target Stripe tool.
 * @param {object} [context={}] - Additional context for the request, if any.
 * @returns {Promise<any>} The result from the executed Stripe agent tool.
 * @throws {Error} If the toolName is not found or execution fails.
 */
export async function mcp_stripe_router(toolName, parameters, context = {}) {
  logger.info(`Go-Between Agent routing call for tool: ${toolName}`, { parameters, context });

  const handler = stripeToolMap[toolName];

  if (!handler) {
    logger.error(`Stripe tool not found by Go-Between Agent: ${toolName}`);
    throw new Error(`Stripe tool '${toolName}' not found for routing.`);
  }

  try {
    const result = await handler(parameters, context); // Pass context if agents can use it
    logger.info(`Go-Between Agent successfully routed and executed tool: ${toolName}`);
    return result;
  } catch (error) {
    logger.error(`Go-Between Agent: Error executing Stripe tool '${toolName}'`, {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Go-Between Agent failed to execute tool '${toolName}': ${error.message}`);
  }
} 
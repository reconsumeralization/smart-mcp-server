import logger from './logger.js';
import {
  mcp_stripe_create_customer,
  mcp_stripe_create_product,
  mcp_stripe_create_price,
  mcp_stripe_create_payment_link,
  mcp_stripe_create_invoice,
  mcp_stripe_finalize_invoice,
  mcp_stripe_list_subscriptions,
  mcp_stripe_create_subscription,
  mcp_stripe_create_refund,
  mcp_stripe_manage_dispute,
  mcp_stripe_retrieve_financial_report,
  mcp_stripe_update_subscription,
  mcp_stripe_cancel_subscription,
} from './tools/stripe-tool.js';
import githubTool from './tools/github-tool.js';
import databaseTool from './tools/database-tool.js';
import {
  mcp_memory_create_entity,
  mcp_memory_get_entity,
  mcp_memory_create_relation,
  mcp_memory_find_relations,
  mcp_memory_add_observation,
  mcp_memory_list_entities,
  mcp_memory_delete_entity,
} from './tools/memory-tool.js';
import { updateSubscription } from './lib/subscription-db.js';
import {
  mcp_financial_get_account,
  mcp_financial_get_portfolio,
  mcp_financial_get_transactions,
  mcp_financial_calculate_performance,
  mcp_financial_get_balance,
  mcp_financial_calculate_risk,
} from './tools/financial-core-tool.js';
import {
  mcp_market_get_quote,
  mcp_market_get_quotes,
  mcp_market_get_historical,
  mcp_market_get_indices,
  mcp_market_get_economic_indicators,
  mcp_market_get_news,
  mcp_market_technical_analysis,
} from './tools/market-data-tool.js';
import {
  mcp_trading_place_order,
  mcp_trading_cancel_order,
  mcp_trading_get_order,
  mcp_trading_get_orders,
  mcp_trading_get_trades,
  mcp_trading_get_order_book,
  mcp_trading_execution_report,
} from './tools/trading-execution-tool.js';

/**
 * A map to store handlers for internally executed tools.
 * The key is the toolId (e.g., 'read_file'), and the value is the async function to execute.
 */
const internalTools = new Map();

/**
 * Registers a function to handle the execution of an internal tool.
 * @param {string} toolId - The unique identifier for the tool.
 * @param {Function} handler - The async function that executes the tool's logic.
 */
export function registerInternalTool(toolId, handler) {
  if (internalTools.has(toolId)) {
    logger.warn(`Tool with ID '${toolId}' is being overwritten.`);
  }
  internalTools.set(toolId, handler);
}

/**
 * Executes a tool using the internal tool registry.
 * @param {string} toolId - The ID of the tool to execute.
 * @param {object} parameters - The parameters to pass to the tool.
 * @returns {Promise<any>} The result of the tool execution.
 */
export async function executeToolProxy(toolId, parameters) {
  logger.info(`Attempting to execute tool: ${toolId}`, { toolId, parameters });

  const handler = internalTools.get(toolId);

  if (handler) {
    try {
      logger.info(`Executing internal tool: ${toolId}`);
      const result = await handler(parameters);
      logger.info(`Internal tool '${toolId}' executed successfully.`);
      return result;
    } catch (error) {
      logger.error(`Error executing internal tool '${toolId}'`, {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Execution of tool '${toolId}' failed: ${error.message}`);
    }
  }

  logger.error(`Tool not found: ${toolId}. No internal handler is registered.`);
  throw new Error(`Tool with ID '${toolId}' not found.`);
}

// --- Register all internal tools ---

// Filesystem Tools (Simulated)
registerInternalTool('read_file', async (params) => {
  logger.info('Simulating read_file', { params });
  return { content: `Simulated file content for ${params.target_file}` };
});
registerInternalTool('write_file', async (params) => {
  logger.info('Simulating write_file', { params });
  return { success: true, file: params.target_file };
});
registerInternalTool('list_dir', async (params) => {
  logger.info('Simulating list_dir', { params });
  return {
    items: [
      { name: 'file1.txt', type: 'file' },
      { name: 'dir1', type: 'directory' },
    ],
  };
});

// Stripe Tools (Placeholders)
registerInternalTool('mcp_stripe_create_customer', mcp_stripe_create_customer);
registerInternalTool('mcp_stripe_create_product', mcp_stripe_create_product);
registerInternalTool('mcp_stripe_create_price', mcp_stripe_create_price);
registerInternalTool(
  'mcp_stripe_create_payment_link',
  mcp_stripe_create_payment_link
);
registerInternalTool('mcp_stripe_create_invoice', mcp_stripe_create_invoice);
registerInternalTool(
  'mcp_stripe_finalize_invoice',
  mcp_stripe_finalize_invoice
);
registerInternalTool(
  'mcp_stripe_list_subscriptions',
  mcp_stripe_list_subscriptions
);
registerInternalTool(
  'mcp_stripe_create_subscription',
  mcp_stripe_create_subscription
);
registerInternalTool('mcp_stripe_create_refund', mcp_stripe_create_refund);
registerInternalTool('mcp_stripe_manage_dispute', mcp_stripe_manage_dispute);
registerInternalTool(
  'mcp_stripe_retrieve_financial_report',
  mcp_stripe_retrieve_financial_report
);
registerInternalTool(
  'mcp_stripe_update_subscription',
  mcp_stripe_update_subscription
);
registerInternalTool(
  'mcp_stripe_cancel_subscription',
  mcp_stripe_cancel_subscription
);
registerInternalTool('updateSubscription', updateSubscription);

// GitHub Tools
registerInternalTool(
  'mcp_github_create_pull_request',
  githubTool.create_pull_request
);
registerInternalTool(
  'mcp_github_list_pull_requests',
  githubTool.list_pull_requests
);
registerInternalTool(
  'mcp_github_get_pull_request',
  githubTool.get_pull_request
);
registerInternalTool('mcp_github_create_issue', githubTool.create_issue);
registerInternalTool('mcp_github_list_issues', githubTool.list_issues);
registerInternalTool(
  'mcp_github_get_repository_info',
  githubTool.get_repository_info
);

// Database Tool
registerInternalTool('mcp_database_execute_query', databaseTool.execute_query);

// Memory Tools
registerInternalTool('mcp_memory_create_entity', mcp_memory_create_entity);
registerInternalTool('mcp_memory_get_entity', mcp_memory_get_entity);
registerInternalTool('mcp_memory_create_relation', mcp_memory_create_relation);
registerInternalTool('mcp_memory_find_relations', mcp_memory_find_relations);
registerInternalTool('mcp_memory_add_observation', mcp_memory_add_observation);
registerInternalTool('mcp_memory_list_entities', mcp_memory_list_entities);
registerInternalTool('mcp_memory_delete_entity', mcp_memory_delete_entity);

// Financial Core Tools
registerInternalTool('mcp_financial_get_account', mcp_financial_get_account);
registerInternalTool('mcp_financial_get_portfolio', mcp_financial_get_portfolio);
registerInternalTool('mcp_financial_get_transactions', mcp_financial_get_transactions);
registerInternalTool('mcp_financial_calculate_performance', mcp_financial_calculate_performance);
registerInternalTool('mcp_financial_get_balance', mcp_financial_get_balance);
registerInternalTool('mcp_financial_calculate_risk', mcp_financial_calculate_risk);

// Market Data Tools
registerInternalTool('mcp_market_get_quote', mcp_market_get_quote);
registerInternalTool('mcp_market_get_quotes', mcp_market_get_quotes);
registerInternalTool('mcp_market_get_historical', mcp_market_get_historical);
registerInternalTool('mcp_market_get_indices', mcp_market_get_indices);
registerInternalTool('mcp_market_get_economic_indicators', mcp_market_get_economic_indicators);
registerInternalTool('mcp_market_get_news', mcp_market_get_news);
registerInternalTool('mcp_market_technical_analysis', mcp_market_technical_analysis);

// Trading Execution Tools
registerInternalTool('mcp_trading_place_order', mcp_trading_place_order);
registerInternalTool('mcp_trading_cancel_order', mcp_trading_cancel_order);
registerInternalTool('mcp_trading_get_order', mcp_trading_get_order);
registerInternalTool('mcp_trading_get_orders', mcp_trading_get_orders);
registerInternalTool('mcp_trading_get_trades', mcp_trading_get_trades);
registerInternalTool('mcp_trading_get_order_book', mcp_trading_get_order_book);
registerInternalTool('mcp_trading_execution_report', mcp_trading_execution_report);

registerInternalTool('scheduleWorkflow', async (params) => {
  logger.info('Simulating scheduleWorkflow', { params });
  return {
    success: true,
    message: `Workflow ${params.workflowId} scheduled with delay ${params.delay}`,
  };
});

logger.info('Internal tools registered and ready.');

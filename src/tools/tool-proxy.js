import logger from '../logger.js';
import githubTool from './github-tool.js';
import databaseTool from './database-tool.js';
import tradingExecutionTool from './trading-execution-tool.js';
import systemHealthTool from './system-health-tool.js';
import financialCoreTool from './financial-core-tool.js';
import geminiTool from './gemini-tool.js';
import documentationConsolidationTool from './documentation-consolidation-tool.js';
import testMakingTool from './test-making-tool.js';
import twilioTool from './twilio-tool.js';
import clearbitTool from './clearbit-tool.js';
import zapierTool from './zapier-tool.js';
import { mcp_stripe_router } from './stripe_agents/stripe-go-between-agent.js';

/**
 * A map to store handlers for internally executed tools.
 * The key is the toolId (e.g., 'read_file'), and the value is the async function to execute.
 */
const internalTools = new Map();

// Register the Go-Between Agent for all Stripe-related calls
registerInternalTool('mcp_stripe_router', mcp_stripe_router);

// Register other internal tools
registerInternalTool('mcp_github_create_issue', githubTool.mcp_github_create_issue);
registerInternalTool('mcp_github_get_issue', githubTool.mcp_github_get_issue);
registerInternalTool('mcp_github_list_issues', githubTool.mcp_github_list_issues);
registerInternalTool('mcp_github_create_pull_request', githubTool.mcp_github_create_pull_request);
registerInternalTool('mcp_github_get_pull_request', githubTool.mcp_github_get_pull_request);
registerInternalTool('mcp_github_list_pull_requests', githubTool.mcp_github_list_pull_requests);
registerInternalTool('mcp_github_merge_pull_request', githubTool.mcp_github_merge_pull_request);
registerInternalTool('mcp_github_add_comment_to_issue_or_pull_request', githubTool.mcp_github_add_comment_to_issue_or_pull_request);

registerInternalTool('mcp_database_query', databaseTool.mcp_database_query);
registerInternalTool('mcp_database_schema', databaseTool.mcp_database_schema);
registerInternalTool('mcp_database_insert', databaseTool.mcp_database_insert);
registerInternalTool('mcp_database_update', databaseTool.mcp_database_update);
registerInternalTool('mcp_database_delete', databaseTool.mcp_database_delete);

registerInternalTool('mcp_trading_execution_place_order', tradingExecutionTool.mcp_trading_execution_place_order);
registerInternalTool('mcp_trading_execution_cancel_order', tradingExecutionTool.mcp_trading_execution_cancel_order);
registerInternalTool('mcp_trading_execution_get_order_status', tradingExecutionTool.mcp_trading_execution_get_order_status);
registerInternalTool('mcp_trading_execution_get_market_data', tradingExecutionTool.mcp_trading_execution_get_market_data);

registerInternalTool('mcp_system_health_get_status', systemHealthTool.mcp_system_health_get_status);
registerInternalTool('mcp_system_health_run_diagnostic', systemHealthTool.mcp_system_health_run_diagnostic);
registerInternalTool('mcp_system_health_get_logs', systemHealthTool.mcp_system_health_get_logs);

registerInternalTool('mcp_financial_core_get_balance', financialCoreTool.mcp_financial_core_get_balance);
registerInternalTool('mcp_financial_core_transfer_funds', financialCoreTool.mcp_financial_core_transfer_funds);
registerInternalTool('mcp_financial_core_get_transaction_history', financialCoreTool.mcp_financial_core_get_transaction_history);
registerInternalTool('mcp_financial_core_process_payment', financialCoreTool.mcp_financial_core_process_payment);

registerInternalTool('mcp_gemini_vision_analyze_image', geminiTool.mcp_gemini_vision_analyze_image);
registerInternalTool('mcp_gemini_natural_language_process', geminiTool.mcp_gemini_natural_language_process);
registerInternalTool('mcp_gemini_text_to_speech', geminiTool.mcp_gemini_text_to_speech);
registerInternalTool('mcp_gemini_speech_to_text', geminiTool.mcp_gemini_speech_to_text);

registerInternalTool('mcp_documentation_consolidation_add_document', documentationConsolidationTool.mcp_documentation_consolidation_add_document);
registerInternalTool('mcp_documentation_consolidation_retrieve_document', documentationConsolidationTool.mcp_documentation_consolidation_retrieve_document);
registerInternalTool('mcp_documentation_consolidation_search_documents', documentationConsolidationTool.mcp_documentation_consolidation_search_documents);

registerInternalTool('mcp_test_making_create_unit_test', testMakingTool.mcp_test_making_create_unit_test);
registerInternalTool('mcp_test_making_create_integration_test', testMakingTool.mcp_test_making_create_integration_test);
registerInternalTool('mcp_test_making_execute_tests', testMakingTool.mcp_test_making_execute_tests);

registerInternalTool('mcp_twilio_send_sms', twilioTool.mcp_twilio_send_sms);
registerInternalTool('mcp_twilio_make_call', twilioTool.mcp_twilio_make_call);
registerInternalTool('mcp_twilio_verify_phone', twilioTool.mcp_twilio_verify_phone);
registerInternalTool('mcp_twilio_lookup_phone_number', twilioTool.mcp_twilio_lookup_phone_number);

registerInternalTool('mcp_clearbit_enrich_company', clearbitTool.mcp_clearbit_enrich_company);
registerInternalTool('mcp_clearbit_enrich_person', clearbitTool.mcp_clearbit_enrich_person);
registerInternalTool('mcp_clearbit_identify_website_visitor', clearbitTool.mcp_clearbit_identify_website_visitor);

registerInternalTool('mcp_zapier_nla_execute_action', zapierTool.mcp_zapier_nla_execute_action);

export function registerInternalTool(toolId, handler) {
  if (internalTools.has(toolId)) {
    logger.warn(`Attempted to re-register internal tool: ${toolId}. Ignoring.`);
  }
  internalTools.set(toolId, handler);
}

export function getInternalTool(toolId) {
  if (!internalTools.has(toolId)) {
    throw new Error(`Internal tool not found: ${toolId}`);
  }
  return internalTools.get(toolId);
}

export function listInternalTools() {
  return Array.from(internalTools.keys());
}
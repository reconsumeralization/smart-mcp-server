import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mcp_stripe_router } from '../src/tools/stripe_agents/stripe-go-between-agent.js';

// Mock all individual Stripe agent functions that the router might call
vi.mock('../src/tools/stripe_agents/stripe-capital-agent.js', () => ({
  mcp_stripe_capital_get_financing_offers: vi.fn(),
  mcp_stripe_capital_retrieve_financing_offer: vi.fn(),
  mcp_stripe_capital_mark_financing_offer_delivered: vi.fn(),
  mcp_stripe_capital_retrieve_financing_summary: vi.fn(),
}));

vi.mock('../src/tools/stripe_agents/stripe-issuing-agent.js', () => ({
  mcp_stripe_issuing_create_card: vi.fn(),
  mcp_stripe_issuing_retrieve_card: vi.fn(),
  mcp_stripe_issuing_update_card: vi.fn(),
  mcp_stripe_issuing_list_cards: vi.fn(),
  mcp_stripe_issuing_create_cardholder: vi.fn(),
  mcp_stripe_issuing_retrieve_cardholder: vi.fn(),
  mcp_stripe_issuing_retrieve_authorization: vi.fn(),
  mcp_stripe_issuing_list_authorizations: vi.fn(),
  mcp_stripe_issuing_approve_authorization: vi.fn(),
  mcp_stripe_issuing_decline_authorization: vi.fn(),
  mcp_stripe_issuing_create_dispute: vi.fn(),
  mcp_stripe_issuing_retrieve_dispute: vi.fn(),
  mcp_stripe_issuing_retrieve_transaction: vi.fn(),
  mcp_stripe_issuing_list_transactions: vi.fn(),
}));

vi.mock('../src/tools/stripe_agents/stripe-treasury-agent.js', () => ({
  mcp_stripe_treasury_create_financial_account: vi.fn(),
  mcp_stripe_treasury_retrieve_financial_account: vi.fn(),
  mcp_stripe_treasury_list_financial_accounts: vi.fn(),
  mcp_stripe_treasury_retrieve_transaction: vi.fn(),
  mcp_stripe_treasury_list_transactions: vi.fn(),
  mcp_stripe_treasury_create_outbound_transfer: vi.fn(),
  mcp_stripe_treasury_cancel_outbound_transfer: vi.fn(),
  mcp_stripe_treasury_create_outbound_payment: vi.fn(),
  mcp_stripe_treasury_cancel_outbound_payment: vi.fn(),
  mcp_stripe_treasury_test_create_received_credit: vi.fn(),
  mcp_stripe_treasury_list_received_credits: vi.fn(),
  mcp_stripe_treasury_test_create_received_debit: vi.fn(),
  mcp_stripe_treasury_list_received_debits: vi.fn(),
}));

import * as CapitalAgent from '../src/tools/stripe_agents/stripe-capital-agent.js';
import * as IssuingAgent from '../src/tools/stripe_agents/stripe-issuing-agent.js';
import * as TreasuryAgent from '../src/tools/stripe_agents/stripe-treasury-agent.js';

describe('Stripe Go-Between Agent (mcp_stripe_router)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route to mcp_stripe_capital_get_financing_offers and return its result', async () => {
    const mockResult = [{ id: 'offer_1', amount: 10000 }];
    CapitalAgent.mcp_stripe_capital_get_financing_offers.mockResolvedValue(mockResult);

    const toolName = 'mcp_stripe_capital_get_financing_offers';
    const params = { financial_account: 'fa_test' };
    const result = await mcp_stripe_router(toolName, params);

    expect(result).toEqual(mockResult);
    expect(CapitalAgent.mcp_stripe_capital_get_financing_offers).toHaveBeenCalledWith(params, {});
    expect(CapitalAgent.mcp_stripe_capital_get_financing_offers).toHaveBeenCalledTimes(1);
  });

  it('should route to mcp_stripe_issuing_create_card and return its result', async () => {
    const mockResult = { id: 'card_1', status: 'active' };
    IssuingAgent.mcp_stripe_issuing_create_card.mockResolvedValue(mockResult);

    const toolName = 'mcp_stripe_issuing_create_card';
    const params = { cardholder: 'ch_test', currency: 'usd', type: 'virtual' };
    const result = await mcp_stripe_router(toolName, params);

    expect(result).toEqual(mockResult);
    expect(IssuingAgent.mcp_stripe_issuing_create_card).toHaveBeenCalledWith(params, {});
    expect(IssuingAgent.mcp_stripe_issuing_create_card).toHaveBeenCalledTimes(1);
  });

  it('should route to mcp_stripe_treasury_create_financial_account and return its result', async () => {
    const mockResult = { id: 'fa_1', country: 'US' };
    TreasuryAgent.mcp_stripe_treasury_create_financial_account.mockResolvedValue(mockResult);

    const toolName = 'mcp_stripe_treasury_create_financial_account';
    const params = { country: 'US', supported_currencies: ['usd'] };
    const result = await mcp_stripe_router(toolName, params);

    expect(result).toEqual(mockResult);
    expect(TreasuryAgent.mcp_stripe_treasury_create_financial_account).toHaveBeenCalledWith(params, {});
    expect(TreasuryAgent.mcp_stripe_treasury_create_financial_account).toHaveBeenCalledTimes(1);
  });

  it('should throw an error for an unknown toolName', async () => {
    const toolName = 'unknown_stripe_tool';
    const params = { some: 'param' };

    await expect(mcp_stripe_router(toolName, params)).rejects.toThrow(`Stripe tool '${toolName}' not found for routing.`);

    // Ensure no agent functions were called
    expect(CapitalAgent.mcp_stripe_capital_get_financing_offers).not.toHaveBeenCalled();
    expect(IssuingAgent.mcp_stripe_issuing_create_card).not.toHaveBeenCalled();
    expect(TreasuryAgent.mcp_stripe_treasury_create_financial_account).not.toHaveBeenCalled();
  });

  it('should pass context to the routed tool', async () => {
    const mockResult = { id: 'offer_1', amount: 10000 };
    CapitalAgent.mcp_stripe_capital_get_financing_offers.mockResolvedValue(mockResult);

    const toolName = 'mcp_stripe_capital_get_financing_offers';
    const params = { financial_account: 'fa_test' };
    const context = { userId: 'user_123', sessionId: 'sess_456' };
    const result = await mcp_stripe_router(toolName, params, context);

    expect(result).toEqual(mockResult);
    expect(CapitalAgent.mcp_stripe_capital_get_financing_offers).toHaveBeenCalledWith(params, context);
  });

  it('should re-throw errors from the routed tool', async () => {
    const mockError = new Error('Capital API Error');
    CapitalAgent.mcp_stripe_capital_get_financing_offers.mockRejectedValue(mockError);

    const toolName = 'mcp_stripe_capital_get_financing_offers';
    const params = { financial_account: 'fa_test' };

    await expect(mcp_stripe_router(toolName, params)).rejects.toThrow(`Go-Between Agent failed to execute tool '${toolName}': Capital API Error`);
  });
}); 
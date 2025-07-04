import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Stripe from 'stripe';
import config from '../src/config.js';
import logger from '../src/logger.js';
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
} from '../src/tools/stripe_agents/stripe-treasury-agent.js';

// Mock the Stripe library
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    treasury: {
      financialAccounts: {
        create: vi.fn(),
        retrieve: vi.fn(),
        list: vi.fn(),
      },
      transactions: {
        retrieve: vi.fn(),
        list: vi.fn(),
      },
      outboundTransfers: {
        create: vi.fn(),
        cancel: vi.fn(),
      },
      outboundPayments: {
        create: vi.fn(),
        cancel: vi.fn(),
      },
      receivedCredits: {
        create: vi.fn(),
        list: vi.fn(),
      },
      receivedDebits: {
        create: vi.fn(),
        list: vi.fn(),
      },
    },
  })),
}));

const stripe = new Stripe(config.stripeSecretKey);

describe('Stripe Treasury Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test cases for mcp_stripe_treasury_create_financial_account
  describe('mcp_stripe_treasury_create_financial_account', () => {
    it('should create a financial account successfully', async () => {
      const mockFinancialAccount = { id: 'fa_123', status: 'active' };
      stripe.treasury.financialAccounts.create.mockResolvedValue(mockFinancialAccount);

      const params = { country: 'US', supported_currencies: ['usd'] };
      const result = await mcp_stripe_treasury_create_financial_account(params);
      expect(result).toEqual(mockFinancialAccount);
      expect(stripe.treasury.financialAccounts.create).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.financialAccounts.create.mockRejectedValue(mockError);

      const params = { country: 'US', supported_currencies: ['usd'] };
      await expect(mcp_stripe_treasury_create_financial_account(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_retrieve_financial_account
  describe('mcp_stripe_treasury_retrieve_financial_account', () => {
    it('should retrieve a financial account successfully', async () => {
      const mockFinancialAccount = { id: 'fa_123', status: 'active' };
      stripe.treasury.financialAccounts.retrieve.mockResolvedValue(mockFinancialAccount);

      const params = { financial_account_id: 'fa_123' };
      const result = await mcp_stripe_treasury_retrieve_financial_account(params);
      expect(result).toEqual(mockFinancialAccount);
      expect(stripe.treasury.financialAccounts.retrieve).toHaveBeenCalledWith(params.financial_account_id);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.financialAccounts.retrieve.mockRejectedValue(mockError);

      const params = { financial_account_id: 'fa_123' };
      await expect(mcp_stripe_treasury_retrieve_financial_account(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_list_financial_accounts
  describe('mcp_stripe_treasury_list_financial_accounts', () => {
    it('should list financial accounts successfully', async () => {
      const mockFinancialAccounts = { data: [{ id: 'fa_123' }, { id: 'fa_456' }] };
      stripe.treasury.financialAccounts.list.mockResolvedValue(mockFinancialAccounts);

      const params = { limit: 2 };
      const result = await mcp_stripe_treasury_list_financial_accounts(params);
      expect(result).toEqual(mockFinancialAccounts.data);
      expect(stripe.treasury.financialAccounts.list).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.financialAccounts.list.mockRejectedValue(mockError);

      const params = { limit: 2 };
      await expect(mcp_stripe_treasury_list_financial_accounts(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_retrieve_transaction
  describe('mcp_stripe_treasury_retrieve_transaction', () => {
    it('should retrieve a transaction successfully', async () => {
      const mockTransaction = { id: 'txn_123', status: 'posted' };
      stripe.treasury.transactions.retrieve.mockResolvedValue(mockTransaction);

      const params = { transaction_id: 'txn_123' };
      const result = await mcp_stripe_treasury_retrieve_transaction(params);
      expect(result).toEqual(mockTransaction);
      expect(stripe.treasury.transactions.retrieve).toHaveBeenCalledWith(params.transaction_id);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.transactions.retrieve.mockRejectedValue(mockError);

      const params = { transaction_id: 'txn_123' };
      await expect(mcp_stripe_treasury_retrieve_transaction(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_list_transactions
  describe('mcp_stripe_treasury_list_transactions', () => {
    it('should list transactions successfully', async () => {
      const mockTransactions = { data: [{ id: 'txn_123' }, { id: 'txn_456' }] };
      stripe.treasury.transactions.list.mockResolvedValue(mockTransactions);

      const params = { limit: 2 };
      const result = await mcp_stripe_treasury_list_transactions(params);
      expect(result).toEqual(mockTransactions.data);
      expect(stripe.treasury.transactions.list).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.transactions.list.mockRejectedValue(mockError);

      const params = { limit: 2 };
      await expect(mcp_stripe_treasury_list_transactions(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_create_outbound_transfer
  describe('mcp_stripe_treasury_create_outbound_transfer', () => {
    it('should create an outbound transfer successfully', async () => {
      const mockOutboundTransfer = { id: 'obt_123', status: 'posted' };
      stripe.treasury.outboundTransfers.create.mockResolvedValue(mockOutboundTransfer);

      const params = { amount: 1000, currency: 'usd', financial_account: 'fa_123', destination_payment_method: 'pm_123' };
      const result = await mcp_stripe_treasury_create_outbound_transfer(params);
      expect(result).toEqual(mockOutboundTransfer);
      expect(stripe.treasury.outboundTransfers.create).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.outboundTransfers.create.mockRejectedValue(mockError);

      const params = { amount: 1000, currency: 'usd', financial_account: 'fa_123', destination_payment_method: 'pm_123' };
      await expect(mcp_stripe_treasury_create_outbound_transfer(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_cancel_outbound_transfer
  describe('mcp_stripe_treasury_cancel_outbound_transfer', () => {
    it('should cancel an outbound transfer successfully', async () => {
      const mockOutboundTransfer = { id: 'obt_123', status: 'canceled' };
      stripe.treasury.outboundTransfers.cancel.mockResolvedValue(mockOutboundTransfer);

      const params = { outbound_transfer_id: 'obt_123' };
      const result = await mcp_stripe_treasury_cancel_outbound_transfer(params);
      expect(result).toEqual(mockOutboundTransfer);
      expect(stripe.treasury.outboundTransfers.cancel).toHaveBeenCalledWith(params.outbound_transfer_id);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.outboundTransfers.cancel.mockRejectedValue(mockError);

      const params = { outbound_transfer_id: 'obt_123' };
      await expect(mcp_stripe_treasury_cancel_outbound_transfer(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_create_outbound_payment
  describe('mcp_stripe_treasury_create_outbound_payment', () => {
    it('should create an outbound payment successfully', async () => {
      const mockOutboundPayment = { id: 'obp_123', status: 'posted' };
      stripe.treasury.outboundPayments.create.mockResolvedValue(mockOutboundPayment);

      const params = { amount: 1000, currency: 'usd', financial_account: 'fa_123', destination_payment_method: 'pm_123' };
      const result = await mcp_stripe_treasury_create_outbound_payment(params);
      expect(result).toEqual(mockOutboundPayment);
      expect(stripe.treasury.outboundPayments.create).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.outboundPayments.create.mockRejectedValue(mockError);

      const params = { amount: 1000, currency: 'usd', financial_account: 'fa_123', destination_payment_method: 'pm_123' };
      await expect(mcp_stripe_treasury_create_outbound_payment(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_cancel_outbound_payment
  describe('mcp_stripe_treasury_cancel_outbound_payment', () => {
    it('should cancel an outbound payment successfully', async () => {
      const mockOutboundPayment = { id: 'obp_123', status: 'canceled' };
      stripe.treasury.outboundPayments.cancel.mockResolvedValue(mockOutboundPayment);

      const params = { outbound_payment_id: 'obp_123' };
      const result = await mcp_stripe_treasury_cancel_outbound_payment(params);
      expect(result).toEqual(mockOutboundPayment);
      expect(stripe.treasury.outboundPayments.cancel).toHaveBeenCalledWith(params.outbound_payment_id);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.outboundPayments.cancel.mockRejectedValue(mockError);

      const params = { outbound_payment_id: 'obp_123' };
      await expect(mcp_stripe_treasury_cancel_outbound_payment(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_test_create_received_credit
  describe('mcp_stripe_treasury_test_create_received_credit', () => {
    it('should create a test received credit successfully', async () => {
      const mockReceivedCredit = { id: 'rc_123', status: 'succeeded' };
      stripe.treasury.receivedCredits.create.mockResolvedValue(mockReceivedCredit);

      const params = { amount: 500, currency: 'usd', financial_account: 'fa_123' };
      const result = await mcp_stripe_treasury_test_create_received_credit(params);
      expect(result).toEqual(mockReceivedCredit);
      expect(stripe.treasury.receivedCredits.create).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.receivedCredits.create.mockRejectedValue(mockError);

      const params = { amount: 500, currency: 'usd', financial_account: 'fa_123' };
      await expect(mcp_stripe_treasury_test_create_received_credit(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_list_received_credits
  describe('mcp_stripe_treasury_list_received_credits', () => {
    it('should list received credits successfully', async () => {
      const mockReceivedCredits = { data: [{ id: 'rc_123' }, { id: 'rc_456' }] };
      stripe.treasury.receivedCredits.list.mockResolvedValue(mockReceivedCredits);

      const params = { limit: 2 };
      const result = await mcp_stripe_treasury_list_received_credits(params);
      expect(result).toEqual(mockReceivedCredits.data);
      expect(stripe.treasury.receivedCredits.list).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.receivedCredits.list.mockRejectedValue(mockError);

      const params = { limit: 2 };
      await expect(mcp_stripe_treasury_list_received_credits(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_test_create_received_debit
  describe('mcp_stripe_treasury_test_create_received_debit', () => {
    it('should create a test received debit successfully', async () => {
      const mockReceivedDebit = { id: 'rd_123', status: 'succeeded' };
      stripe.treasury.receivedDebits.create.mockResolvedValue(mockReceivedDebit);

      const params = { amount: 500, currency: 'usd', financial_account: 'fa_123' };
      const result = await mcp_stripe_treasury_test_create_received_debit(params);
      expect(result).toEqual(mockReceivedDebit);
      expect(stripe.treasury.receivedDebits.create).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.receivedDebits.create.mockRejectedValue(mockError);

      const params = { amount: 500, currency: 'usd', financial_account: 'fa_123' };
      await expect(mcp_stripe_treasury_test_create_received_debit(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_treasury_list_received_debits
  describe('mcp_stripe_treasury_list_received_debits', () => {
    it('should list received debits successfully', async () => {
      const mockReceivedDebits = { data: [{ id: 'rd_123' }, { id: 'rd_456' }] };
      stripe.treasury.receivedDebits.list.mockResolvedValue(mockReceivedDebits);

      const params = { limit: 2 };
      const result = await mcp_stripe_treasury_list_received_debits(params);
      expect(result).toEqual(mockReceivedDebits.data);
      expect(stripe.treasury.receivedDebits.list).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.treasury.receivedDebits.list.mockRejectedValue(mockError);

      const params = { limit: 2 };
      await expect(mcp_stripe_treasury_list_received_debits(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });
}); 
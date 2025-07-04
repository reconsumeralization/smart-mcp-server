import { describe, it, expect, beforeEach, vi } from 'vitest';
import Stripe from 'stripe';
import config from '../src/config.js';
import {
  mcp_stripe_disputes_submit_evidence,
  mcp_stripe_disputes_retrieve_dispute,
  mcp_stripe_disputes_list_disputes
} from '../src/tools/stripe_agents/stripe-security-compliance-agent.js';

// Mock the Stripe library
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    disputes: {
      update: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
    },
  })),
}));

const stripe = new Stripe(config.stripeSecretKey);

describe('Stripe Security and Compliance Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test cases for mcp_stripe_disputes_submit_evidence
  describe('mcp_stripe_disputes_submit_evidence', () => {
    it('should submit dispute evidence successfully', async () => {
      const mockDispute = { id: 'dp_123', status: 'under_review' };
      stripe.disputes.update.mockResolvedValue(mockDispute);

      const params = {
        dispute_id: 'dp_123',
        evidence: {
          customer_email: 'test@example.com',
          product_description: 'Test product',
        },
      };
      const result = await mcp_stripe_disputes_submit_evidence(params);
      expect(result).toEqual(mockDispute);
      expect(stripe.disputes.update).toHaveBeenCalledWith(
        params.dispute_id,
        { evidence: params.evidence }
      );
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.disputes.update.mockRejectedValue(mockError);

      const params = {
        dispute_id: 'dp_123',
        evidence: { customer_email: 'test@example.com' },
      };
      await expect(mcp_stripe_disputes_submit_evidence(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_disputes_retrieve_dispute
  describe('mcp_stripe_disputes_retrieve_dispute', () => {
    it('should retrieve a dispute successfully', async () => {
      const mockDispute = { id: 'dp_123', status: 'lost' };
      stripe.disputes.retrieve.mockResolvedValue(mockDispute);

      const params = { dispute_id: 'dp_123' };
      const result = await mcp_stripe_disputes_retrieve_dispute(params);
      expect(result).toEqual(mockDispute);
      expect(stripe.disputes.retrieve).toHaveBeenCalledWith(params.dispute_id);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.disputes.retrieve.mockRejectedValue(mockError);

      const params = { dispute_id: 'dp_123' };
      await expect(mcp_stripe_disputes_retrieve_dispute(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });

  // Test cases for mcp_stripe_disputes_list_disputes
  describe('mcp_stripe_disputes_list_disputes', () => {
    it('should list disputes successfully', async () => {
      const mockDisputes = { data: [{ id: 'dp_123' }, { id: 'dp_456' }] };
      stripe.disputes.list.mockResolvedValue(mockDisputes);

      const params = { limit: 2 };
      const result = await mcp_stripe_disputes_list_disputes(params);
      expect(result).toEqual(mockDisputes.data);
      expect(stripe.disputes.list).toHaveBeenCalledWith(params);
    });

    it('should throw an error if Stripe API call fails', async () => {
      const mockError = new Error('Stripe API Error');
      stripe.disputes.list.mockRejectedValue(mockError);

      const params = { limit: 2 };
      await expect(mcp_stripe_disputes_list_disputes(params)).rejects.toThrow('Stripe API Error: Stripe API Error');
    });
  });
}); 
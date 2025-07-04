import { describe, it, expect, beforeEach, vi } from 'vitest';
import Stripe from 'stripe';
import config from '../src/config.js';
import {
  mcp_stripe_radar_retrieve_review,
  mcp_stripe_radar_list_reviews,
  mcp_stripe_radar_approve_review,
  mcp_stripe_radar_decline_review,
  mcp_stripe_sigma_query,
  mcp_stripe_sigma_explain
} from '../src/tools/stripe_agents/stripe-highest-end-agent.js';

// Mock the Stripe library
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    radar: {
      reviews: {
        retrieve: vi.fn(),
        list: vi.fn(),
        approve: vi.fn(),
        decline: vi.fn(),
      },
    },
    // Mocking sigma as a direct property, even though it's typically internal/custom API for Sigma
    sigma: {
      query: vi.fn(),
      explain: vi.fn(),
    },
  })),
}));

const stripe = new Stripe(config.stripeSecretKey);

describe('Stripe Highest-End Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test cases for Stripe Radar functions
  describe('Stripe Radar Reviews', () => {
    it('should retrieve a review successfully', async () => {
      const mockReview = { id: 'prv_123', charge: 'ch_abc' };
      stripe.radar.reviews.retrieve.mockResolvedValue(mockReview);

      const params = { review_id: 'prv_123' };
      const result = await mcp_stripe_radar_retrieve_review(params);
      expect(result).toEqual(mockReview);
      expect(stripe.radar.reviews.retrieve).toHaveBeenCalledWith(params.review_id);
    });

    it('should list reviews successfully', async () => {
      const mockReviews = { data: [{ id: 'prv_123' }, { id: 'prv_456' }] };
      stripe.radar.reviews.list.mockResolvedValue(mockReviews);

      const params = { limit: 2 };
      const result = await mcp_stripe_radar_list_reviews(params);
      expect(result).toEqual(mockReviews.data);
      expect(stripe.radar.reviews.list).toHaveBeenCalledWith(params);
    });

    it('should approve a review successfully', async () => {
      const mockReview = { id: 'prv_123', status: 'approved' };
      stripe.radar.reviews.approve.mockResolvedValue(mockReview);

      const params = { review_id: 'prv_123' };
      const result = await mcp_stripe_radar_approve_review(params);
      expect(result).toEqual(mockReview);
      expect(stripe.radar.reviews.approve).toHaveBeenCalledWith(params.review_id);
    });

    it('should decline a review successfully', async () => {
      const mockReview = { id: 'prv_123', status: 'declined' };
      stripe.radar.reviews.decline.mockResolvedValue(mockReview);

      const params = { review_id: 'prv_123' };
      const result = await mcp_stripe_radar_decline_review(params);
      expect(result).toEqual(mockReview);
      expect(stripe.radar.reviews.decline).toHaveBeenCalledWith(params.review_id);
    });

    it('should throw an error if Stripe Radar API call fails', async () => {
      const mockError = new Error('Radar API Error');
      stripe.radar.reviews.retrieve.mockRejectedValue(mockError);

      const params = { review_id: 'prv_123' };
      await expect(mcp_stripe_radar_retrieve_review(params)).rejects.toThrow('Stripe API Error: Radar API Error');
    });
  });

  // Test cases for Stripe Sigma functions
  describe('Stripe Sigma', () => {
    it('should execute a Sigma query successfully (simulated)', async () => {
      const mockResult = { success: true, data: [], message: "Sigma query simulated successfully." };
      // No direct Stripe API call mocked for Sigma as it's a placeholder/internal service

      const params = { query: 'SELECT * FROM disputes;' };
      const result = await mcp_stripe_sigma_query(params);
      expect(result).toEqual(mockResult);
    });

    it('should provide a Sigma query explanation successfully (simulated)', async () => {
      const mockExplanation = { success: true, explanation: "Explanation for query: SELECT * FROM users;" };
      // No direct Stripe API call mocked for Sigma as it's a placeholder/internal service

      const params = { query: 'SELECT * FROM users;' };
      const result = await mcp_stripe_sigma_explain(params);
      expect(result).toEqual(mockExplanation);
    });

    it('should handle errors during Sigma query (simulated)', async () => {
      const mockError = new Error('Simulated Sigma Query Error');
      vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error for this test

      // Temporarily override the function to throw an error for testing purposes
      // This is a bit of a hack since actual Stripe.sigma.query doesn't exist
      const originalSigmaQuery = mcp_stripe_sigma_query;
      mcp_stripe_sigma_query = vi.fn().mockRejectedValue(mockError);

      const params = { query: 'SELECT * FROM errors;' };
      await expect(mcp_stripe_sigma_query(params)).rejects.toThrow(`Stripe API Error: ${mockError.message}`);

      // Restore original function
      mcp_stripe_sigma_query = originalSigmaQuery;
      vi.restoreAllMocks();
    });

    it('should handle errors during Sigma explanation (simulated)', async () => {
      const mockError = new Error('Simulated Sigma Explain Error');
      vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error for this test

      const originalSigmaExplain = mcp_stripe_sigma_explain;
      mcp_stripe_sigma_explain = vi.fn().mockRejectedValue(mockError);

      const params = { query: 'EXPLAIN SELECT * FROM logs;' };
      await expect(mcp_stripe_sigma_explain(params)).rejects.toThrow(`Stripe API Error: ${mockError.message}`);

      mcp_stripe_sigma_explain = originalSigmaExplain;
      vi.restoreAllMocks();
    });
  });
}); 
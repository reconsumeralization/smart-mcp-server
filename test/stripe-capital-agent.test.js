import { jest } from '@jest/globals';
import Stripe from 'stripe';

// Mock the entire stripe module
jest.mock('stripe', () => {
  const originalStripe = jest.requireActual('stripe');
  return class MockStripe extends originalStripe {
    constructor(apiKey, config) {
      super(apiKey, config);
      this.capital = {
        financingOffers: {
          list: jest.fn(),
          retrieve: jest.fn(),
          markDelivered: jest.fn(),
        },
        financingSummary: {
          retrieve: jest.fn(),
        },
      };
    }
  };
});

const stripe = new Stripe('sk_test_mock_key', { apiVersion: '2024-04-10' });

// Import the functions to be tested AFTER mocking Stripe
import {
  mcp_stripe_capital_get_financing_offers,
  mcp_stripe_capital_retrieve_financing_offer,
  mcp_stripe_capital_mark_financing_offer_delivered,
  mcp_stripe_capital_retrieve_financing_summary,
} from '../src/tools/stripe_agents/stripe-capital-agent.js';

describe('Stripe Capital Agent Tools', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('mcp_stripe_capital_get_financing_offers', () => {
    test('should retrieve financing offers successfully', async () => {
      const mockOffers = [{ id: 'offer1', amount: 10000 }];
      stripe.capital.financingOffers.list.mockResolvedValueOnce({ data: mockOffers });

      const result = await mcp_stripe_capital_get_financing_offers({});
      expect(result).toEqual(mockOffers);
      expect(stripe.capital.financingOffers.list).toHaveBeenCalledTimes(1);
      expect(stripe.capital.financingOffers.list).toHaveBeenCalledWith({
        expand: ['data.accepted_offer'],
      });
    });

    test('should throw an error if API call fails', async () => {
      const mockError = new Error('API Error');
      stripe.capital.financingOffers.list.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_capital_get_financing_offers({})).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.capital.financingOffers.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_capital_retrieve_financing_offer', () => {
    test('should retrieve a specific financing offer successfully', async () => {
      const mockOffer = { id: 'offer_test', amount: 5000 };
      stripe.capital.financingOffers.retrieve.mockResolvedValueOnce(mockOffer);

      const result = await mcp_stripe_capital_retrieve_financing_offer({ offer_id: 'offer_test' });
      expect(result).toEqual(mockOffer);
      expect(stripe.capital.financingOffers.retrieve).toHaveBeenCalledTimes(1);
      expect(stripe.capital.financingOffers.retrieve).toHaveBeenCalledWith('offer_test');
    });

    test('should throw an error if retrieving offer fails', async () => {
      const mockError = new Error('Offer not found');
      stripe.capital.financingOffers.retrieve.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_capital_retrieve_financing_offer({ offer_id: 'invalid_offer' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.capital.financingOffers.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_capital_mark_financing_offer_delivered', () => {
    test('should mark financing offer as delivered successfully', async () => {
      const mockUpdatedOffer = { id: 'offer_test', status: 'delivered' };
      stripe.capital.financingOffers.markDelivered.mockResolvedValueOnce(mockUpdatedOffer);

      const result = await mcp_stripe_capital_mark_financing_offer_delivered({ offer_id: 'offer_test' });
      expect(result).toEqual(mockUpdatedOffer);
      expect(stripe.capital.financingOffers.markDelivered).toHaveBeenCalledTimes(1);
      expect(stripe.capital.financingOffers.markDelivered).toHaveBeenCalledWith('offer_test');
    });

    test('should throw an error if marking offer as delivered fails', async () => {
      const mockError = new Error('Delivery failed');
      stripe.capital.financingOffers.markDelivered.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_capital_mark_financing_offer_delivered({ offer_id: 'invalid_offer' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.capital.financingOffers.markDelivered).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_capital_retrieve_financing_summary', () => {
    test('should retrieve financing summary successfully', async () => {
      const mockSummary = { current_balance: 50000 };
      stripe.capital.financingSummary.retrieve.mockResolvedValueOnce(mockSummary);

      const result = await mcp_stripe_capital_retrieve_financing_summary({});
      expect(result).toEqual(mockSummary);
      expect(stripe.capital.financingSummary.retrieve).toHaveBeenCalledTimes(1);
      expect(stripe.capital.financingSummary.retrieve).toHaveBeenCalledWith(); // No arguments expected
    });

    test('should throw an error if retrieving summary fails', async () => {
      const mockError = new Error('Summary retrieval failed');
      stripe.capital.financingSummary.retrieve.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_capital_retrieve_financing_summary({})).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.capital.financingSummary.retrieve).toHaveBeenCalledTimes(1);
    });
  });
}); 
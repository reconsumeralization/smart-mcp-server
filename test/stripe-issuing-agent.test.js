import { jest } from '@jest/globals';
import Stripe from 'stripe';

// Mock the entire stripe module
jest.mock('stripe', () => {
  const originalStripe = jest.requireActual('stripe');
  return class MockStripe extends originalStripe {
    constructor(apiKey, config) {
      super(apiKey, config);
      this.issuing = {
        cards: {
          create: jest.fn(),
          retrieve: jest.fn(),
          update: jest.fn(),
          list: jest.fn(),
        },
        cardholders: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
        authorizations: {
          retrieve: jest.fn(),
          list: jest.fn(),
          approve: jest.fn(),
          decline: jest.fn(),
        },
        disputes: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
        transactions: {
          retrieve: jest.fn(),
          list: jest.fn(),
        },
      };
    }
  };
});

const stripe = new Stripe('sk_test_mock_key', { apiVersion: '2024-04-10' });

// Import the functions to be tested AFTER mocking Stripe
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
  mcp_stripe_issuing_list_transactions,
} from '../src/tools/stripe_agents/stripe-issuing-agent.js';

describe('Stripe Issuing Agent Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mcp_stripe_issuing_create_card', () => {
    test('should create a card successfully', async () => {
      const mockCard = { id: 'card_test', type: 'virtual' };
      stripe.issuing.cards.create.mockResolvedValueOnce(mockCard);

      const params = {
        cardholder: 'ich_123',
        currency: 'usd',
        type: 'virtual',
      };
      const result = await mcp_stripe_issuing_create_card(params);
      expect(result).toEqual(mockCard);
      expect(stripe.issuing.cards.create).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.cards.create).toHaveBeenCalledWith(params);
    });

    test('should throw an error if card creation fails', async () => {
      const mockError = new Error('Invalid card data');
      stripe.issuing.cards.create.mockRejectedValueOnce(mockError);

      const params = {
        cardholder: 'ich_123',
        currency: 'usd',
        type: 'virtual',
      };
      await expect(mcp_stripe_issuing_create_card(params)).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.cards.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_retrieve_card', () => {
    test('should retrieve a card successfully', async () => {
      const mockCard = { id: 'card_test', type: 'physical' };
      stripe.issuing.cards.retrieve.mockResolvedValueOnce(mockCard);

      const result = await mcp_stripe_issuing_retrieve_card({ card_id: 'card_test' });
      expect(result).toEqual(mockCard);
      expect(stripe.issuing.cards.retrieve).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.cards.retrieve).toHaveBeenCalledWith('card_test');
    });

    test('should throw an error if card retrieval fails', async () => {
      const mockError = new Error('Card not found');
      stripe.issuing.cards.retrieve.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_retrieve_card({ card_id: 'invalid_card' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.cards.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_update_card', () => {
    test('should update a card successfully', async () => {
      const mockUpdatedCard = { id: 'card_test', status: 'inactive' };
      stripe.issuing.cards.update.mockResolvedValueOnce(mockUpdatedCard);

      const params = {
        card_id: 'card_test',
        update_params: { status: 'inactive' },
      };
      const result = await mcp_stripe_issuing_update_card(params);
      expect(result).toEqual(mockUpdatedCard);
      expect(stripe.issuing.cards.update).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.cards.update).toHaveBeenCalledWith(params.card_id, params.update_params);
    });

    test('should throw an error if card update fails', async () => {
      const mockError = new Error('Update failed');
      stripe.issuing.cards.update.mockRejectedValueOnce(mockError);

      const params = {
        card_id: 'invalid_card',
        update_params: { status: 'inactive' },
      };
      await expect(mcp_stripe_issuing_update_card(params)).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.cards.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_list_cards', () => {
    test('should list cards successfully', async () => {
      const mockCards = [{ id: 'card1' }, { id: 'card2' }];
      stripe.issuing.cards.list.mockResolvedValueOnce({ data: mockCards });

      const params = { limit: 2, status: 'active' };
      const result = await mcp_stripe_issuing_list_cards(params);
      expect(result).toEqual(mockCards);
      expect(stripe.issuing.cards.list).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.cards.list).toHaveBeenCalledWith(params);
    });

    test('should throw an error if listing cards fails', async () => {
      const mockError = new Error('Listing failed');
      stripe.issuing.cards.list.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_list_cards({})).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.cards.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_create_cardholder', () => {
    test('should create a cardholder successfully', async () => {
      const mockCardholder = { id: 'ich_test', name: 'John Doe' };
      stripe.issuing.cardholders.create.mockResolvedValueOnce(mockCardholder);

      const params = {
        type: 'individual',
        name: 'John Doe',
        email: 'john.doe@example.com',
      };
      const result = await mcp_stripe_issuing_create_cardholder(params);
      expect(result).toEqual(mockCardholder);
      expect(stripe.issuing.cardholders.create).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.cardholders.create).toHaveBeenCalledWith(params);
    });

    test('should throw an error if cardholder creation fails', async () => {
      const mockError = new Error('Invalid cardholder data');
      stripe.issuing.cardholders.create.mockRejectedValueOnce(mockError);

      const params = {
        type: 'individual',
        name: 'John Doe',
        email: 'john.doe@example.com',
      };
      await expect(mcp_stripe_issuing_create_cardholder(params)).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.cardholders.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_retrieve_cardholder', () => {
    test('should retrieve a cardholder successfully', async () => {
      const mockCardholder = { id: 'ich_test', name: 'Jane Doe' };
      stripe.issuing.cardholders.retrieve.mockResolvedValueOnce(mockCardholder);

      const result = await mcp_stripe_issuing_retrieve_cardholder({ cardholder_id: 'ich_test' });
      expect(result).toEqual(mockCardholder);
      expect(stripe.issuing.cardholders.retrieve).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.cardholders.retrieve).toHaveBeenCalledWith('ich_test');
    });

    test('should throw an error if cardholder retrieval fails', async () => {
      const mockError = new Error('Cardholder not found');
      stripe.issuing.cardholders.retrieve.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_retrieve_cardholder({ cardholder_id: 'invalid_id' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.cardholders.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_retrieve_authorization', () => {
    test('should retrieve an authorization successfully', async () => {
      const mockAuth = { id: 'auth_test', amount: 1000 };
      stripe.issuing.authorizations.retrieve.mockResolvedValueOnce(mockAuth);

      const result = await mcp_stripe_issuing_retrieve_authorization({ authorization_id: 'auth_test' });
      expect(result).toEqual(mockAuth);
      expect(stripe.issuing.authorizations.retrieve).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.authorizations.retrieve).toHaveBeenCalledWith('auth_test');
    });

    test('should throw an error if authorization retrieval fails', async () => {
      const mockError = new Error('Auth not found');
      stripe.issuing.authorizations.retrieve.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_retrieve_authorization({ authorization_id: 'invalid_id' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.authorizations.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_list_authorizations', () => {
    test('should list authorizations successfully', async () => {
      const mockAuths = [{ id: 'auth1' }, { id: 'auth2' }];
      stripe.issuing.authorizations.list.mockResolvedValueOnce({ data: mockAuths });

      const params = { limit: 2, status: 'pending' };
      const result = await mcp_stripe_issuing_list_authorizations(params);
      expect(result).toEqual(mockAuths);
      expect(stripe.issuing.authorizations.list).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.authorizations.list).toHaveBeenCalledWith(params);
    });

    test('should throw an error if listing authorizations fails', async () => {
      const mockError = new Error('Listing failed');
      stripe.issuing.authorizations.list.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_list_authorizations({})).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.authorizations.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_approve_authorization', () => {
    test('should approve an authorization successfully', async () => {
      const mockApprovedAuth = { id: 'auth_test', status: 'approved' };
      stripe.issuing.authorizations.approve.mockResolvedValueOnce(mockApprovedAuth);

      const params = { authorization_id: 'auth_test', amount: 1000 };
      const result = await mcp_stripe_issuing_approve_authorization(params);
      expect(result).toEqual(mockApprovedAuth);
      expect(stripe.issuing.authorizations.approve).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.authorizations.approve).toHaveBeenCalledWith(params.authorization_id, { amount: params.amount });
    });

    test('should throw an error if approving authorization fails', async () => {
      const mockError = new Error('Approval failed');
      stripe.issuing.authorizations.approve.mockRejectedValueOnce(mockError);

      const params = { authorization_id: 'invalid_id', amount: 1000 };
      await expect(mcp_stripe_issuing_approve_authorization(params)).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.authorizations.approve).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_decline_authorization', () => {
    test('should decline an authorization successfully', async () => {
      const mockDeclinedAuth = { id: 'auth_test', status: 'declined' };
      stripe.issuing.authorizations.decline.mockResolvedValueOnce(mockDeclinedAuth);

      const result = await mcp_stripe_issuing_decline_authorization({ authorization_id: 'auth_test' });
      expect(result).toEqual(mockDeclinedAuth);
      expect(stripe.issuing.authorizations.decline).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.authorizations.decline).toHaveBeenCalledWith('auth_test');
    });

    test('should throw an error if declining authorization fails', async () => {
      const mockError = new Error('Decline failed');
      stripe.issuing.authorizations.decline.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_decline_authorization({ authorization_id: 'invalid_id' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.authorizations.decline).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_create_dispute', () => {
    test('should create a dispute successfully', async () => {
      const mockDispute = { id: 'dis_test', reason: 'fraudulent' };
      stripe.issuing.disputes.create.mockResolvedValueOnce(mockDispute);

      const params = {
        transaction_id: 'txn_123',
        reason: 'fraudulent',
      };
      const result = await mcp_stripe_issuing_create_dispute(params);
      expect(result).toEqual(mockDispute);
      expect(stripe.issuing.disputes.create).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.disputes.create).toHaveBeenCalledWith(params);
    });

    test('should throw an error if dispute creation fails', async () => {
      const mockError = new Error('Dispute failed');
      stripe.issuing.disputes.create.mockRejectedValueOnce(mockError);

      const params = {
        transaction_id: 'txn_123',
        reason: 'fraudulent',
      };
      await expect(mcp_stripe_issuing_create_dispute(params)).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.disputes.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_retrieve_dispute', () => {
    test('should retrieve a dispute successfully', async () => {
      const mockDispute = { id: 'dis_test', status: 'lost' };
      stripe.issuing.disputes.retrieve.mockResolvedValueOnce(mockDispute);

      const result = await mcp_stripe_issuing_retrieve_dispute({ dispute_id: 'dis_test' });
      expect(result).toEqual(mockDispute);
      expect(stripe.issuing.disputes.retrieve).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.disputes.retrieve).toHaveBeenCalledWith('dis_test');
    });

    test('should throw an error if dispute retrieval fails', async () => {
      const mockError = new Error('Dispute not found');
      stripe.issuing.disputes.retrieve.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_retrieve_dispute({ dispute_id: 'invalid_id' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.disputes.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_retrieve_transaction', () => {
    test('should retrieve a transaction successfully', async () => {
      const mockTransaction = { id: 'txn_test', amount: 500 };
      stripe.issuing.transactions.retrieve.mockResolvedValueOnce(mockTransaction);

      const result = await mcp_stripe_issuing_retrieve_transaction({ transaction_id: 'txn_test' });
      expect(result).toEqual(mockTransaction);
      expect(stripe.issuing.transactions.retrieve).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.transactions.retrieve).toHaveBeenCalledWith('txn_test');
    });

    test('should throw an error if transaction retrieval fails', async () => {
      const mockError = new Error('Transaction not found');
      stripe.issuing.transactions.retrieve.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_retrieve_transaction({ transaction_id: 'invalid_id' })).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.transactions.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_stripe_issuing_list_transactions', () => {
    test('should list transactions successfully', async () => {
      const mockTransactions = [{ id: 'txn1' }, { id: 'txn2' }];
      stripe.issuing.transactions.list.mockResolvedValueOnce({ data: mockTransactions });

      const params = { limit: 2, cardholder: 'ich_test' };
      const result = await mcp_stripe_issuing_list_transactions(params);
      expect(result).toEqual(mockTransactions);
      expect(stripe.issuing.transactions.list).toHaveBeenCalledTimes(1);
      expect(stripe.issuing.transactions.list).toHaveBeenCalledWith(params);
    });

    test('should throw an error if listing transactions fails', async () => {
      const mockError = new Error('Listing failed');
      stripe.issuing.transactions.list.mockRejectedValueOnce(mockError);

      await expect(mcp_stripe_issuing_list_transactions({})).rejects.toThrow(
        `Stripe API Error: ${mockError.message}`
      );
      expect(stripe.issuing.transactions.list).toHaveBeenCalledTimes(1);
    });
  });
});
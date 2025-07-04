import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mcp_risk_underwriting_ingest_data,
  mcp_risk_underwriting_calculate_risk_score,
  mcp_risk_underwriting_make_decision
} from '../src/tools/stripe_agents/stripe-risk-underwriting-agent.js';
import logger from '../src/logger.js';

// Mock the logger to prevent console output during tests
vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Stripe Risk Assessment and Underwriting Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test cases for mcp_risk_underwriting_ingest_data
  describe('mcp_risk_underwriting_ingest_data', () => {
    it('should successfully ingest data', async () => {
      const params = {
        customer_id: 'cust_123',
        data: { credit_score: 750, bank_balance: 100000 },
        data_source: 'Experian',
      };
      const result = await mcp_risk_underwriting_ingest_data(params);
      expect(result).toEqual({ success: true, message: `Data from ${params.data_source} ingested for customer ${params.customer_id}` });
      expect(logger.info).toHaveBeenCalledWith('Executing mcp_risk_underwriting_ingest_data', { params });
    });

    it('should throw an error if data ingestion fails (simulated)', async () => {
      const params = {
        customer_id: 'cust_456',
        data: { invalid: true },
        data_source: 'Broken_API',
      };

      // Temporarily override the function to simulate an error
      const originalIngestData = mcp_risk_underwriting_ingest_data;
      mcp_risk_underwriting_ingest_data = vi.fn().mockImplementation(() => {
        throw new Error('Simulated ingestion error');
      });

      await expect(mcp_risk_underwriting_ingest_data(params)).rejects.toThrow('Risk Underwriting API Error: Simulated ingestion error');
      expect(logger.error).toHaveBeenCalledWith(
        `mcp_risk_underwriting_ingest_data failed for customer ${params.customer_id}`,
        { error: 'Simulated ingestion error', stack: expect.any(String) }
      );
      mcp_risk_underwriting_ingest_data = originalIngestData;
    });
  });

  // Test cases for mcp_risk_underwriting_calculate_risk_score
  describe('mcp_risk_underwriting_calculate_risk_score', () => {
    it('should calculate a low risk score for high creditworthiness', async () => {
      const params = {
        customer_id: 'cust_789',
        financial_data: { income: 100000 },
        credit_score_data: { score: 800 },
        alternative_data: { payment_history: 'good' },
      };
      const result = await mcp_risk_underwriting_calculate_risk_score(params);
      expect(result.risk_score).toBeGreaterThanOrEqual(175); // 50 (financial) + 100 (credit) + 25 (alternative)
      expect(result.risk_category).toBe('low');
      expect(result.customer_id).toBe(params.customer_id);
    });

    it('should calculate a medium risk score', async () => {
      const params = {
        customer_id: 'cust_101',
        financial_data: { income: 50000 },
        credit_score_data: { score: 650 },
      };
      const result = await mcp_risk_underwriting_calculate_risk_score(params);
      expect(result.risk_score).toBeGreaterThanOrEqual(50); // financial data only
      expect(result.risk_category).toBe('medium');
    });

    it('should calculate a high risk score', async () => {
      const params = {
        customer_id: 'cust_102',
        financial_data: null,
        credit_score_data: { score: 500 },
      };
      const result = await mcp_risk_underwriting_calculate_risk_score(params);
      expect(result.risk_score).toBeLessThan(75);
      expect(result.risk_category).toBe('high');
    });

    it('should throw an error if risk score calculation fails (simulated)', async () => {
      const params = { customer_id: 'cust_error' };

      const originalCalculateRiskScore = mcp_risk_underwriting_calculate_risk_score;
      mcp_risk_underwriting_calculate_risk_score = vi.fn().mockImplementation(() => {
        throw new Error('Simulated calculation error');
      });

      await expect(mcp_risk_underwriting_calculate_risk_score(params)).rejects.toThrow('Risk Underwriting API Error: Simulated calculation error');
      mcp_risk_underwriting_calculate_risk_score = originalCalculateRiskScore;
    });
  });

  // Test cases for mcp_risk_underwriting_make_decision
  describe('mcp_risk_underwriting_make_decision', () => {
    it('should approve for low risk and high score', async () => {
      const params = {
        customer_id: 'cust_approve',
        risk_score: 180,
        risk_category: 'low',
        loan_amount_requested: 20000,
      };
      const result = await mcp_risk_underwriting_make_decision(params);
      expect(result.decision).toBe('approved');
      expect(result.rationale).toBe('Low risk and high creditworthiness.');
    });

    it('should approve for medium risk and smaller loan amount', async () => {
      const params = {
        customer_id: 'cust_medium_approve',
        risk_score: 120,
        risk_category: 'medium',
        loan_amount_requested: 40000,
      };
      const result = await mcp_risk_underwriting_make_decision(params);
      expect(result.decision).toBe('approved');
      expect(result.rationale).toBe('Medium risk, but acceptable for smaller loan amount.');
    });

    it('should decline for high risk', async () => {
      const params = {
        customer_id: 'cust_decline',
        risk_score: 60,
        risk_category: 'high',
        loan_amount_requested: 70000,
      };
      const result = await mcp_risk_underwriting_make_decision(params);
      expect(result.decision).toBe('declined');
      expect(result.rationale).toBe('Risk score too high or insufficient data.');
    });

    it('should decline for medium risk with large loan amount', async () => {
      const params = {
        customer_id: 'cust_medium_decline',
        risk_score: 120,
        risk_category: 'medium',
        loan_amount_requested: 60000,
      };
      const result = await mcp_risk_underwriting_make_decision(params);
      expect(result.decision).toBe('declined');
      expect(result.rationale).toBe('Risk score too high or insufficient data.');
    });

    it('should throw an error if decision making fails (simulated)', async () => {
      const params = { customer_id: 'cust_error_decision', risk_score: 100, risk_category: 'medium' };

      const originalMakeDecision = mcp_risk_underwriting_make_decision;
      mcp_risk_underwriting_make_decision = vi.fn().mockImplementation(() => {
        throw new Error('Simulated decision error');
      });

      await expect(mcp_risk_underwriting_make_decision(params)).rejects.toThrow('Risk Underwriting API Error: Simulated decision error');
      mcp_risk_underwriting_make_decision = originalMakeDecision;
    });
  });
}); 
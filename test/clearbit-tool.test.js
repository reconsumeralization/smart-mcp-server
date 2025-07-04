import { describe, it, expect, beforeEach, vi } from 'vitest';
import fetch from 'node-fetch';
import ClearbitTool from '../src/tools/clearbit-tool.js';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

// Mock environment variables
const mockApiKey = 'sk_test_clearbit';
process.env.CLEARBIT_API_KEY = mockApiKey;

describe('ClearbitTool', () => {
  let clearbitTool;

  beforeEach(() => {
    vi.clearAllMocks();
    clearbitTool = new ClearbitTool();
  });

  describe('mcp_clearbit_enrich_company', () => {
    it('should enrich company data successfully', async () => {
      const mockCompanyData = { name: 'Stripe', domain: 'stripe.com' };
      fetch.default.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompanyData),
      });

      const params = { domain: 'stripe.com' };
      const result = await clearbitTool.mcp_clearbit_enrich_company(params);

      expect(result).toEqual({ success: true, message: `Company enrichment successful for ${params.domain}`, data: mockCompanyData });
      expect(fetch.default).toHaveBeenCalledWith(
        `https://company.clearbit.com/v2/companies/find?domain=${params.domain}`,
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle errors during company enrichment', async () => {
      const errorMessage = 'Company not found';
      fetch.default.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(errorMessage),
      });

      const params = { domain: 'nonexistent.com' };
      const result = await clearbitTool.mcp_clearbit_enrich_company(params);

      expect(result).toEqual({ success: false, message: 'Failed to enrich company data', error: `Clearbit API error: 404 Not Found - ${errorMessage}` });
      expect(fetch.default).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_clearbit_enrich_person', () => {
    it('should enrich person data successfully', async () => {
      const mockPersonData = { name: 'Brian Damon', email: 'brian.damon@stripe.com' };
      fetch.default.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPersonData),
      });

      const params = { email: 'brian.damon@stripe.com' };
      const result = await clearbitTool.mcp_clearbit_enrich_person(params);

      expect(result).toEqual({ success: true, message: `Person enrichment successful for ${params.email}`, data: mockPersonData });
      expect(fetch.default).toHaveBeenCalledWith(
        `https://person.clearbit.com/v2/people/find?email=${params.email}`,
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle errors during person enrichment', async () => {
      const errorMessage = 'Person not found';
      fetch.default.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(errorMessage),
      });

      const params = { email: 'nonexistent@example.com' };
      const result = await clearbitTool.mcp_clearbit_enrich_person(params);

      expect(result).toEqual({ success: false, message: 'Failed to enrich person data', error: `Clearbit API error: 404 Not Found - ${errorMessage}` });
      expect(fetch.default).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_clearbit_identify_website_visitor', () => {
    it('should identify website visitor successfully', async () => {
      const mockVisitorData = { company: { name: 'Google' }, ip: '8.8.8.8' };
      fetch.default.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVisitorData),
      });

      const params = { ip: '8.8.8.8' };
      const result = await clearbitTool.mcp_clearbit_identify_website_visitor(params);

      expect(result).toEqual({ success: true, message: `Website visitor identification successful for IP: ${params.ip}`, data: mockVisitorData });
      expect(fetch.default).toHaveBeenCalledWith(
        `https://reveal.clearbit.com/v1/companies/find?ip=${params.ip}`,
        {
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle errors during website visitor identification', async () => {
      const errorMessage = 'Invalid IP address';
      fetch.default.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(errorMessage),
      });

      const params = { ip: 'invalid-ip' };
      const result = await clearbitTool.mcp_clearbit_identify_website_visitor(params);

      expect(result).toEqual({ success: false, message: 'Failed to identify website visitor', error: `Clearbit API error: 400 Bad Request - ${errorMessage}` });
      expect(fetch.default).toHaveBeenCalledTimes(1);
    });
  });
});
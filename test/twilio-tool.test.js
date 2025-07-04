import { describe, it, expect, beforeEach, vi } from 'vitest';
import twilio from 'twilio';
import TwilioTool from '../src/tools/twilio-tool.js';

// Mock the Twilio module
vi.mock('twilio', () => {
  return vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
    calls: {
      create: vi.fn(),
    },
    verify: {
      v2: {
        services: vi.fn(() => ({
          verifications: {
            create: vi.fn(),
          },
          verificationChecks: {
            create: vi.fn(),
          },
        })),
      },
    },
    lookups: {
      v1: {
        phoneNumbers: vi.fn(() => ({
          fetch: vi.fn(),
        })),
      },
    },
  }));
});

// Mock environment variables
const mockAccountSid = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const mockAuthToken = 'your_auth_token';
const mockVerifyServiceSid = 'VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// Set environment variables before tests run
process.env.TWILIO_ACCOUNT_SID = mockAccountSid;
process.env.TWILIO_AUTH_TOKEN = mockAuthToken;
process.env.TWILIO_VERIFY_SERVICE_SID = mockVerifyServiceSid;

describe('TwilioTool', () => {
  let twilioClient;

  beforeEach(() => {
    vi.clearAllMocks();
    twilioClient = twilio();
  });

  describe('mcp_twilio_send_sms', () => {
    it('should send an SMS message successfully', async () => {
      const mockMessage = { sid: 'SM123', status: 'queued' };
      twilioClient.messages.create.mockResolvedValue(mockMessage);

      const params = {
        to: '+1234567890',
        body: 'Test SMS',
        from: '+10987654321', // This should typically be set as an env var or config
      };

      const result = await new TwilioTool().mcp_twilio_send_sms(params);

      expect(result).toEqual({ success: true, message: `SMS sent to ${params.to}: ${params.body}`, data: mockMessage });
      expect(twilioClient.messages.create).toHaveBeenCalledWith({
        to: params.to,
        body: params.body,
        from: params.from,
      });
    });

    it('should handle errors during SMS sending', async () => {
      const errorMessage = 'Failed to send SMS';
      twilioClient.messages.create.mockRejectedValue(new Error(errorMessage));

      const params = {
        to: '+1234567890',
        body: 'Test SMS',
        from: '+10987654321',
      };

      const result = await new TwilioTool().mcp_twilio_send_sms(params);

      expect(result).toEqual({ success: false, message: 'Failed to send SMS', error: errorMessage });
      expect(twilioClient.messages.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_twilio_make_call', () => {
    it('should make a call successfully', async () => {
      const mockCall = { sid: 'CA123', status: 'queued' };
      twilioClient.calls.create.mockResolvedValue(mockCall);

      const params = {
        to: '+1234567890',
        from: '+10987654321',
        twiml: '<Response><Say>Hello</Say></Response>',
      };

      const result = await new TwilioTool().mcp_twilio_make_call(params);

      expect(result).toEqual({ success: true, message: `Call initiated to ${params.to}`, data: mockCall });
      expect(twilioClient.calls.create).toHaveBeenCalledWith({
        to: params.to,
        from: params.from,
        twiml: params.twiml,
      });
    });

    it('should handle errors during call initiation', async () => {
      const errorMessage = 'Failed to make call';
      twilioClient.calls.create.mockRejectedValue(new Error(errorMessage));

      const params = {
        to: '+1234567890',
        from: '+10987654321',
        twiml: '<Response><Say>Hello</Say></Response>',
      };

      const result = await new TwilioTool().mcp_twilio_make_call(params);

      expect(result).toEqual({ success: false, message: 'Failed to make call', error: errorMessage });
      expect(twilioClient.calls.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_twilio_verify_phone', () => {
    it('should send a verification code successfully', async () => {
      const mockVerification = { sid: 'VE123', status: 'pending' };
      twilioClient.verify.v2.services(mockVerifyServiceSid).verifications.create.mockResolvedValue(mockVerification);

      const params = {
        to: '+1234567890',
        channel: 'sms',
      };

      const result = await new TwilioTool().mcp_twilio_verify_phone(params);

      expect(result).toEqual({ success: true, message: `Verification code sent to ${params.to} via ${params.channel}`, data: mockVerification });
      expect(twilioClient.verify.v2.services(mockVerifyServiceSid).verifications.create).toHaveBeenCalledWith({
        to: params.to,
        channel: params.channel,
      });
    });

    it('should handle errors during verification code sending', async () => {
      const errorMessage = 'Failed to send verification code';
      twilioClient.verify.v2.services(mockVerifyServiceSid).verifications.create.mockRejectedValue(new Error(errorMessage));

      const params = {
        to: '+1234567890',
        channel: 'sms',
      };

      const result = await new TwilioTool().mcp_twilio_verify_phone(params);

      expect(result).toEqual({ success: false, message: 'Failed to send verification code', error: errorMessage });
      expect(twilioClient.verify.v2.services(mockVerifyServiceSid).verifications.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('mcp_twilio_lookup_phone_number', () => {
    it('should lookup a phone number successfully', async () => {
      const mockPhoneNumber = { carrier: { name: 'AT&T' }, type: 'mobile' };
      twilioClient.lookups.v1.phoneNumbers(vi.any()).fetch.mockResolvedValue(mockPhoneNumber);

      const params = {
        phoneNumber: '+1234567890',
      };

      const result = await new TwilioTool().mcp_twilio_lookup_phone_number(params);

      expect(result).toEqual({ success: true, message: `Phone number lookup successful for ${params.phoneNumber}`, data: mockPhoneNumber });
      expect(twilioClient.lookups.v1.phoneNumbers).toHaveBeenCalledWith(params.phoneNumber);
      expect(twilioClient.lookups.v1.phoneNumbers(params.phoneNumber).fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during phone number lookup', async () => {
      const errorMessage = 'Failed to lookup phone number';
      twilioClient.lookups.v1.phoneNumbers(vi.any()).fetch.mockRejectedValue(new Error(errorMessage));

      const params = {
        phoneNumber: '+1234567890',
      };

      const result = await new TwilioTool().mcp_twilio_lookup_phone_number(params);

      expect(result).toEqual({ success: false, message: 'Failed to lookup phone number', error: errorMessage });
      expect(twilioClient.lookups.v1.phoneNumbers).toHaveBeenCalledTimes(1);
      expect(twilioClient.lookups.v1.phoneNumbers(params.phoneNumber).fetch).toHaveBeenCalledTimes(1);
    });
  });
}); 
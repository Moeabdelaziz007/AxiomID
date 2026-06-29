/**
 * @jest-environment node
 */

import { verifyKycServerSide } from '@/lib/pi-kyc';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('verifyKycServerSide', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, PI_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns kyc_verified true when Pi API confirms KYC', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        uid: 'user-123',
        kyc_verified: true,
        wallet: { address: 'GABC123...' },
      }),
    });

    const result = await verifyKycServerSide('valid-token');
    expect(result.kycVerified).toBe(true);
    expect(result.uid).toBe('user-123');
  });

  it('returns kyc_verified false when Pi API says not KYCed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        uid: 'user-123',
        kyc_verified: false,
      }),
    });

    const result = await verifyKycServerSide('valid-token');
    expect(result.kycVerified).toBe(false);
  });

  it('throws on Pi API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(verifyKycServerSide('bad-token')).rejects.toThrow();
  });

  it('throws on network timeout', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    await expect(verifyKycServerSide('token')).rejects.toThrow('timeout');
  });

  it('throws when PI_API_KEY is not set', async () => {
    process.env.PI_API_KEY = '';
    await expect(verifyKycServerSide('token')).rejects.toThrow('PI_API_KEY');
  });
});

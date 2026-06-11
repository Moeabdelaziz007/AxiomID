import {
  PiAuthSchema,
  UserStatusSchema,
  ActionClaimSchema,
  WalletConnectSchema,
  PaymentApproveSchema,
  PaymentCompleteSchema,
} from '@/lib/validators';

describe('PiAuthSchema', () => {
  it('accepts valid Pi auth data', () => {
    const result = PiAuthSchema.safeParse({
      accessToken: 'valid-token-123',
      uid: 'user-uid-123',
      username: 'testuser',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty accessToken', () => {
    const result = PiAuthSchema.safeParse({
      accessToken: '',
      uid: 'user-uid-123',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing uid', () => {
    const result = PiAuthSchema.safeParse({
      accessToken: 'token',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing username', () => {
    const result = PiAuthSchema.safeParse({
      accessToken: 'token',
      uid: 'uid',
    });
    expect(result.success).toBe(false);
  });
});

describe('UserStatusSchema', () => {
  it('accepts valid userId', () => {
    const result = UserStatusSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid walletAddress', () => {
    const result = UserStatusSchema.safeParse({
      walletAddress: '0x' + 'a'.repeat(40),
    });
    expect(result.success).toBe(true);
  });

  it('accepts pi: wallet address', () => {
    const result = UserStatusSchema.safeParse({
      walletAddress: 'pi:abc123def456',
    });
    expect(result.success).toBe(true);
  });

  it('accepts demo: wallet address', () => {
    const result = UserStatusSchema.safeParse({
      walletAddress: 'demo:abc12345',
    });
    expect(result.success).toBe(true);
  });

  it('accepts Stellar G-address', () => {
    const result = UserStatusSchema.safeParse({
      walletAddress: 'G' + 'A'.repeat(54),
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid wallet address format', () => {
    const result = UserStatusSchema.safeParse({
      walletAddress: 'not-a-wallet',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when neither userId nor walletAddress provided', () => {
    const result = UserStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ActionClaimSchema', () => {
  it('accepts valid action claim', () => {
    const result = ActionClaimSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      actionType: 'connect_twitter',
    });
    expect(result.success).toBe(true);
  });

  it('accepts action claim with metadata', () => {
    const result = ActionClaimSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      actionType: 'daily_pow',
      metadata: { source: 'mobile' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty actionType', () => {
    const result = ActionClaimSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      actionType: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts Pi UID userId', () => {
    const result = ActionClaimSchema.safeParse({
      userId: 'pi-user-abc123',
      actionType: 'connect_twitter',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty userId', () => {
    const result = ActionClaimSchema.safeParse({
      userId: '',
      actionType: 'connect_twitter',
    });
    expect(result.success).toBe(false);
  });
});

describe('WalletConnectSchema', () => {
  it('accepts valid wallet connect', () => {
    const result = WalletConnectSchema.safeParse({
      walletAddress: '0x' + 'a'.repeat(40),
      state: 'base64url-state-token',
    });
    expect(result.success).toBe(true);
  });

  it('accepts pi: wallet address', () => {
    const result = WalletConnectSchema.safeParse({
      walletAddress: 'pi:abc123def456',
      state: 'state-token',
    });
    expect(result.success).toBe(true);
  });

  it('accepts demo: wallet address', () => {
    const result = WalletConnectSchema.safeParse({
      walletAddress: 'demo:abc12345',
      state: 'state-token',
    });
    expect(result.success).toBe(true);
  });

  it('accepts with optional signature', () => {
    const result = WalletConnectSchema.safeParse({
      walletAddress: '0x' + 'a'.repeat(40),
      state: 'state-token',
      signature: '0xsignature',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid wallet address', () => {
    const result = WalletConnectSchema.safeParse({
      walletAddress: '0x123',
      state: 'state-token',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty state token', () => {
    const result = WalletConnectSchema.safeParse({
      walletAddress: '0x' + 'a'.repeat(40),
      state: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('PaymentApproveSchema', () => {
  it('accepts valid paymentId', () => {
    const result = PaymentApproveSchema.safeParse({
      paymentId: 'payment-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty paymentId', () => {
    const result = PaymentApproveSchema.safeParse({
      paymentId: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('PaymentCompleteSchema', () => {
  it('accepts valid payment completion', () => {
    const result = PaymentCompleteSchema.safeParse({
      paymentId: 'payment-123',
      txid: 'tx-hash-abc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty txid', () => {
    const result = PaymentCompleteSchema.safeParse({
      paymentId: 'payment-123',
      txid: '',
    });
    expect(result.success).toBe(false);
  });
});

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { PassportView } from '@/app/passport/[slug]/PassportView';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/app/context/language-context';
import { sharePassport } from '@/lib/pi-native-features';

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}
let queryClient = makeQueryClient();
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock language context
jest.mock('@/app/context/language-context', () => ({
  useLanguage: jest.fn(),
}));

// Mock pi-native-features
jest.mock('@/lib/pi-native-features', () => ({
  sharePassport: jest.fn(),
}));

// Mock child components
jest.mock('@/components/AgentPassport', () => ({
  AgentPassport: (props: { username: string; did: string; tier: string }) => (
    <div data-testid="agent-passport">
      <span data-testid="ap-username">{props.username}</span>
      <span data-testid="ap-did">{props.did}</span>
      <span data-testid="ap-tier">{props.tier}</span>
    </div>
  ),
}));

jest.mock('@/components/PassportQR', () => ({
  PassportQR: (props: { did: string }) => <div data-testid="agent-qr" data-did={props.did} />,
}));

const mockPassportData = {
  username: 'testuser',
  walletAddress: '0x123',
  stellarAddress: 'G123',
  did: 'did:pi:123',
  tier: 'Citizen',
  xp: 100,
  trustScore: 85,
  kyaStatus: 'verified',
  kycStatus: 'verified',
  stamps: [],
  issuedDate: '2023-01-01',
  agentName: 'Test Agent',
  agentStatus: 'ACTIVE',
};

const mockTranslate = jest.fn((key: string) => `translated_${key}`);

describe('PassportView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();

    // Default mocks
    (useParams as jest.Mock).mockReturnValue({ slug: 'test-slug' });
    (useLanguage as jest.Mock).mockReturnValue({ t: mockTranslate });

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading state initially', async () => {
    // Make fetch hang forever to check loading state
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<PassportView />, { wrapper: TestWrapper });

    // Check for the skeleton loader
    expect(container.querySelector('[data-testid="skeleton"]')).toBeTruthy();
    expect(screen.queryByTestId('agent-passport')).not.toBeInTheDocument();
  });

  it('renders passport data on successful fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPassportData,
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('agent-passport')).toBeInTheDocument();
    });

    expect(screen.getByTestId('ap-username')).toHaveTextContent('testuser');
    expect(screen.getByTestId('ap-did')).toHaveTextContent('did:pi:123');
    expect(screen.getByTestId('ap-tier')).toHaveTextContent('Citizen');
    expect(screen.getByTestId('agent-qr')).toBeInTheDocument();

    // Loading skeleton should be gone
    const loadingSkeleton = document.querySelector('[data-testid="skeleton"]');
    expect(loadingSkeleton).not.toBeInTheDocument();
  });

  it('renders error state on fetch failure (network error)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getAllByText('translated_passport_not_found')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('Network failure')).toBeInTheDocument();
    expect(screen.getByText('translated_create_your_passport')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-passport')).not.toBeInTheDocument();
  });

  it('renders error state on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Custom API Error' }),
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getAllByText('translated_passport_not_found')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('Custom API Error')).toBeInTheDocument();
  });

  it('handles share button click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPassportData,
    });

    const user = userEvent.setup();
    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('translated_share_passport')).toBeInTheDocument();
    });

    await user.click(screen.getByText('translated_share_passport'));

    expect(sharePassport).toHaveBeenCalledWith({
      title: 'translated_share_title',
      text: 'translated_share_text',
      url: window.location.href, // just pass what it actually is in jsdom
    });
  });


  it('ignores abort errors during fetch', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // We expect NO state updates to happen, so it stays loading
    expect(screen.queryByTestId('agent-passport')).not.toBeInTheDocument();
  });


  it('renders passport data without optional fields', async () => {
    const minData = {
      username: 'testuser',
      walletAddress: null,
      did: 'did:pi:123',
      tier: 'Citizen',
      xp: 100,
      trustScore: 85,
      kyaStatus: 'verified',
      kycStatus: 'verified',
      issuedDate: '2023-01-01',
      agentName: null,
      agentStatus: null,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => minData,
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('agent-passport')).toBeInTheDocument();
    });
  });


  it('falls back to default error message if json throws on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => { throw new Error('Parse error'); },
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getAllByText('translated_passport_not_found')[0]).toBeInTheDocument();
    });

    // It should use the fallback message from t('passport_not_found')
    const errorElements = screen.getAllByText('translated_passport_not_found');
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it('renders an error state when a successful response body fails to parse as JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Unexpected token')),
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Unexpected token')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('agent-passport')).not.toBeInTheDocument();
  });

  it('uses generic fallback message if fetch error is not an Error instance', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce('String error, not Error object');

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getAllByText('translated_passport_not_found')[0]).toBeInTheDocument();
    });

    // Component renders error.message; for a string rejection error.message is undefined
    // so we just verify the error state loaded correctly
    expect(screen.getByText('translated_create_your_passport')).toBeInTheDocument();
  });

  it('clears pending poll timeout on unmount after polling starts', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // First fetch returns a job still building — triggers polling
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockPassportData, jobStatus: 'PROVISIONING' }),
    });

    const { unmount } = render(<PassportView />, { wrapper: TestWrapper });

    // Wait for first fetch to complete and polling to start
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('does not throw or update state when the fetch resolves after unmount', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { unmount } = render(<PassportView />, { wrapper: TestWrapper });
    unmount();

    // Resolving the in-flight fetch after unmount should not throw, even
    // though the component's cleanup already aborted the request.
    await act(async () => {
      resolveFetch({ ok: true, json: async () => mockPassportData });
      await Promise.resolve();
    });
  });

  it('calls the passport API with a URL-encoded slug', async () => {
    (useParams as jest.Mock).mockReturnValue({ slug: 'name/with special?chars' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPassportData,
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`/api/passport/${encodeURIComponent('name/with special?chars')}`);
  });

  it('does nothing if slug is missing', () => {
    (useParams as jest.Mock).mockReturnValue({ slug: undefined });

    const { container } = render(<PassportView />, { wrapper: TestWrapper });

    expect(global.fetch).not.toHaveBeenCalled();
    // Component returns null when slug is missing because the query is disabled
    expect(container.innerHTML).toBe('');
  });

  it('does not fetch when slug is an empty string', () => {
    (useParams as jest.Mock).mockReturnValue({ slug: '' });

    render(<PassportView />, { wrapper: TestWrapper });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders the "preparing" screen with the job status while the identity is still building', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockPassportData, jobStatus: 'PROVISIONING' }),
    });

    const { unmount } = render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Preparing your AI...')).toBeInTheDocument();
    });

    expect(screen.getByText('Status: PROVISIONING')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-passport')).not.toBeInTheDocument();

    unmount();
  });

  it('renders the full passport view (not the "preparing" screen) when jobStatus is ACTIVE', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockPassportData, jobStatus: 'ACTIVE' }),
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('agent-passport')).toBeInTheDocument();
    });

    expect(screen.queryByText('Preparing your AI...')).not.toBeInTheDocument();
  });

  it('renders the full passport view (not the "preparing" screen) when jobStatus is COMPLETED', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockPassportData, jobStatus: 'COMPLETED' }),
    });

    render(<PassportView />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('agent-passport')).toBeInTheDocument();
    });

    expect(screen.queryByText('Preparing your AI...')).not.toBeInTheDocument();
  });
});

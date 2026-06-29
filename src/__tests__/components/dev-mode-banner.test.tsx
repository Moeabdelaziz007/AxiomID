/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DevModeBanner } from '@/components/DevModeBanner';

jest.mock('@/lib/pi-sdk', () => ({
  determineSandboxMode: jest.fn(),
}));

import { determineSandboxMode } from '@/lib/pi-sdk';
const mockDetermineSandbox = determineSandboxMode as jest.Mock;

describe('DevModeBanner', () => {
  it('renders nothing when not in sandbox mode', () => {
    mockDetermineSandbox.mockReturnValue(false);
    const { container } = render(<DevModeBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders red banner when in sandbox mode', () => {
    mockDetermineSandbox.mockReturnValue(true);
    render(<DevModeBanner />);
    expect(screen.getByText(/DEV MODE/)).toBeInTheDocument();
  });

  it('shows warning text about Pi Network', () => {
    mockDetermineSandbox.mockReturnValue(true);
    render(<DevModeBanner />);
    expect(screen.getByText(/Not connected to Pi Network/)).toBeInTheDocument();
  });
});
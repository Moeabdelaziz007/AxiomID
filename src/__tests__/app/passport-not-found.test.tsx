/**
 * Tests for src/app/passport/[slug]/not-found.tsx
 *
 * PR changes:
 * - Component added "use client" directive
 * - Now uses useLanguage() for i18n:
 *   passport_not_found, passport_not_found_description, create_your_passport
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PassportNotFound from '@/app/passport/[slug]/not-found';

// The global jest.setup.js mock for useLanguage returns the key itself for
// unknown keys. New keys from this PR fall back to the key string.

describe('PassportNotFound — i18n integration (PR change)', () => {
  it('renders heading via t("passport_not_found")', () => {
    render(<PassportNotFound />);

    // Global mock: t('passport_not_found') returns key string 'passport_not_found'
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText('passport_not_found')).toBeInTheDocument();
  });

  it('renders description via t("passport_not_found_description")', () => {
    render(<PassportNotFound />);

    // New key added in PR — falls back to key with global mock
    expect(screen.getByText('passport_not_found_description')).toBeInTheDocument();
  });

  it('renders Create Your Passport link via t("create_your_passport")', () => {
    render(<PassportNotFound />);

    expect(screen.getByText('create_your_passport')).toBeInTheDocument();
  });

  it('Create Your Passport link points to /', () => {
    render(<PassportNotFound />);

    const link = screen.getByText('create_your_passport').closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders with real EN translations when useLanguage provides them', () => {
    const { useLanguage } = jest.requireMock('@/app/context/language-context');
    (useLanguage as jest.Mock).mockReturnValueOnce({
      language: 'en',
      setLanguage: jest.fn(),
      t: (key: string) => {
        const { translations } = jest.requireActual('@/app/context/language-context') as any;
        return translations.en[key] || key;
      },
    });

    render(<PassportNotFound />);

    expect(screen.getByText('Passport Not Found')).toBeInTheDocument();
    expect(screen.getByText("This passport doesn't exist or has been removed.")).toBeInTheDocument();
    expect(screen.getByText('CREATE YOUR PASSPORT')).toBeInTheDocument();
  });

  it('renders with real AR translations when language is Arabic', () => {
    const { useLanguage } = jest.requireMock('@/app/context/language-context');
    (useLanguage as jest.Mock).mockReturnValueOnce({
      language: 'ar',
      setLanguage: jest.fn(),
      t: (key: string) => {
        const { translations } = jest.requireActual('@/app/context/language-context') as any;
        return translations.ar[key] || key;
      },
    });

    render(<PassportNotFound />);

    expect(screen.getByText('جواز السفر غير موجود')).toBeInTheDocument();
    expect(screen.getByText('هذا الجواز غير موجود أو تمت إزالته.')).toBeInTheDocument();
    expect(screen.getByText('أنشئ جواز سفرك')).toBeInTheDocument();
  });

  it('does not render a reset button (not-found is informational only)', () => {
    render(<PassportNotFound />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
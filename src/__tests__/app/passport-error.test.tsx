/**
 * Tests for src/app/passport/[slug]/error.tsx
 *
 * PR changes:
 * - Component now uses useLanguage() for i18n on all text strings:
 *   something_went_wrong, passport_load_error, try_again, create_your_passport
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PassportError from '@/app/passport/[slug]/error';

// The global jest.setup.js mock for useLanguage returns the key itself for
// unknown keys (mockDict[key] || key). New keys added in this PR fall back to
// returning the key string. We override per-test when we want real translations.

describe('PassportError — i18n integration (PR change)', () => {
  it('renders heading via t("something_went_wrong")', () => {
    const error = new Error('Test error');
    render(<PassportError error={error} reset={() => {}} />);

    // With the global mock, t('something_went_wrong') returns 'something_went_wrong' (key fallback)
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('shows error message when error.message is provided', () => {
    const error = new Error('Custom error message from server');
    render(<PassportError error={error} reset={() => {}} />);

    expect(screen.getByText('Custom error message from server')).toBeInTheDocument();
  });

  it('falls back to t("passport_load_error") when error.message is empty', () => {
    const error = Object.assign(new Error(''), { message: '' });
    render(<PassportError error={error} reset={() => {}} />);

    // Empty message → t('passport_load_error') is used; with global mock → 'passport_load_error'
    expect(screen.getByText('passport_load_error')).toBeInTheDocument();
  });

  it('renders Try Again button via t("try_again")', () => {
    const error = new Error('err');
    render(<PassportError error={error} reset={() => {}} />);

    // t('try_again') falls back to key 'try_again' in global mock
    expect(screen.getByText('try_again')).toBeInTheDocument();
  });

  it('renders Create Your Passport link via t("create_your_passport")', () => {
    const error = new Error('err');
    render(<PassportError error={error} reset={() => {}} />);

    // t('create_your_passport') falls back to key in global mock
    expect(screen.getByText('create_your_passport')).toBeInTheDocument();
  });

  it('calls reset when Try Again button is clicked', () => {
    const mockReset = jest.fn();
    const error = new Error('err');
    render(<PassportError error={error} reset={mockReset} />);

    fireEvent.click(screen.getByText('try_again'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('Create Your Passport link points to /', () => {
    const error = new Error('err');
    render(<PassportError error={error} reset={() => {}} />);

    const link = screen.getByText('create_your_passport').closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders with real EN translations when useLanguage returns actual values', () => {
    const { useLanguage } = jest.requireMock('@/app/context/language-context');
    (useLanguage as jest.Mock).mockReturnValueOnce({
      language: 'en',
      setLanguage: jest.fn(),
      t: (key: string) => {
        const { translations } = jest.requireActual('@/app/context/language-context') as any;
        return translations.en[key] || key;
      },
    });

    const error = new Error('');
    render(<PassportError error={error} reset={() => {}} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('TRY AGAIN')).toBeInTheDocument();
    expect(screen.getByText('CREATE YOUR PASSPORT')).toBeInTheDocument();
    expect(screen.getByText('Failed to load passport')).toBeInTheDocument();
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

    const error = new Error('');
    render(<PassportError error={error} reset={() => {}} />);

    expect(screen.getByText('حدث خطأ ما')).toBeInTheDocument();
    expect(screen.getByText('حاول مرة أخرى')).toBeInTheDocument();
  });
});
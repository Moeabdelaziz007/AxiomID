/**
 * Tests for src/app/context/language-context.tsx
 *
 * PR changes: Added new translation keys to both EN and AR dictionaries:
 *   - passport_not_found_description
 *   - something_went_wrong
 *   - try_again
 */

// Import the real module (not the mock from jest.setup.js)
jest.unmock('@/app/context/language-context');

import { translations } from '@/app/context/language-context';

describe('translations — new keys added in this PR', () => {
  describe('English (en)', () => {
    it('has passport_not_found_description key', () => {
      expect(translations.en.passport_not_found_description).toBeDefined();
      expect(typeof translations.en.passport_not_found_description).toBe('string');
      expect(translations.en.passport_not_found_description.length).toBeGreaterThan(0);
    });

    it('passport_not_found_description has correct English value', () => {
      expect(translations.en.passport_not_found_description).toBe(
        "This passport doesn't exist or has been removed."
      );
    });

    it('has something_went_wrong key', () => {
      expect(translations.en.something_went_wrong).toBeDefined();
      expect(typeof translations.en.something_went_wrong).toBe('string');
    });

    it('something_went_wrong has correct English value', () => {
      expect(translations.en.something_went_wrong).toBe('Something went wrong');
    });

    it('has try_again key', () => {
      expect(translations.en.try_again).toBeDefined();
      expect(typeof translations.en.try_again).toBe('string');
    });

    it('try_again has correct English value', () => {
      expect(translations.en.try_again).toBe('TRY AGAIN');
    });
  });

  describe('Arabic (ar)', () => {
    it('has passport_not_found_description key', () => {
      expect(translations.ar.passport_not_found_description).toBeDefined();
      expect(typeof translations.ar.passport_not_found_description).toBe('string');
      expect(translations.ar.passport_not_found_description.length).toBeGreaterThan(0);
    });

    it('passport_not_found_description has correct Arabic value', () => {
      expect(translations.ar.passport_not_found_description).toBe(
        'هذا الجواز غير موجود أو تمت إزالته.'
      );
    });

    it('has something_went_wrong key', () => {
      expect(translations.ar.something_went_wrong).toBeDefined();
      expect(typeof translations.ar.something_went_wrong).toBe('string');
    });

    it('something_went_wrong has correct Arabic value', () => {
      expect(translations.ar.something_went_wrong).toBe('حدث خطأ ما');
    });

    it('has try_again key', () => {
      expect(translations.ar.try_again).toBeDefined();
      expect(typeof translations.ar.try_again).toBe('string');
    });

    it('try_again has correct Arabic value', () => {
      expect(translations.ar.try_again).toBe('حاول مرة أخرى');
    });
  });

  describe('key parity — EN and AR have matching new keys', () => {
    const newKeys = ['passport_not_found_description', 'something_went_wrong', 'try_again'];

    newKeys.forEach((key) => {
      it(`both EN and AR have "${key}"`, () => {
        expect((translations.en as Record<string, string>)[key]).toBeDefined();
        expect((translations.ar as Record<string, string>)[key]).toBeDefined();
      });

      it(`EN and AR "${key}" are not identical (actually translated)`, () => {
        const en = (translations.en as Record<string, string>)[key];
        const ar = (translations.ar as Record<string, string>)[key];
        expect(en).not.toBe(ar);
      });
    });
  });

  describe('regression — pre-existing keys still present', () => {
    it('passport_not_found still exists in EN', () => {
      expect(translations.en.passport_not_found).toBe('Passport Not Found');
    });

    it('passport_load_error still exists in EN', () => {
      expect(translations.en.passport_load_error).toBe('Failed to load passport');
    });

    it('create_your_passport still exists in EN', () => {
      expect(translations.en.create_your_passport).toBe('CREATE YOUR PASSPORT');
    });

    it('passport_not_found still exists in AR', () => {
      expect(translations.ar.passport_not_found).toBe('جواز السفر غير موجود');
    });
  });
});
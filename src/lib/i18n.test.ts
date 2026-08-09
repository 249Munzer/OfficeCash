import { describe, it, expect } from 'vitest';
import {
  translations,
  getTranslation,
  makeT,
  validationMessage,
} from './i18n';
import type { TranslationKey } from './i18n';
import type { ValidationErrorCode } from './validation';

describe('i18n', () => {
  it('provides translations for both Arabic and English', () => {
    expect(Object.keys(translations)).toEqual(['ar', 'en']);
  });

  it('has matching key sets for ar and en', () => {
    const arKeys = Object.keys(translations.ar).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(arKeys).toEqual(enKeys);
  });

  it('getTranslation returns Arabic by default', () => {
    expect(getTranslation(undefined, 'appName').length).toBeGreaterThan(0);
  });

  it('getTranslation interpolates variables', () => {
    const out = getTranslation('en', 'welcomeBack', { name: 'Ali' });
    expect(out).toContain('Ali');
  });

  it('makeT returns a typed translation function', () => {
    const t = makeT('ar');
    expect(typeof t('appName')).toBe('string');
    const tEn = makeT('en');
    expect(tEn('appName').length).toBeGreaterThan(0);
  });

  it('validationMessage returns null when there is no code', () => {
    expect(validationMessage(null, makeT('ar'))).toBeNull();
    expect(validationMessage(undefined, makeT('ar'))).toBeNull();
  });

  const codes: ValidationErrorCode[] = [
    'required',
    'tooShort',
    'tooLong',
    'nan',
    'zeroOrNegative',
    'tooLarge',
    'digitsOnly',
    'weak',
    'usernameFormat',
    'phone',
    'date',
    'future',
  ];

  it.each(codes)('validationMessage translates code %s in both languages', (code) => {
    const ar = validationMessage(code, makeT('ar'));
    const en = validationMessage(code, makeT('en'));
    expect(ar).toBeTruthy();
    expect(en).toBeTruthy();
    expect(typeof ar).toBe('string');
  });

  it('every translation key resolves to a non-empty string', () => {
    const keys = Object.keys(translations.ar) as TranslationKey[];
    for (const key of keys) {
      expect(getTranslation('ar', key)).not.toBe('');
    }
  });
});


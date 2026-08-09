import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validatePin,
  validateName,
  validateUsername,
  validateStatement,
  validatePhone,
  validateDate,
  validateOfficeName,
  validateLicenseNumber,
  getPinStrength,
} from './validation';

describe('validation', () => {
  describe('validateAmount', () => {
    it('accepts a positive number', () => {
      expect(validateAmount(50)).toEqual({ isValid: true });
    });

    it('accepts a numeric string', () => {
      expect(validateAmount('12.5')).toEqual({ isValid: true });
    });

    it('rejects NaN', () => {
      expect(validateAmount('abc')).toEqual({ isValid: false, code: 'nan' });
    });

    it('rejects zero and negative values', () => {
      expect(validateAmount(0).code).toBe('zeroOrNegative');
      expect(validateAmount(-5).code).toBe('zeroOrNegative');
    });

    it('rejects overly large values', () => {
      expect(validateAmount(2_000_000).code).toBe('tooLarge');
    });
  });

  describe('validatePin', () => {
    it('accepts a strong 4-digit pin', () => {
      expect(validatePin('4521')).toEqual({ isValid: true });
    });

    it('rejects empty pin', () => {
      expect(validatePin('').code).toBe('required');
    });

    it('rejects too short / too long pins', () => {
      expect(validatePin('12').code).toBe('tooShort');
      expect(validatePin('1234567').code).toBe('tooLong');
    });

    it('rejects non-digit pins', () => {
      expect(validatePin('12ab').code).toBe('digitsOnly');
    });

    it('rejects weak common pins', () => {
      expect(validatePin('1234').code).toBe('weak');
      expect(validatePin('0000').code).toBe('weak');
    });
  });

  describe('validateName', () => {
    it('accepts a valid name', () => {
      expect(validateName('أحمد')).toEqual({ isValid: true });
    });

    it('rejects empty / whitespace-only names', () => {
      expect(validateName('   ').code).toBe('required');
      expect(validateName('').code).toBe('required');
    });

    it('rejects names shorter than 2 chars', () => {
      expect(validateName('أ').code).toBe('tooShort');
    });

    it('rejects names longer than 50 chars', () => {
      expect(validateName('أ'.repeat(51)).code).toBe('tooLong');
    });
  });

  describe('validateUsername', () => {
    it('accepts alphanumeric underscore usernames', () => {
      expect(validateUsername('ahmad_01')).toEqual({ isValid: true });
    });

    it('rejects empty usernames', () => {
      expect(validateUsername('').code).toBe('required');
    });

    it('rejects invalid characters', () => {
      expect(validateUsername('ah med').code).toBe('usernameFormat');
    });

    it('enforces length bounds', () => {
      expect(validateUsername('ab').code).toBe('tooShort');
      expect(validateUsername('a'.repeat(21)).code).toBe('tooLong');
    });
  });

  describe('validateStatement', () => {
    it('accepts a statement', () => {
      expect(validateStatement('خدمة تقنية')).toEqual({ isValid: true });
    });

    it('rejects an empty statement', () => {
      expect(validateStatement('  ').code).toBe('required');
    });

    it('rejects an overly long statement', () => {
      expect(validateStatement('x'.repeat(201)).code).toBe('tooLong');
    });
  });

  describe('validatePhone', () => {
    it('accepts empty phone as optional', () => {
      expect(validatePhone('')).toEqual({ isValid: true });
    });

    it('accepts a Saudi-style mobile number', () => {
      expect(validatePhone('0501234567')).toEqual({ isValid: true });
      expect(validatePhone('+966501234567')).toEqual({ isValid: true });
    });

    it('accepts digits with separators', () => {
      expect(validatePhone('05 0123 4567')).toEqual({ isValid: true });
    });

    it('rejects invalid phone numbers', () => {
      expect(validatePhone('123').code).toBe('phone');
      expect(validatePhone('abc1234567').code).toBe('phone');
    });
  });

  describe('validateDate', () => {
    it('accepts a valid date', () => {
      expect(validateDate('2026-01-01')).toEqual({ isValid: true });
    });

    it('rejects an empty date', () => {
      expect(validateDate('').code).toBe('required');
    });

    it('rejects an invalid date string', () => {
      expect(validateDate('not-a-date').code).toBe('date');
    });

    it('rejects a date more than a year in the future', () => {
      const far = new Date();
      far.setFullYear(far.getFullYear() + 2);
      const iso = far.toISOString().slice(0, 10);
      expect(validateDate(iso).code).toBe('future');
    });
  });

  describe('validateOfficeName', () => {
    it('accepts a valid office name', () => {
      expect(validateOfficeName('مكتب الأمل')).toEqual({ isValid: true });
    });

    it('rejects empty / short / long names', () => {
      expect(validateOfficeName('').code).toBe('required');
      expect(validateOfficeName('ab').code).toBe('tooShort');
      expect(validateOfficeName('x'.repeat(101)).code).toBe('tooLong');
    });
  });

  describe('validateLicenseNumber', () => {
    it('accepts a valid license', () => {
      expect(validateLicenseNumber('12345678')).toEqual({ isValid: true });
    });

    it('rejects missing / short / long licenses', () => {
      expect(validateLicenseNumber('').code).toBe('required');
      expect(validateLicenseNumber('1234').code).toBe('tooShort');
      expect(validateLicenseNumber('x'.repeat(31)).code).toBe('tooLong');
    });
  });

  describe('getPinStrength', () => {
    it('classifies weak, medium and strong pins', () => {
      expect(getPinStrength('1234')).toBe('weak');
      expect(getPinStrength('1111')).toBe('weak');
      expect(getPinStrength('4521')).toBe('medium');
      expect(getPinStrength('452173')).toBe('strong');
      expect(getPinStrength('1')).toBe('weak');
    });
  });
});

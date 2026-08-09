import { describe, it, expect } from 'vitest';
import {
  isValidSetupPin,
  validateOfficeRegistration,
  PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
  OfficeRegistrationInput,
} from './registration';

const validOffice: OfficeRegistrationInput = {
  officeName: 'مكتب الأمل',
  licenseNumber: '12345678',
  phone: '0501234567',
  address: 'الرياض',
  currency: 'ر.س',
  taxNumber: '',
  adminPin: '4521',
  adminPinConfirm: '4521',
  securityQuestions: [
    { questionId: 'sq_01', answer: 'جدة' },
    { questionId: 'sq_02', answer: 'ريال' },
  ],
  acceptedTerms: true,
};

describe('registration', () => {
  it('isValidSetupPin accepts a strong numeric PIN', () => {
    expect(isValidSetupPin('4521')).toBe(true);
  });

  it('isValidSetupPin rejects non-digit pins', () => {
    expect(isValidSetupPin('12ab')).toBe(false);
  });

  it('isValidSetupPin rejects pins outside min/max length', () => {
    expect(isValidSetupPin('12')).toBe(false);
    expect(isValidSetupPin('123456789')).toBe(false);
    expect(PIN_MIN_LENGTH).toBe(4);
    expect(PIN_MAX_LENGTH).toBe(8);
  });

  it('isValidSetupPin rejects repeated-digit pins', () => {
    expect(isValidSetupPin('1111')).toBe(false);
    expect(isValidSetupPin('7777')).toBe(false);
  });

  it('isValidSetupPin rejects sequential ascending/descending pins', () => {
    expect(isValidSetupPin('1234')).toBe(false);
    expect(isValidSetupPin('8765')).toBe(false);
  });

  it('validateOfficeRegistration returns ok for a valid office', () => {
    const result = validateOfficeRegistration(validOffice);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('requires an office name and flags short names', () => {
    const missing = validateOfficeRegistration({ ...validOffice, officeName: '  ' });
    expect(missing.errors.officeName).toBe('required');

    const short = validateOfficeRegistration({ ...validOffice, officeName: 'ab' });
    expect(short.errors.officeName).toBe('short');
  });

  it('validates the license number format when provided', () => {
    const bad = validateOfficeRegistration({ ...validOffice, licenseNumber: '12' });
    expect(bad.errors.licenseNumber).toBe('format');
  });

  it('allows an empty license number', () => {
    const result = validateOfficeRegistration({ ...validOffice, licenseNumber: '' });
    expect(result.ok).toBe(true);
  });

  it('flags weak or missing admin pins', () => {
    const missing = validateOfficeRegistration({ ...validOffice, adminPin: '' });
    expect(missing.errors.adminPin).toBe('required');

    const weak = validateOfficeRegistration({ ...validOffice, adminPin: '1234' });
    expect(weak.errors.adminPin).toBe('weak');
  });

  it('flags a pin/confirm mismatch', () => {
    const result = validateOfficeRegistration({ ...validOffice, adminPinConfirm: '9999' });
    expect(result.errors.adminPinConfirm).toBe('mismatch');
  });

  it('requires a currency', () => {
    const result = validateOfficeRegistration({ ...validOffice, currency: ' ' });
    expect(result.errors.currency).toBe('required');
  });

  it('rejects an invalid phone number and accepts an empty one', () => {
    const bad = validateOfficeRegistration({ ...validOffice, phone: 'abc' });
    expect(bad.errors.phone).toBe('format');

    const empty = validateOfficeRegistration({ ...validOffice, phone: '' });
    expect(empty.errors.phone).toBeUndefined();
  });

  it('requires at least two security questions', () => {
    const one = validateOfficeRegistration({
      ...validOffice,
      securityQuestions: [{ questionId: 'sq_01', answer: 'جدة' }],
    });
    expect(one.errors.securityQuestions).toBe('required');

    const none = validateOfficeRegistration({ ...validOffice, securityQuestions: [] });
    expect(none.errors.securityQuestions).toBe('required');
  });

  it('rejects duplicate security questions', () => {
    const result = validateOfficeRegistration({
      ...validOffice,
      securityQuestions: [
        { questionId: 'sq_01', answer: 'جدة' },
        { questionId: 'sq_01', answer: 'الرياض' },
      ],
    });
    expect(result.errors['securityQuestions.question.1.questionId']).toBe('taken');
  });

  it('rejects empty security answers', () => {
    const result = validateOfficeRegistration({
      ...validOffice,
      securityQuestions: [
        { questionId: 'sq_01', answer: '  ' },
        { questionId: 'sq_02', answer: 'ريال' },
      ],
    });
    expect(result.errors['securityQuestions.question.0.answer']).toBe('required');
  });

  it('requires acceptance of the legal terms', () => {
    const result = validateOfficeRegistration({ ...validOffice, acceptedTerms: false });
    expect(result.errors.acceptedTerms).toBe('required');
  });

  it('returns ok=false when any error exists', () => {
    const result = validateOfficeRegistration({ ...validOffice, licenseNumber: 'x' });
    expect(result.ok).toBe(false);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * منطق تسجيل مكتب جديد: الأنواع + التحقق الكامل
 * التحقق يتم قبل أي مسح للبيانات، ويعيد رموز أخطاء تترجمها الواجهة عبر i18n.
 *
 * ملاحظة: لم يعد التسجيل يتضمن حسابات موظفين أولية — يُعبَّأ كامل بيانات المكتب
 * (اسم، ترخيص، هاتف، عنوان، عملة، رقم ضريبي) مع رمز المدير وسؤالَي أمان كحد أدنى
 * من أصل 10، واشتراط الموافقة على السياسة والخصوصية وشروط الخدمة.
 * @module lib/auth/registration
 */

import { validatePhone } from '../validation';
import { validateSecurityQuestionSet } from './securityQuestions';

export interface SecurityQuestionSetupInput {
  questionId: string;
  answer: string;
}

export interface OfficeRegistrationInput {
  officeName: string;
  licenseNumber: string;
  phone: string;
  address: string;
  currency: string;
  taxNumber: string;
  adminPin: string;
  adminPinConfirm: string;
  securityQuestions: SecurityQuestionSetupInput[];
  acceptedTerms: boolean;
}

export type RegistrationErrorCode =
  | 'required'
  | 'short'
  | 'invalid'
  | 'weak'
  | 'mismatch'
  | 'taken'
  | 'format';

export type RegistrationErrors = Record<string, RegistrationErrorCode>;

export interface RegistrationValidation {
  ok: boolean;
  errors: RegistrationErrors;
}

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;
const LICENSE_RE = /^\d{8,12}$/;
const PIN_DIGITS_RE = /^\d+$/;

export function isValidSetupPin(pin: string): boolean {
  if (!PIN_DIGITS_RE.test(pin)) return false;
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) return false;
  const allSame = /^(\d)\1+$/.test(pin);
  const sequential =
    '0123456789'.includes(pin) || '9876543210'.includes(pin);
  return !allSame && !sequential;
}

export function validateOfficeRegistration(data: OfficeRegistrationInput): RegistrationValidation {
  const errors: RegistrationErrors = {};

  const officeName = data.officeName.trim();
  if (!officeName) {
    errors.officeName = 'required';
  } else if (officeName.length < 3) {
    errors.officeName = 'short';
  } else if (officeName.length > 100) {
    errors.officeName = 'invalid';
  }

  const license = data.licenseNumber.trim();
  if (license && !LICENSE_RE.test(license)) {
    errors.licenseNumber = 'format';
  }

  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = 'format';
  }

  if (!data.currency.trim()) {
    errors.currency = 'required';
  }

  if (!data.adminPin) {
    errors.adminPin = 'required';
  } else if (!isValidSetupPin(data.adminPin)) {
    errors.adminPin = 'weak';
  }
  if (data.adminPin !== data.adminPinConfirm) {
    errors.adminPinConfirm = 'mismatch';
  }

  const questionErrors = validateSecurityQuestionSet(data.securityQuestions);
  if (questionErrors.count === 'min') {
    errors.securityQuestions = 'required';
  } else {
    for (const [key, code] of Object.entries(questionErrors)) {
      errors[`securityQuestions.${key}`] = code as RegistrationErrorCode;
    }
  }

  if (!data.acceptedTerms) {
    errors.acceptedTerms = 'required';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

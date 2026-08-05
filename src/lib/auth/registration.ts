/**
 * منطق تسجيل مكتب جديد: الأنواع + التحقق الكامل
 * التحقق يتم قبل أي مسح للبيانات، ويعيد رموز أخطاء تترجمها الواجهة عبر i18n.
 */

export interface EmployeeSetupInput {
  name: string;
  username: string;
  pin: string;
}

export interface OfficeRegistrationInput {
  officeName: string;
  licenseNumber: string;
  adminPin: string;
  adminPinConfirm: string;
  employees: EmployeeSetupInput[];
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

  if (!data.adminPin) {
    errors.adminPin = 'required';
  } else if (!isValidSetupPin(data.adminPin)) {
    errors.adminPin = 'weak';
  }
  if (data.adminPin !== data.adminPinConfirm) {
    errors.adminPinConfirm = 'mismatch';
  }

  const seen = new Set<string>();
  data.employees.forEach((emp, index) => {
    const prefix = `employee.${index}`;
    if (!emp.name.trim()) {
      errors[`${prefix}.name`] = 'required';
    }
    const username = emp.username.trim();
    if (!username) {
      errors[`${prefix}.username`] = 'required';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      errors[`${prefix}.username`] = 'invalid';
    } else if (seen.has(username)) {
      errors[`${prefix}.username`] = 'taken';
    }
    if (username) {
      seen.add(username);
    }
    if (!emp.pin) {
      errors[`${prefix}.pin`] = 'required';
    } else if (!isValidSetupPin(emp.pin)) {
      errors[`${prefix}.pin`] = 'weak';
    }
  });

  return { ok: Object.keys(errors).length === 0, errors };
}

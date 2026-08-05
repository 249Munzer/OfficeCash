/**
 * Validation Utilities
 * أدوات التحقق من المدخلات لضمان سلامة البيانات
 *
 * كل دالة تحقق تعيد رمز خطأ (code) تُترجمه الواجهة عبر i18n
 * لضمان رسائل موحّدة بالعربية والإنجليزية (نمط registration.ts).
 */

export type ValidationErrorCode =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'nan'
  | 'zeroOrNegative'
  | 'tooLarge'
  | 'digitsOnly'
  | 'weak'
  | 'usernameFormat'
  | 'phone'
  | 'date'
  | 'future';

export interface ValidationResult {
  isValid: boolean;
  code?: ValidationErrorCode;
}

/**
 * التحقق من المبلغ (يجب أن يكون رقماً موجباً أكبر من صفر)
 */
export function validateAmount(amount: number | string): ValidationResult {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return { isValid: false, code: 'nan' };
  }

  if (num <= 0) {
    return { isValid: false, code: 'zeroOrNegative' };
  }

  if (num > 1000000) {
    return { isValid: false, code: 'tooLarge' };
  }

  return { isValid: true };
}

/**
 * التحقق من PIN (4-6 أرقام)
 */
export function validatePin(pin: string): ValidationResult {
  if (!pin) {
    return { isValid: false, code: 'required' };
  }

  if (pin.length < 4) {
    return { isValid: false, code: 'tooShort' };
  }

  if (pin.length > 6) {
    return { isValid: false, code: 'tooLong' };
  }

  if (!/^\d+$/.test(pin)) {
    return { isValid: false, code: 'digitsOnly' };
  }

  // منع PINs ضعيفة
  const weakPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  if (weakPins.includes(pin)) {
    return { isValid: false, code: 'weak' };
  }

  return { isValid: true };
}

/**
 * التحقق من الاسم (غير فارغ، طول معقول)
 */
export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, code: 'required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, code: 'tooShort' };
  }

  if (name.length > 50) {
    return { isValid: false, code: 'tooLong' };
  }

  return { isValid: true };
}

/**
 * التحقق من اسم المستخدم
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || !username.trim()) {
    return { isValid: false, code: 'required' };
  }

  if (username.length < 3) {
    return { isValid: false, code: 'tooShort' };
  }

  if (username.length > 20) {
    return { isValid: false, code: 'tooLong' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, code: 'usernameFormat' };
  }

  return { isValid: true };
}

/**
 * التحقق من البيان/الوصف
 */
export function validateStatement(statement: string): ValidationResult {
  if (!statement || !statement.trim()) {
    return { isValid: false, code: 'required' };
  }

  if (statement.length > 200) {
    return { isValid: false, code: 'tooLong' };
  }

  return { isValid: true };
}

/**
 * التحقق من رقم الهاتف
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: true }; // الهاتف اختياري
  }

  // إزالة المسافات والشرطات
  const cleaned = phone.replace(/[\s-]/g, '');

  // أرقام هاتف: 05XXXXXXXX أو 5XXXXXXXX أو +9665XXXXXXXX أو أرقام عامة من 9-15 رقماً
  const phoneRegex = /^(\+?\d{9,15})$/;
  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, code: 'phone' };
  }

  return { isValid: true };
}

/**
 * التحقق من التاريخ
 */
export function validateDate(date: string): ValidationResult {
  if (!date) {
    return { isValid: false, code: 'required' };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, code: 'date' };
  }

  // التاريخ لا يجب أن يكون في المستقبل البعيد
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (dateObj > maxDate) {
    return { isValid: false, code: 'future' };
  }

  return { isValid: true };
}

/**
 * التحقق من اسم المكتب
 */
export function validateOfficeName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, code: 'required' };
  }

  if (name.trim().length < 3) {
    return { isValid: false, code: 'tooShort' };
  }

  if (name.length > 100) {
    return { isValid: false, code: 'tooLong' };
  }

  return { isValid: true };
}

/**
 * التحقق من رقم الرخصة
 */
export function validateLicenseNumber(license: string): ValidationResult {
  if (!license || !license.trim()) {
    return { isValid: false, code: 'required' };
  }

  if (license.length < 5) {
    return { isValid: false, code: 'tooShort' };
  }

  if (license.length > 30) {
    return { isValid: false, code: 'tooLong' };
  }

  return { isValid: true };
}

/**
 * التحقق من قوة كلمة المرور / PIN
 */
export function getPinStrength(pin: string): 'weak' | 'medium' | 'strong' {
  if (pin.length < 4) return 'weak';

  // فحص الأنماط الضعيفة
  const allSame = /^(\d)\1+$/.test(pin);
  const sequential = '0123456789'.includes(pin) || '9876543210'.includes(pin);

  if (allSame || sequential) return 'weak';

  if (pin.length >= 6) return 'strong';
  if (pin.length >= 4) return 'medium';

  return 'weak';
}

/**
 * Validation Utilities
 * أدوات التحقق من المدخلات لضمان سلامة البيانات
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * التحقق من المبلغ (يجب أن يكون رقم موجب)
 */
export function validateAmount(amount: number | string): ValidationResult {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return { isValid: false, error: 'المبلغ يجب أن يكون رقماً صحيحاً' };
  }

  if (num < 0) {
    return { isValid: false, error: 'المبلغ لا يمكن أن يكون سالباً' };
  }

  if (num > 1000000) {
    return { isValid: false, error: 'المبلغ كبير جداً (الحد الأقصى: 1,000,000)' };
  }

  return { isValid: true };
}

/**
 * التحقق من PIN (4-6 أرقام)
 */
export function validatePin(pin: string): ValidationResult {
  if (!pin) {
    return { isValid: false, error: 'PIN مطلوب' };
  }

  if (pin.length < 4) {
    return { isValid: false, error: 'PIN يجب أن يكون 4 أرقام على الأقل' };
  }

  if (pin.length > 6) {
    return { isValid: false, error: 'PIN يجب أن يكون 6 أرقام على الأكثر' };
  }

  if (!/^\d+$/.test(pin)) {
    return { isValid: false, error: 'PIN يجب أن يحتوي على أرقام فقط' };
  }

  // منع PINs ضعيفة
  const weakPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  if (weakPins.includes(pin)) {
    return { isValid: false, error: 'هذا PIN ضعيف جداً، يرجى اختيار PIN أكثر أماناً' };
  }

  return { isValid: true };
}

/**
 * التحقق من الاسم (غير فارغ، طول معقول)
 */
export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'الاسم مطلوب' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'الاسم قصير جداً' };
  }

  if (name.length > 50) {
    return { isValid: false, error: 'الاسم طويل جداً (الحد الأقصى: 50 حرف)' };
  }

  return { isValid: true };
}

/**
 * التحقق من اسم المستخدم
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || !username.trim()) {
    return { isValid: false, error: 'اسم المستخدم مطلوب' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' };
  }

  if (username.length > 20) {
    return { isValid: false, error: 'اسم المستخدم طويل جداً (الحد الأقصى: 20 حرف)' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط' };
  }

  return { isValid: true };
}

/**
 * التحقق من البيان/الوصف
 */
export function validateStatement(statement: string): ValidationResult {
  if (!statement || !statement.trim()) {
    return { isValid: false, error: 'البيان مطلوب' };
  }

  if (statement.length > 200) {
    return { isValid: false, error: 'البيان طويل جداً (الحد الأقصى: 200 حرف)' };
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

  // أرقام هاتف سعودية: 05XXXXXXXX أو 5XXXXXXXX أو +9665XXXXXXXX
  const phoneRegex = /^(\+966|0)?5\d{8}$/;
  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, error: 'رقم الهاتف غير صحيح (مثال: 0512345678)' };
  }

  return { isValid: true };
}

/**
 * التحقق من التاريخ
 */
export function validateDate(date: string): ValidationResult {
  if (!date) {
    return { isValid: false, error: 'التاريخ مطلوب' };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'التاريخ غير صحيح' };
  }

  // التاريخ لا يجب أن يكون في المستقبل البعيد
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (dateObj > maxDate) {
    return { isValid: false, error: 'التاريخ في المستقبل البعيد' };
  }

  return { isValid: true };
}

/**
 * التحقق من اسم المكتب
 */
export function validateOfficeName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'اسم المكتب مطلوب' };
  }

  if (name.trim().length < 3) {
    return { isValid: false, error: 'اسم المكتب قصير جداً' };
  }

  if (name.length > 100) {
    return { isValid: false, error: 'اسم المكتب طويل جداً (الحد الأقصى: 100 حرف)' };
  }

  return { isValid: true };
}

/**
 * التحقق من رقم الرخصة
 */
export function validateLicenseNumber(license: string): ValidationResult {
  if (!license || !license.trim()) {
    return { isValid: false, error: 'رقم الرخصة مطلوب' };
  }

  if (license.length < 5) {
    return { isValid: false, error: 'رقم الرخصة قصير جداً' };
  }

  if (license.length > 30) {
    return { isValid: false, error: 'رقم الرخصة طويل جداً' };
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
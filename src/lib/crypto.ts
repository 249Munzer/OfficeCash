/**
 * Crypto Utility - تشفير PINs باستخدام Web Crypto API
 * يستخدم SHA-256 مع salt لتشفير PINs بشكل آمن
 */

// Salt ثابت للتطبيق (في الإنتاج، يجب أن يكون لكل مستخدم salt فريد)
const APP_SALT = 'OfficeCash-2026-Secure-Salt-v1';

/**
 * تشفير PIN باستخدام SHA-256 مع salt
 * @param pin - PIN النصي (مثل "1234")
 * @returns PIN مشفر (hash hex string)
 */
export async function hashPin(pin: string): Promise<string> {
  try {
    // استخدام Web Crypto API إذا كانت متوفرة (في Electron والمتصفح الحديث)
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + APP_SALT);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (error) {
    console.error('Web Crypto API failed, falling back:', error);
  }

  // Fallback: استخدام Node.js crypto (في Electron main process)
  if (typeof window === 'undefined' && typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(pin + APP_SALT).digest('hex');
    } catch (error) {
      console.error('Node crypto failed:', error);
    }
  }

  // Fallback أخير: hash بسيط (غير آمن لكن يمنع النص الواضح)
  return simpleHash(pin + APP_SALT);
}

/**
 * التحقق إذا كان الـ hash يحتاج ترقية (PIN نصي واضح)
 * @param storedValue - القيمة المخزنة (hash أو PIN نصي)
 * @returns true إذا كان PIN نصي واضح يحتاج تشفير
 */
export function isPlainPin(storedValue: string): boolean {
  // الـ hash الناتج من SHA-256 يكون 64 حرف hex
  // PIN النصي يكون عادة 4-6 أرقام
  return storedValue.length < 20;
}

/**
 * Hash بسيط كـ fallback (غير آمن للأمان القوي)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // تحويل إلى hex string مع padding
  return Math.abs(hash).toString(16).padStart(8, '0') + 'fallback';
}
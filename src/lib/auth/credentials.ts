/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * نظام توثيق موحد للأرقام السرية (PIN / Passphrase)
 *
 * الصيغ المدعومة في التخزين:
 *   1) نص صريح (قديم):            "1234"
 *   2) Hash قديم (متوافق):        64 حرف hex = SHA-256(input + APP_SALT)
 *   3) صيغة جديدة (مفضلة):        "sha256$<saltHex>$<hashHex>"  حيث hash = SHA-256(saltHex + input)
 *
 * سياسة الترقية:
 *   عند نجاح التحقق بصيغة قديمة تعيد الدالة upgradable=true
 *   ليتمكن المتصل من حفظ hashCredential(input) الجديد فوراً في التخزين.
 * @module lib/auth/credentials
 */

const PREFIX = 'sha256';
const LEGACY_APP_SALT = 'OfficeCash-2026-Secure-Salt-v1';
const HEX64_RE = /^[0-9a-f]{64}$/;
const SALT_BYTES = 16;

export interface CredentialVerification {
  valid: boolean;
  upgradable: boolean;
}

export function isNewFormat(stored: string): boolean {
  return stored.startsWith(`${PREFIX}$`);
}

export async function sha256Hex(data: string): Promise<string> {
  const subtle = typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined;
  if (subtle) {
    const buffer = await subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const req = (
    globalThis as {
      require?: (m: string) => {
        createHash: (a: string) => {
          update: (d: string) => { digest: (e: 'hex') => string };
        };
      };
    }
  ).require;
  if (req) {
    return req('crypto').createHash('sha256').update(data).digest('hex');
  }
  throw new Error('sha256Hex: no crypto provider available');
}

function randomSaltHex(): string {
  const bytes = new Uint8Array(SALT_BYTES);
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashCredential(input: string): Promise<string> {
  const salt = randomSaltHex();
  const hash = await sha256Hex(salt + input);
  return `${PREFIX}$${salt}$${hash}`;
}

export async function verifyCredential(
  stored: string | null | undefined,
  input: string
): Promise<CredentialVerification> {
  if (!stored) return { valid: false, upgradable: false };
  if (isNewFormat(stored)) {
    const [prefix, salt, hash] = stored.split('$');
    if (prefix !== PREFIX || !salt || !hash) return { valid: false, upgradable: false };
    const computed = await sha256Hex(salt + input);
    return { valid: computed === hash, upgradable: false };
  }
  if (HEX64_RE.test(stored)) {
    const computed = await sha256Hex(input + LEGACY_APP_SALT);
    return { valid: computed === stored, upgradable: true };
  }
  return { valid: stored === input, upgradable: true };
}

export function isUpgradable(stored: string | null | undefined): boolean {
  if (!stored) return false;
  return !isNewFormat(stored);
}

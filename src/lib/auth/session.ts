/**
 * إدارة دورة حياة جلسة المصادقة (Auth Session)
 * - إنشاء الجلسة مع وقت الدخول.
 * - انتهاء الصلاحية محسوب من loginTime + مهلة حسب الدور (متوافق مع الجلسات المخزنة قديماً بلا حقول إضافية).
 * - التحقق الكامل من الصحة: وجود الجلسة + تطابق المكتب + عدم الانتهاء.
 */

import { AuthSession, OfficeSettings } from '../../types';

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة للمدير
export const EMPLOYEE_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 ساعة للموظف

export type SessionValidation =
  | { valid: true }
  | { valid: false; reason: 'no-session' | 'office-mismatch' | 'expired' };

export interface CreateSessionInput {
  role: AuthSession['role'];
  officeName: string;
  employeeId?: string;
  employeeName?: string;
}

export function createSession(input: CreateSessionInput): AuthSession {
  return {
    role: input.role,
    officeName: input.officeName,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    loginTime: new Date().toISOString(),
  };
}

export function getSessionExpiryMs(session: AuthSession): number {
  const ttl = session.role === 'admin' ? ADMIN_SESSION_TTL_MS : EMPLOYEE_SESSION_TTL_MS;
  return new Date(session.loginTime).getTime() + ttl;
}

export function isSessionExpired(session: AuthSession, now: number = Date.now()): boolean {
  return now > getSessionExpiryMs(session);
}

export function validateSession(
  session: AuthSession | null | undefined,
  settings: OfficeSettings | null | undefined
): SessionValidation {
  if (!session) return { valid: false, reason: 'no-session' };
  if (!settings?.officeName || session.officeName !== settings.officeName) {
    return { valid: false, reason: 'office-mismatch' };
  }
  if (isSessionExpired(session)) return { valid: false, reason: 'expired' };
  return { valid: true };
}

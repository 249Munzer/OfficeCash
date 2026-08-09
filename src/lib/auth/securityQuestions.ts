/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * أسئلة الأمان — قائمة ثابتة من 10 أسئلة (عربي/إنجليزي) تُستخدم في:
 * 1) تسجيل مكتب جديد: اختيار سؤالين كحد أدنى من الأسئلة العشرة.
 * 2) استرداد كلمة مرور المدير: التحقق من الإجابات المحفوظة (مشفّرة).
 *
 * الإجابات تُطبع (trim + lowercase) ثم تُخزَّن كـ `sha256$salt$hash` عبر
 * دالتي `hashCredential`/`verifyCredential` من `lib/auth/credentials`.
 * @module lib/auth/securityQuestions
 */

import { hashCredential, verifyCredential } from './credentials';

export interface SecurityQuestion {
  id: string;
  ar: string;
  en: string;
}

export const SECURITY_QUESTIONS: readonly SecurityQuestion[] = [
  { id: 'sq_01', ar: 'ما اسم أول معلم لديك؟', en: 'What is the name of your first teacher?' },
  { id: 'sq_02', ar: 'ما اسم مدينتك المفضلة؟', en: 'What is the name of your favorite city?' },
  { id: 'sq_03', ar: 'ما اسم حيوانك الأليف الأول؟', en: 'What is the name of your first pet?' },
  { id: 'sq_04', ar: 'ما اسم أقرب صديق لك في الطفولة؟', en: 'What is the name of your closest childhood friend?' },
  { id: 'sq_05', ar: 'ما اسم والدتك قبل الزواج؟', en: 'What is your mother\u2019s maiden name?' },
  { id: 'sq_06', ar: 'ما اسم مدرستك الابتدائية؟', en: 'What is the name of your primary school?' },
  { id: 'sq_07', ar: 'ما هو طبقك المفضل؟', en: 'What is your favorite dish?' },
  { id: 'sq_08', ar: 'ما اسم أول فيلم شاهدته؟', en: 'What is the name of the first movie you watched?' },
  { id: 'sq_09', ar: 'ما رقم منزلك في الطفولة؟', en: 'What was your childhood house number?' },
  { id: 'sq_10', ar: 'ما اسم أول مشرف لك في العمل؟', en: 'What is the name of your first supervisor at work?' },
];

export const MIN_SECURITY_QUESTIONS = 2;
export const MAX_SECURITY_QUESTIONS = 5;

export function getSecurityQuestion(id: string): SecurityQuestion | undefined {
  return SECURITY_QUESTIONS.find((q) => q.id === id);
}

/**
 * تطبيع إجابة سؤال الأمان قبل الهاش/التحقق:
 * إزالة الفراغات الزائدة من الطرفين + تحويل الأحرف إلى أحرف صغيرة.
 */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

export function isValidAnswer(answer: string): boolean {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && normalized.length <= 100;
}

/**
 * هاش إجابة سؤال أمان: تطبيع ثم `hashCredential` (sha256$salt$hash).
 */
export async function hashAnswer(answer: string): Promise<string> {
  return hashCredential(normalizeAnswer(answer));
}

/**
 * التحقق من إجابة مقارنة بالهاش المحفوظ (مع تطبيع قبل المقارنة).
 */
export async function verifyAnswer(
  storedHash: string | null | undefined,
  answer: string
): Promise<{ valid: boolean; upgradable: boolean }> {
  return verifyCredential(storedHash, normalizeAnswer(answer));
}

/**
 * تحقق من أن مجموعة الأسئلة صالحة: عدد كافٍ، أسئلة مختلفة، وإجابات غير فارغة.
 * @returns كائن أخطاء بمفاتيح `question.<index>` (حسب RegistrationErrorCode)
 */
export function validateSecurityQuestionSet(
  questions: Array<{ questionId: string; answer: string }>
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (questions.length < MIN_SECURITY_QUESTIONS) {
    errors.count = 'min';
    return errors;
  }
  const seen = new Set<string>();
  questions.forEach((q, index) => {
    const prefix = `question.${index}`;
    if (!q.questionId) {
      errors[`${prefix}.questionId`] = 'required';
    } else if (seen.has(q.questionId)) {
      errors[`${prefix}.questionId`] = 'taken';
    }
    if (q.questionId) {
      seen.add(q.questionId);
    }
    if (!isValidAnswer(q.answer)) {
      errors[`${prefix}.answer`] = 'required';
    }
  });
  return errors;
}

/**
 * إجمالي المحاولات المسموح بها قبل إغلاق نافذة الاسترداد ومهلة الانتظار بالدقائق.
 */
export const MAX_RECOVERY_ATTEMPTS = 5;
export const RECOVERY_LOCKOUT_MINUTES = 5;

export interface RecoveryAttemptState {
  attempts: number;
  lockedUntil?: number;
}

export function canAttemptRecovery(state: RecoveryAttemptState, now: number = Date.now()): boolean {
  if (!state.lockedUntil) return state.attempts < MAX_RECOVERY_ATTEMPTS;
  if (now >= state.lockedUntil) return true;
  return false;
}

export function recordFailedAttempt(
  state: RecoveryAttemptState,
  now: number = Date.now()
): RecoveryAttemptState {
  const attempts = state.attempts + 1;
  if (attempts >= MAX_RECOVERY_ATTEMPTS) {
    return { attempts, lockedUntil: now + RECOVERY_LOCKOUT_MINUTES * 60 * 1000 };
  }
  return { ...state, attempts };
}

export function resetAttemptState(): RecoveryAttemptState {
  return { attempts: 0, lockedUntil: undefined };
}

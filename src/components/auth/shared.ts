/**
 * دوال وأنواع مشتركة لشاشات المصادقة — يُعرّف نوع دالة الترجمة TFunc
 * المستخدم في نماذج الدخول والتسجيل.
 */
import type { TranslationKey } from '../../lib/i18n';

export type TFunc = (key: TranslationKey, vars?: Record<string, string | number>) => string;

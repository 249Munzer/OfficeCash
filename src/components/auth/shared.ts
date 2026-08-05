import type { TranslationKey } from '../../lib/i18n';

export type TFunc = (key: TranslationKey, vars?: Record<string, string | number>) => string;

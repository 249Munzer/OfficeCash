/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * مودال عرض الوثائق القانونية (سياسة الخصوصية / شروط الخدمة).
 * يفتح المستند المحدد في نافذة قابلة للتمرير مع عنوان وأيقونة مميزة لكل وثيقة،
 * والمحتوى مترجم بالكامل (عربي/إنجليزي) من قاموس i18n.
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - مفتوح؟
 * @param {'privacy'|'terms'} props.docType - نوع الوثيقة المعروضة
 * @param {'ar'|'en'} [props.language] - لغة الواجهة
 * @param {Function} props.onClose - إغلاق المودال
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, FileText, X, ScrollText } from 'lucide-react';
import { makeT, translations } from '../lib/i18n';

export type LegalDocType = 'privacy' | 'terms';

interface LegalSection {
  heading: string;
  body: string;
}

interface LegalModalProps {
  isOpen: boolean;
  docType: LegalDocType;
  language?: 'ar' | 'en';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  docType,
  language = 'ar',
  onClose,
}) => {
  const t = makeT(language);
  const isRtl = language !== 'en';

  const sections: LegalSection[] =
    docType === 'privacy'
      ? translations[language].privacySections
      : translations[language].termsSections;

  const title = docType === 'privacy' ? t('privacyPolicyTitle') : t('termsOfServiceTitle');
  const Icon = docType === 'privacy' ? ShieldCheck : FileText;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl shadow-black/20 border border-slate-200 dark:border-slate-700 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    {title}
                    <ScrollText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('legalUpdatedOn', { date: '2026-08-06' })}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={t('legalCloseBtn')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 flex-1">
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  className="mb-6 last:mb-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                      {section.heading}
                    </h4>
                  </div>
                  <p className="text-[13px] leading-6 text-slate-600 dark:text-slate-300 pr-2 pl-2 first:pr-0">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t('legalCloseBtn')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

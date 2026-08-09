/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * مودال تأكيد عام — يستخدم للحذف، إغلاق اليوم، استعادة نسخة احتياطية، إلخ.
 * قابل للتخصيص: عنوان، رسالة، نصوص أزرار، نوع خطر (أحمر) أو عادي، لغة AR/EN.
 * متحرك بـ Motion (AnimatePresence).
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - مفتوح؟
 * @param {string} props.title - عنوان
 * @param {string} props.message - نص الرسالة
 * @param {string} [props.confirmText] - نص زر التأكيد
 * @param {string} [props.cancelText] - نص زر الإلغاء
 * @param {boolean} [props.isDanger] - زر أحمر؟
 * @param {'ar'|'en'} [props.language] - لغة الأزرار الافتراضية
 * @param {Function} props.onConfirm - رد فعل التأكيد
 * @param {Function} props.onClose - إغلاق
 */
import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { makeT } from '../lib/i18n';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  language?: 'ar' | 'en';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = true,
  language = 'ar',
  onConfirm,
  onClose,
}) => {
  const t = makeT(language);
  const finalConfirmText = confirmText ?? t('confirmYesDelete');
  const finalCancelText = cancelText ?? t('cancel');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-6 text-center space-y-4 relative"
          >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div
          className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
            isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isDanger ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>

        {/* Content */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            {finalCancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 text-white py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-100'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-100'
            }`}
          >
            {finalConfirmText}
          </button>
        </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

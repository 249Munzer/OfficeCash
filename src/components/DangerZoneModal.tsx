/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * مودال حذف نهائي متعدد الخطوات لعمليات منطقة الخطر.
 * يمر المستخدم بثلاث خطوات قبل التنفيذ:
 *   1) تحذير من عواقب الحذف.
 *   2) تأكيد بالمطابقة: كتابة اسم المكتب حرفياً للاستمرار.
 *   3) خطوة أخيرة مع زر حذف نهائي.
 * هذا التصعيد المتدرج يحمي حقوق الشركات في السياسات والخصوصية
 * ويمنع الحذف العرضي للبيانات الحساسة.
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - مفتوح؟
 * @param {'clear-data'|'delete-office'} props.mode - نوع العملية (حذف البيانات / حذف المكتب)
 * @param {string} props.officeName - اسم المكتب المطلوب مطابقته
 * @param {'ar'|'en'} [props.language] - لغة الواجهة
 * @param {Function} props.onClose - إغلاق
 * @param {Function} props.onConfirm - تنفيذ الحذف النهائي
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Trash2, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { makeT } from '../lib/i18n';

export type DangerZoneMode = 'clear-data' | 'delete-office';

interface DangerZoneModalProps {
  isOpen: boolean;
  mode: DangerZoneMode;
  officeName: string;
  language?: 'ar' | 'en';
  onClose: () => void;
  onConfirm: () => void;
}

export const DangerZoneModal: React.FC<DangerZoneModalProps> = ({
  isOpen,
  mode,
  officeName,
  language = 'ar',
  onClose,
  onConfirm,
}) => {
  const t = makeT(language);
  const isRtl = language !== 'en';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typedName, setTypedName] = useState<string>('');
  const [confirming, setConfirming] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTypedName('');
      setConfirming(false);
    }
  }, [isOpen]);

  const isOffice = mode === 'delete-office';
  const nameMatches = typedName.trim() === officeName.trim();
  const isMismatch = typedName.trim().length > 0 && !nameMatches;

  const handleFinal = () => {
    if (confirming) return;
    setConfirming(true);
    onConfirm();
    onClose();
  };

  const ContinueIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-rose-100 p-6 space-y-4 relative"
          >
            <button
              onClick={onClose}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s ? 'w-6 bg-rose-500' : 'w-3 bg-slate-200'
                  }`}
                ></span>
              ))}
            </div>

            {/* Header Icon */}
            <div
              className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
                step === 3
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {step === 1 && (isOffice ? <ShieldAlert className="w-7 h-7" /> : <Trash2 className="w-7 h-7" />)}
              {step === 2 && <AlertTriangle className="w-7 h-7" />}
              {step === 3 && <AlertTriangle className="w-7 h-7" />}
            </div>

            {/* Step 1: Warning */}
            {step === 1 && (
              <div className="space-y-3 text-center">
                <h3 className="text-base font-bold text-slate-900">{t('dangerStepWarningTitle')}</h3>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-start">
                  <p className="text-xs text-rose-700 font-bold mb-1">
                    {isOffice ? t('dangerStepWarningOfficeTitle') : t('dangerStepWarningDataTitle')}
                  </p>
                  <p className="text-xs text-rose-600 leading-relaxed">
                    {isOffice ? t('dangerStepWarningOfficeMsg') : t('dangerStepWarningDataMsg')}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {t('dangerStepWarningIrreversible')}
                </p>
              </div>
            )}

            {/* Step 2: Type office name */}
            {step === 2 && (
              <div className="space-y-3 text-center">
                <h3 className="text-base font-bold text-slate-900">{t('dangerStepTypeTitle')}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {t('dangerStepTypeMessage', { name: officeName })}
                </p>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={t('dangerStepTypePlaceholder')}
                  autoFocus
                  autoComplete="off"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                    isMismatch
                      ? 'border-rose-400 ring-rose-200 bg-rose-50'
                      : 'border-slate-300 focus:ring-rose-300'
                  }`}
                />
                {isMismatch && (
                  <p className="text-[11px] text-rose-600 font-bold">{t('dangerStepTypeMismatch')}</p>
                )}
              </div>
            )}

            {/* Step 3: Final confirmation */}
            {step === 3 && (
              <div className="space-y-3 text-center">
                <h3 className="text-base font-bold text-slate-900">{t('dangerStepFinalTitle')}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {t('dangerStepFinalMessage')}
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">{t('officeNameLabel')}</span>
                  <span className="text-sm font-black text-slate-900 dir-ltr">{officeName}</span>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {step > 1 ? (
                <button
                  onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <BackIcon className="w-4 h-4" />
                  {t('dangerBackBtn')}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  {t('dangerCancelBtn')}
                </button>
              )}

              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-100 flex items-center justify-center gap-1"
                >
                  {t('dangerContinueBtn')}
                  <ContinueIcon className="w-4 h-4" />
                </button>
              )}

              {step === 2 && (
                <button
                  onClick={() => setStep(3)}
                  disabled={!nameMatches}
                  className="flex-[2] bg-rose-600 hover:bg-rose-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-100 flex items-center justify-center gap-1"
                >
                  {t('dangerContinueBtn')}
                  <ContinueIcon className="w-4 h-4" />
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={handleFinal}
                  disabled={confirming}
                  className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-100 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  {isOffice ? t('dangerFinalDeleteBtn') : t('dangerFinalClearBtn')}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

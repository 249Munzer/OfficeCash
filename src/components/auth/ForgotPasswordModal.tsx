/**
 * نافذة استرداد رمز المدير — ثلاث خطوات: الإجابة على أسئلة الأمان،
 * تعيين PIN جديد، وتأكيد النجاح، مع قيود على عدد المحاولات الفاشلة.
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - هل النافذة مفتوحة
 * @param {OfficeSettings} props.settings - أسئلة الأمان المحفوظة
 * @param {string} props.language - اللغة: عربي أو إنجليزي
 * @param {Function} props.onClose - إغلاق النافذة
 * @param {Function} props.onVerifyAnswers - التحقق من الإجابات
 * @param {Function} props.onResetPin - حفظ PIN الجديد
 */
import React, { useMemo, useState } from 'react';
import { KeyRound, ShieldQuestion, CheckCircle2, Lock, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OfficeSettings } from '../../types';
import { makeT } from '../../lib/i18n';
import {
  getSecurityQuestion,
  canAttemptRecovery,
  recordFailedAttempt,
  resetAttemptState,
  RecoveryAttemptState,
} from '../../lib/auth/securityQuestions';
import { isValidSetupPin } from '../../lib/auth/registration';
import { LoginErrorBox } from './LoginErrorBox';

export type ResetPinErrorCode = 'answers' | 'invalid-pin' | 'storage' | 'unavailable';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  settings: OfficeSettings;
  language: 'ar' | 'en';
  onClose: () => void;
  onVerifyAnswers: (
    answers: Array<{ questionId: string; answer: string }>
  ) => Promise<{ valid: boolean; error?: ResetPinErrorCode }>;
  onResetPin: (
    answers: Array<{ questionId: string; answer: string }>,
    newPin: string
  ) => Promise<{ ok: boolean; error?: ResetPinErrorCode }>;
}

interface QuestionRow {
  questionId: string;
  label: string;
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  settings,
  language,
  onClose,
  onVerifyAnswers,
  onResetPin,
}) => {
  const t = makeT(language);

  const savedQuestions = useMemo<QuestionRow[]>(
    () =>
      (settings.securityQuestions || [])
        .map((sq) => {
          const def = getSecurityQuestion(sq.questionId);
          return {
            questionId: sq.questionId,
            label: def ? (language === 'en' ? def.en : def.ar) : sq.questionId,
          };
        }),
    [settings.securityQuestions, language]
  );

  const [step, setStep] = useState<'questions' | 'new-pin' | 'done'>('questions');
  const [answers, setAnswers] = useState<string[]>([]);
  const [pin, setPin] = useState<string>('');
  const [pinConfirm, setPinConfirm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptState, setAttemptState] = useState<RecoveryAttemptState>(resetAttemptState());
  const [submitting, setSubmitting] = useState(false);

  const locked = !canAttemptRecovery(attemptState);
  const notConfigured = savedQuestions.length === 0;

  const resetLocal = () => {
    setStep('questions');
    setAnswers(savedQuestions.map(() => ''));
    setPin('');
    setPinConfirm('');
    setErrorMsg(null);
    setAttemptState(resetAttemptState());
    setSubmitting(false);
  };

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (locked) return;

    const cleaned = savedQuestions.map((_, i) => (answers[i] || '').trim());
    if (cleaned.some((a) => !a)) {
      setErrorMsg(t('fpAnswerRequiredError'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await onVerifyAnswers(
        savedQuestions.map((q, i) => ({ questionId: q.questionId, answer: cleaned[i] }))
      );
      if (result.valid) {
        setStep('new-pin');
      } else {
        const next = recordFailedAttempt(attemptState);
        setAttemptState(next);
        setErrorMsg(
          canAttemptRecovery(next)
            ? t('fpAnswersWrong', { attemptsLeft: Math.max(0, 5 - next.attempts) })
            : t('fpLockedDesc')
        );
      }
    } catch {
      setErrorMsg(t('fpStorageError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValidSetupPin(pin)) {
      setErrorMsg(t('fpPinWeak'));
      return;
    }
    if (pin !== pinConfirm) {
      setErrorMsg(t('fpPinMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await onResetPin(
        savedQuestions.map((q, i) => ({ questionId: q.questionId, answer: answers[i]?.trim() || '' })),
        pin
      );
      if (result.ok) {
        setStep('done');
      } else if (result.error === 'answers') {
        setStep('questions');
        setErrorMsg(t('fpAnswersWrong', { attemptsLeft: 0 }));
      } else if (result.error === 'invalid-pin') {
        setErrorMsg(t('fpPinWeak'));
      } else {
        setErrorMsg(t('fpStorageError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (locked) {
      return (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('fpLockedTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('fpLockedDesc')}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
          >
            {t('fpCloseBtn')}
          </button>
        </div>
      );
    }

    if (notConfigured) {
      return (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('fpNotConfiguredTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('fpNotConfiguredDesc')}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
          >
            {t('fpCloseBtn')}
          </button>
        </div>
      );
    }

    if (step === 'questions') {
      return (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <ShieldQuestion className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('fpTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('fpSubtitle')}</p>
          </div>

          <div className="space-y-3">
            {savedQuestions.map((q, index) => (
              <div key={q.questionId}>
                <label htmlFor={`fp-answer-${index}`} className={labelClass}>
                  {t('fpQuestionIndex', { count: index + 1 })} — {q.label}
                </label>
                <input
                  id={`fp-answer-${index}`}
                  type="text"
                  value={answers[index] || ''}
                  onChange={(e) => {
                    const next = [...answers];
                    next[index] = e.target.value;
                    setAnswers(next);
                    setErrorMsg(null);
                  }}
                  placeholder={t('fpAnswerPlaceholder')}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <LoginErrorBox message={errorMsg} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <KeyRound className="w-4 h-4" />
            <span>{t('fpVerifyBtn')}</span>
          </button>
        </form>
      );
    }

    if (step === 'new-pin') {
      return (
        <form onSubmit={handleSetPin} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 mx-auto bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <KeyRound className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('fpNewPinTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('fpNewPinSubtitle')}</p>
          </div>

          <div>
            <label htmlFor="fp-new-pin" className={labelClass}>{t('fpNewPinLabel')}</label>
            <input
              id="fp-new-pin"
              type="password"
              dir="ltr"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErrorMsg(null);
              }}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label htmlFor="fp-new-pin-confirm" className={labelClass}>{t('fpNewPinConfirmLabel')}</label>
            <input
              id="fp-new-pin-confirm"
              type="password"
              dir="ltr"
              inputMode="numeric"
              value={pinConfirm}
              onChange={(e) => {
                setPinConfirm(e.target.value);
                setErrorMsg(null);
              }}
              className={`${inputClass} font-mono`}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">{t('regPinSecurityHint')}</p>

          <LoginErrorBox message={errorMsg} />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              <span>{t('fpSubmitBtn')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('questions');
                setErrorMsg(null);
              }}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      );
    }

    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('fpSuccessTitle')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('fpSuccessDesc')}</p>
        </div>
        <button
          onClick={handleClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
        >
          {t('fpDoneBtn')}
        </button>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4 relative"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              title={t('fpCloseBtn')}
            >
              <X className="w-4 h-4" />
            </button>

            {renderBody()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * نموذج إنشاء مكتب جديد — بيانات المكتب (الاسم، الرخصة، الهاتف، العملة...)،
 * تعيين PIN المدير، إعداد أسئلة الأمان، والموافقة القانونية عبر نوافذ الخصوصية والشروط.
 * @component
 * @param {Object} props
 * @param {Function} props.onCreate - إنشاء المكتب وإرسال البيانات
 * @param {Function} props.t - دالة الترجمة
 * @param {string} props.language - اللغة: عربي أو إنجليزي (اختياري)
 */
import React, { useState } from 'react';
import { PlusCircle, ShieldQuestion, Plus, Trash2 } from 'lucide-react';
import {
  OfficeRegistrationInput,
  RegistrationErrors,
  RegistrationErrorCode,
  validateOfficeRegistration,
} from '../../lib/auth/registration';
import { SECURITY_QUESTIONS, MAX_SECURITY_QUESTIONS, MIN_SECURITY_QUESTIONS } from '../../lib/auth/securityQuestions';
import { DEFAULT_CURRENCY } from '../../lib/formatters';
import type { CreateOfficeResult } from '../../auth/AuthProvider';
import { TFunc } from './shared';
import { LoginErrorBox } from './LoginErrorBox';
import { LegalModal, LegalDocType } from '../LegalModal';

interface OfficeRegistrationFormProps {
  onCreate: (data: OfficeRegistrationInput) => Promise<CreateOfficeResult> | CreateOfficeResult;
  t: TFunc;
  language?: 'ar' | 'en';
}

type ErrorKind =
  | 'officeName'
  | 'licenseNumber'
  | 'adminPin'
  | 'adminPinConfirm'
  | 'phone'
  | 'currency';

function mapError(code: RegistrationErrorCode, kind: ErrorKind, t: TFunc): string {
  switch (kind) {
    case 'officeName':
      if (code === 'short') return t('regErrOfficeShort');
      if (code === 'invalid') return t('regErrOfficeInvalid');
      return t('regErrOfficeRequired');
    case 'licenseNumber':
      return t('regErrLicenseFormat');
    case 'adminPin':
      return code === 'weak' ? t('regErrPinWeak') : t('regErrPinRequired');
    case 'adminPinConfirm':
      return t('regErrPinMismatch');
    case 'phone':
      return t('valErrPhone');
    case 'currency':
      return t('regErrCurrencyRequired');
  }
}

function fieldError(errors: RegistrationErrors, field: string, kind: ErrorKind, t: TFunc): string | null {
  const code = errors[field];
  if (!code) return null;
  return mapError(code, kind, t);
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1';
const hintClass = 'text-xs text-rose-600 dark:text-rose-400 block mt-1';

export const OfficeRegistrationForm: React.FC<OfficeRegistrationFormProps> = ({ onCreate, t, language = 'ar' }) => {
  const [officeName, setOfficeName] = useState<string>('');
  const [license, setLicense] = useState<string>('');
  const [taxNumber, setTaxNumber] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [adminPin, setAdminPin] = useState<string>('');
  const [adminPinConfirm, setAdminPinConfirm] = useState<string>('');
  const [securityQuestions, setSecurityQuestions] = useState<
    Array<{ questionId: string; answer: string }>
  >([
    { questionId: '', answer: '' },
    { questionId: '', answer: '' },
  ]);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; docType: LegalDocType }>({
    isOpen: false,
    docType: 'privacy',
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usedQuestionIds = new Set(
    securityQuestions.map((q) => q.questionId).filter((id) => id)
  );

  const handleQuestionChange = (index: number, questionId: string) => {
    setSecurityQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, questionId } : q))
    );
  };

  const handleAnswerChange = (index: number, answer: string) => {
    setSecurityQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, answer } : q))
    );
  };

  const addQuestionRow = () => {
    if (securityQuestions.length >= MAX_SECURITY_QUESTIONS) return;
    setSecurityQuestions((prev) => [...prev, { questionId: '', answer: '' }]);
  };

  const removeQuestionRow = (index: number) => {
    if (securityQuestions.length <= MIN_SECURITY_QUESTIONS) return;
    setSecurityQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const questionFieldError = (index: number, field: 'questionId' | 'answer'): string | null => {
    const code = errors[`securityQuestions.question.${index}.${field}`];
    if (!code) return null;
    if (field === 'questionId') {
      return code === 'taken' ? t('regErrSecurityDuplicate') : t('regErrSecurityQuestionRequired');
    }
    return t('regErrSecurityAnswerRequired');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const data: OfficeRegistrationInput = {
      officeName,
      licenseNumber: license,
      phone,
      address,
      currency: currency.trim(),
      taxNumber: taxNumber.trim(),
      adminPin,
      adminPinConfirm,
      securityQuestions: securityQuestions.map((q) => ({ ...q, answer: q.answer.trim() })),
      acceptedTerms,
    };

    const validation = validateOfficeRegistration(data);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const result = await onCreate(data);
      if (!result.ok) {
        setFormError(t('regErrStorage'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('registerNewTitle')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('registerSubtitle')}
        </p>
      </div>

      {/* Office Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{t('officeCompanyNameLabel')}</label>
          <input
            type="text"
            required
            placeholder={t('officeNamePlaceholder')}
            value={officeName}
            onChange={(e) => setOfficeName(e.target.value)}
            className={inputClass}
          />
          {fieldError(errors, 'officeName', 'officeName', t) && (
            <span className={hintClass}>{fieldError(errors, 'officeName', 'officeName', t)}</span>
          )}
        </div>

        <div>
          <label className={labelClass}>{t('licenseRegLabel')}</label>
          <input
            type="text"
            dir="ltr"
            placeholder="1010XXXXXX"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            className={`${inputClass} font-mono`}
          />
          {fieldError(errors, 'licenseNumber', 'licenseNumber', t) && (
            <span className={hintClass}>{fieldError(errors, 'licenseNumber', 'licenseNumber', t)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{t('regTaxNumberLabel')}</label>
          <input
            type="text"
            dir="ltr"
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>{t('regPhoneLabel')}</label>
          <input
            type="text"
            dir="ltr"
            placeholder="05XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${inputClass} font-mono`}
          />
          {fieldError(errors, 'phone', 'phone', t) && (
            <span className={hintClass}>{fieldError(errors, 'phone', 'phone', t)}</span>
          )}
        </div>

        <div>
          <label className={labelClass}>{t('regAddressLabel')}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{t('regCurrencyLabel')}</label>
          <input
            type="text"
            dir="ltr"
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`${inputClass} font-mono`}
          />
          {fieldError(errors, 'currency', 'currency', t) && (
            <span className={hintClass}>{fieldError(errors, 'currency', 'currency', t)}</span>
          )}
        </div>
      </div>

      {/* Admin PIN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{t('adminPinRegLabel')}</label>
          <input
            type="password"
            required
            dir="ltr"
            inputMode="numeric"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            className={`${inputClass} font-mono`}
          />
          {fieldError(errors, 'adminPin', 'adminPin', t) && (
            <span className={hintClass}>{fieldError(errors, 'adminPin', 'adminPin', t)}</span>
          )}
        </div>

        <div>
          <label className={labelClass}>{t('regAdminPinConfirmLabel')}</label>
          <input
            type="password"
            required
            dir="ltr"
            inputMode="numeric"
            value={adminPinConfirm}
            onChange={(e) => setAdminPinConfirm(e.target.value)}
            className={`${inputClass} font-mono`}
          />
          {fieldError(errors, 'adminPinConfirm', 'adminPinConfirm', t) && (
            <span className={hintClass}>{fieldError(errors, 'adminPinConfirm', 'adminPinConfirm', t)}</span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{t('regPinSecurityHint')}</p>

      {/* Security Questions */}
      <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 p-3.5 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldQuestion className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              {t('regSecurityTitle')}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {t('regSecuritySubtitle')}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {securityQuestions.map((q, index) => (
            <div key={index} className="space-y-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {t('regSecurityQuestionLabel', { count: index + 1 })}
                </span>
                {securityQuestions.length > MIN_SECURITY_QUESTIONS && (
                  <button
                    type="button"
                    onClick={() => removeQuestionRow(index)}
                    className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                    title={t('regSecurityRemoveBtn')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={q.questionId}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">{t('regSecuritySelectPlaceholder')}</option>
                {SECURITY_QUESTIONS.map((sq) => (
                  <option key={sq.id} value={sq.id} disabled={usedQuestionIds.has(sq.id) && sq.id !== q.questionId}>
                    {language === 'en' ? sq.en : sq.ar}
                  </option>
                ))}
              </select>
              {questionFieldError(index, 'questionId') && (
                <span className={hintClass}>{questionFieldError(index, 'questionId')}</span>
              )}

              <input
                type="text"
                value={q.answer}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder={t('regSecurityAnswerPlaceholder')}
                className={inputClass}
              />
              {questionFieldError(index, 'answer') && (
                <span className={hintClass}>{questionFieldError(index, 'answer')}</span>
              )}
            </div>
          ))}
        </div>

        {errors.securityQuestions && (
          <span className={hintClass}>{t('regErrSecurityMin')}</span>
        )}

        {securityQuestions.length < MAX_SECURITY_QUESTIONS && (
          <button
            type="button"
            onClick={addQuestionRow}
            className="w-full py-2.5 border border-dashed border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('regSecurityAddBtn')}
          </button>
        )}
      </div>

      {/* Legal Agreement */}
      <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 p-3.5 rounded-2xl">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('regTermsPrefix')}
            <button
              type="button"
              onClick={() => setLegalModal({ isOpen: true, docType: 'privacy' })}
              className="text-blue-600 dark:text-blue-400 font-bold underline underline-offset-2 hover:text-blue-700 mx-1 cursor-pointer"
            >
              {t('regTermsPrivacyLink')}
            </button>
            {t('regTermsAnd')}
            <button
              type="button"
              onClick={() => setLegalModal({ isOpen: true, docType: 'terms' })}
              className="text-blue-600 dark:text-blue-400 font-bold underline underline-offset-2 hover:text-blue-700 mx-1 cursor-pointer"
            >
              {t('regTermsServiceLink')}
            </button>
          </span>
        </label>
        {errors.acceptedTerms && (
          <span className={hintClass}>{t('regErrTermsRequired')}</span>
        )}
      </div>

      <LoginErrorBox message={formError} />

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <PlusCircle className="w-4 h-4" />
        <span>{t('createOfficeBtn')}</span>
      </button>

      <LegalModal
        isOpen={legalModal.isOpen}
        docType={legalModal.docType}
        language={language}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </form>
  );
};

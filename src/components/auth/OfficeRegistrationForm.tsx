import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import {
  OfficeRegistrationInput,
  RegistrationErrors,
  RegistrationErrorCode,
  validateOfficeRegistration,
} from '../../lib/auth/registration';
import type { CreateOfficeResult } from '../../auth/AuthProvider';
import { TFunc } from './shared';
import { LoginErrorBox } from './LoginErrorBox';

interface OfficeRegistrationFormProps {
  onCreate: (data: OfficeRegistrationInput) => Promise<CreateOfficeResult> | CreateOfficeResult;
  t: TFunc;
}

type ErrorKind =
  | 'officeName'
  | 'licenseNumber'
  | 'adminPin'
  | 'adminPinConfirm'
  | 'empName'
  | 'empUsername'
  | 'empPin';

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
    case 'empName':
      return t('regErrNameRequired');
    case 'empUsername':
      return code === 'taken' ? t('regErrUsernameTaken') : t('regErrUsernameInvalid');
    case 'empPin':
      return code === 'weak' ? t('regErrPinWeak') : t('regErrPinRequired');
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

export const OfficeRegistrationForm: React.FC<OfficeRegistrationFormProps> = ({ onCreate, t }) => {
  const [officeName, setOfficeName] = useState<string>('');
  const [license, setLicense] = useState<string>('');
  const [adminPin, setAdminPin] = useState<string>('');
  const [adminPinConfirm, setAdminPinConfirm] = useState<string>('');
  const [emp1, setEmp1] = useState<{ name: string; username: string; pin: string }>({ name: '', username: '', pin: '' });
  const [emp2, setEmp2] = useState<{ name: string; username: string; pin: string }>({ name: '', username: '', pin: '' });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const data: OfficeRegistrationInput = {
      officeName,
      licenseNumber: license,
      adminPin,
      adminPinConfirm,
      employees: [
        { name: emp1.name, username: emp1.username, pin: emp1.pin },
        { name: emp2.name, username: emp2.username, pin: emp2.pin },
      ],
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

      {/* Employees initial setup */}
      <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 p-3.5 rounded-2xl space-y-3">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
          {t('initialEmpTitle')}
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">{t('firstEmpNameLabel')}</label>
            <input
              type="text"
              value={emp1.name}
              onChange={(e) => setEmp1({ ...emp1, name: e.target.value })}
              className="w-full p-2 bg-white border border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg text-xs font-bold"
            />
            {fieldError(errors, 'employee.0.name', 'empName', t) && (
              <span className={hintClass}>{fieldError(errors, 'employee.0.name', 'empName', t)}</span>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">{t('regEmpUsernameLabel')}</label>
            <input
              type="text"
              dir="ltr"
              value={emp1.username}
              onChange={(e) => setEmp1({ ...emp1, username: e.target.value })}
              className="w-full p-2 bg-white border border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg text-xs font-mono font-bold"
            />
            {fieldError(errors, 'employee.0.username', 'empUsername', t) && (
              <span className={hintClass}>{fieldError(errors, 'employee.0.username', 'empUsername', t)}</span>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">{t('firstEmpPinLabel')}</label>
          <input
            type="password"
            dir="ltr"
            inputMode="numeric"
            value={emp1.pin}
            onChange={(e) => setEmp1({ ...emp1, pin: e.target.value })}
            className="w-full p-2 bg-white border border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg text-xs font-mono font-bold"
          />
          {fieldError(errors, 'employee.0.pin', 'empPin', t) && (
            <span className={hintClass}>{fieldError(errors, 'employee.0.pin', 'empPin', t)}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">{t('secondEmpNameLabel')}</label>
            <input
              type="text"
              value={emp2.name}
              onChange={(e) => setEmp2({ ...emp2, name: e.target.value })}
              className="w-full p-2 bg-white border border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg text-xs font-bold"
            />
            {fieldError(errors, 'employee.1.name', 'empName', t) && (
              <span className={hintClass}>{fieldError(errors, 'employee.1.name', 'empName', t)}</span>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">{t('regEmpUsernameLabel')}</label>
            <input
              type="text"
              dir="ltr"
              value={emp2.username}
              onChange={(e) => setEmp2({ ...emp2, username: e.target.value })}
              className="w-full p-2 bg-white border border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg text-xs font-mono font-bold"
            />
            {fieldError(errors, 'employee.1.username', 'empUsername', t) && (
              <span className={hintClass}>{fieldError(errors, 'employee.1.username', 'empUsername', t)}</span>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">{t('secondEmpPinLabel')}</label>
          <input
            type="password"
            dir="ltr"
            inputMode="numeric"
            value={emp2.pin}
            onChange={(e) => setEmp2({ ...emp2, pin: e.target.value })}
            className="w-full p-2 bg-white border border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white rounded-lg text-xs font-mono font-bold"
          />
          {fieldError(errors, 'employee.1.pin', 'empPin', t) && (
            <span className={hintClass}>{fieldError(errors, 'employee.1.pin', 'empPin', t)}</span>
          )}
        </div>
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
    </form>
  );
};

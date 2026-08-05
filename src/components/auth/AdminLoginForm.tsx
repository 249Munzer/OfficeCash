import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { TFunc } from './shared';
import { LoginErrorBox } from './LoginErrorBox';

interface AdminLoginFormProps {
  onLogin: (adminPin: string) => Promise<boolean> | boolean;
  t: TFunc;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onLogin, t }) => {
  const [adminPin, setAdminPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const success = await onLogin(adminPin);
      if (success) {
        setAdminPin('');
      } else {
        setErrorMsg(t('lpErrWrongAdmin'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800/60 dark:text-blue-200 p-3.5 rounded-2xl text-xs space-y-1">
        <span className="font-extrabold flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('lpAdminPermissionsTitle')}
        </span>
        <p className="text-xs text-blue-600 dark:text-blue-300">
          {t('lpAdminPermissionsDesc')}
        </p>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
          {t('lpAdminPinLabel')}
        </label>
        <div className="relative">
          <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
          <input
            type="password"
            required
            dir="ltr"
            inputMode="numeric"
            autoComplete="current-password"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            placeholder={t('lpAdminPinPlaceholder')}
            className="w-full pr-9 pl-4 py-3 bg-white border border-slate-300 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
          {t('setAdminPinHint')}
        </span>
      </div>

      <LoginErrorBox message={errorMsg} />

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <ShieldCheck className="w-4 h-4" />
        <span>{t('adminMainDashboardBtn')}</span>
      </button>
    </form>
  );
};

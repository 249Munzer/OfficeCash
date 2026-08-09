/**
 * نموذج دخول الموظف — اختيار حساب الموظف من القائمة ثم إدخال PIN لتسجيل الدخول.
 * @component
 * @param {Object} props
 * @param {Employee[]} props.employees - قائمة الموظفين
 * @param {string} props.defaultSelectedId - الموظف المحدد افتراضياً (اختياري)
 * @param {Function} props.onLogin - محاولة تسجيل دخول الموظف
 * @param {Function} props.t - دالة الترجمة
 */
import React, { useState } from 'react';
import { KeyRound, Users } from 'lucide-react';
import { Employee } from '../../types';
import { TFunc } from './shared';
import { LoginErrorBox } from './LoginErrorBox';

interface EmployeeLoginFormProps {
  employees: Employee[];
  defaultSelectedId?: string;
  onLogin: (employeeId: string, pin: string) => Promise<boolean> | boolean;
  t: TFunc;
}

export const EmployeeLoginForm: React.FC<EmployeeLoginFormProps> = ({
  employees,
  defaultSelectedId,
  onLogin,
  t,
}) => {
  const activeEmployees = employees.filter((e) => e.isActive);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    defaultSelectedId || activeEmployees[0]?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedEmp = activeEmployees.find((e) => e.id === selectedEmpId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedEmpId) {
      setErrorMsg(t('lpErrSelectEmp'));
      return;
    }
    setSubmitting(true);
    try {
      const success = await onLogin(selectedEmpId, pin);
      if (success) {
        setPin('');
      } else {
        setErrorMsg(t('lpErrWrongPin'));
      }
    } catch {
      setErrorMsg(t('lpErrGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
          {t('selectEmpAccountLabel')}
        </label>
        <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
          {activeEmployees.map((emp) => {
            const isSelected = selectedEmpId === emp.id;
            return (
              <button
                type="button"
                key={emp.id}
                onClick={() => {
                  setSelectedEmpId(emp.id);
                  setErrorMsg(null);
                }}
                className={`p-3 rounded-2xl text-right border transition-all flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 text-slate-900 dark:bg-blue-900/40 dark:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-md"
                  style={{ backgroundColor: emp.color }}
                >
                  {emp.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">{emp.name}</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">
                    @{emp.username}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
          {t('empPinNameLabel', { name: selectedEmp?.name || t('roleEmployee') })}
        </label>
        <div className="relative">
          <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
          <input
            type="password"
            required
            dir="ltr"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={t('empPinPlaceholder')}
            className="w-full pr-9 pl-4 py-3 bg-white border border-slate-300 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
          {t('enterEmployeePin')}
        </span>
      </div>

      <LoginErrorBox message={errorMsg} />

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Users className="w-4 h-4" />
        <span>{t('portalLoginBtn')}</span>
      </button>
    </form>
  );
};

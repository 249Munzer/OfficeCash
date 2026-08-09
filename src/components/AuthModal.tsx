/**
 * نافذة الدخول — تبديل بين دخول المدير والموظف، ربط LAN عبر رمز المزامنة،
 * وفتح استرداد كلمة مرور المدير عبر أسئلة الأمان.
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - هل النافذة مفتوحة
 * @param {Employee[]} props.employees - قائمة الموظفين
 * @param {OfficeSettings} props.settings - الإعدادات ورمز مزامنة الشبكة
 * @param {Employee|null} props.activeEmployee - الموظف المسجل دخوله حالياً
 * @param {Function} props.onLoginAsEmployee - تسجيل دخول موظف
 * @param {Function} props.onLoginAsAdmin - تسجيل دخول مدير
 * @param {Function} props.onVerifyAnswers - التحقق من إجابات أسئلة الأمان
 * @param {Function} props.onResetPin - إعادة تعيين PIN بعد التحقق
 * @param {Function} props.onClose - إغلاق النافذة
 * @param {Object} props.syncStatus - حالة المزامنة للعرض (اختياري)
 * @param {string} props.initialTab - التبويب الابتدائي: موظف أو مدير (اختياري)
 */
import React, { useState, useEffect } from 'react';
import { Shield, Users, Radio, CheckCircle2, Building2 } from 'lucide-react';
import { Employee, OfficeSettings } from '../types';
import { makeT } from '../lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import type { SyncStatus } from '../lib/electron-storage';
import { EmployeeLoginForm } from './auth/EmployeeLoginForm';
import { AdminLoginForm, ResetPinErrorCode } from './auth/AdminLoginForm';

interface AuthModalProps {
  isOpen: boolean;
  employees: Employee[];
  settings: OfficeSettings;
  activeEmployee: Employee | null;
  onLoginAsEmployee: (employeeId: string, pin: string) => Promise<boolean> | boolean;
  onLoginAsAdmin: (adminPin: string) => Promise<boolean> | boolean;
  onVerifyAnswers: (
    answers: Array<{ questionId: string; answer: string }>
  ) => Promise<{ valid: boolean; error?: ResetPinErrorCode }>;
  onResetPin: (
    answers: Array<{ questionId: string; answer: string }>,
    newPin: string
  ) => Promise<{ ok: boolean; error?: ResetPinErrorCode }>;
  onClose: () => void;
  syncStatus?: SyncStatus | null;
  initialTab?: 'employee' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  employees,
  settings,
  activeEmployee,
  onLoginAsEmployee,
  onLoginAsAdmin,
  onVerifyAnswers,
  onResetPin,
  onClose,
  syncStatus,
  initialTab = 'employee',
}) => {
  const [authType, setAuthType] = useState<'employee' | 'admin'>(initialTab);
  const [copiedSyncCode, setCopiedSyncCode] = useState<boolean>(false);

  const t = makeT(settings.language);

  // عند فتح المودال يبدأ من التبويب المطلوب (تبويب المدير عند التبديل من بوابة الموظف)
  useEffect(() => {
    if (isOpen) {
      setAuthType(initialTab);
      setCopiedSyncCode(false);
    }
  }, [isOpen, initialTab]);

  const handleCopySyncCode = () => {
    const code = settings.networkSyncCode || '';
    navigator.clipboard.writeText(code);
    setCopiedSyncCode(true);
    setTimeout(() => setCopiedSyncCode(false), 2500);
  };

  const handleEmployeeLogin = async (employeeId: string, pin: string) => {
    const success = await onLoginAsEmployee(employeeId, pin);
    if (success) onClose();
    return success;
  };

  const handleAdminLogin = async (adminPin: string) => {
    const success = await onLoginAsAdmin(adminPin);
    if (success) onClose();
    return success;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Top Network & Office Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400">
                  {t('loginGatewaySubtitle')}
                </span>

                <button
                  onClick={handleCopySyncCode}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSyncCode ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Radio className="w-3 h-3 text-blue-300" />}
                  <span>{copiedSyncCode ? t('codeCopied') : settings.networkSyncCode || t('lanNoSyncCode')}</span>
                </button>

                {syncStatus?.connected && syncStatus.peerCount > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {t('lanStatusConnected', { count: syncStatus.peerCount })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">{settings.officeName}</h2>
                  <p className="text-xs text-slate-400">{t('loginGatewaySubtitle')}</p>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-1 rounded-2xl mt-5">
                <button
                  onClick={() => setAuthType('employee')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    authType === 'employee'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{t('employeeLoginTab')}</span>
                </button>

                <button
                  onClick={() => setAuthType('admin')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    authType === 'admin'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>{t('adminLoginTab')}</span>
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              {authType === 'employee' ? (
                <EmployeeLoginForm
                  employees={employees}
                  defaultSelectedId={activeEmployee?.id}
                  onLogin={handleEmployeeLogin}
                  t={t}
                />
              ) : (
                <AdminLoginForm
                  onLogin={handleAdminLogin}
                  t={t}
                  settings={settings}
                  onVerifyAnswers={onVerifyAnswers}
                  onResetPin={onResetPin}
                />
              )}

              <div className="pt-2 text-center">
                <button
                  onClick={onClose}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {t('continueNoChange')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

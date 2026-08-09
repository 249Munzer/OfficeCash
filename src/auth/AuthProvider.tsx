import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Employee, AuthSession, OfficeSettings } from '../types';
import {
  loadAuthSession as loadAuthSessionElectron,
  saveAuthSession as saveAuthSessionElectron,
  saveSettings as saveSettingsElectron,
  clearAllData as clearAllDataElectron,
} from '../lib/electron-storage';
import { hashCredential, verifyCredential } from '../lib/auth/credentials';
import { createSession } from '../lib/auth/session';
import { generateSyncCode } from '../lib/syncCode';
import { OfficeRegistrationInput, validateOfficeRegistration, isValidSetupPin } from '../lib/auth/registration';
import { hashAnswer, verifyAnswer } from '../lib/auth/securityQuestions';
import { saveEmployee as saveEmployeeElectron } from '../lib/electron-storage';
import { DEFAULT_CURRENCY } from '../lib/formatters';

/**
 * نتيجة إنشاء مكتب جديد.
 * @typedef {Object} CreateOfficeResult
 * @property {boolean} ok - نجاح العملية
 * @property {string} [error] - رسالة خطأ إن فشلت
 * @property {string} [officeName] - اسم المكتب المُنشأ
 */

/**
 * خيارات مُقدِّم المصادقة (اختيارية للتوست).
 * @typedef {Object} AuthProviderOptions
 * @property {Function} [showSuccess] - دالة إظهار رسالة نجاح
 * @property {Function} [showInfo] - دالة إظهار رسالة معلومة
 */

/**
 * سياق المصادقة — يوفّر الجلسة، الدور، الموظف النشط، ودوال الدخول/الخروج/إنشاء مكتب.
 * @typedef {Object} AuthContextValue
 * @property {AuthSession|null} session - الجلسة الحالية
 * @property {boolean} isAuthLoading - جارٍ تحميل الجلسة المخزنة
 * @property {'admin'|'employee'|null} role - دور المستخدم
 * @property {string} activeEmployeeId - معرف الموظف النشط
 * @property {Function} setSession - تعيين الجلسة يدوياً
 * @property {Function} setRole - تعيين الدور يدوياً
 * @property {Function} setActiveEmployeeId - تعيين الموظف النشط يدوياً
 * @property {Function} selectActiveEmployee - اختيار موظف (يحدث activeEmployeeId)
 * @property {Function} loginAsEmployee - دخول موظف بـ PIN (يتحقق عبر verifyCredential)
 * @property {Function} verifyEmployeePin - تحقق PIN موظف بدون تسجيل دخول
 * @property {Function} loginAsAdmin - دخول مدير بـ PIN
 * @property {Function} logout - خروج + مسح الجلسة المخزنة
 * @property {Function} createOffice - إنشاء مكتب جديد (تحقق تسجيل + إنشاء بيانات أولية)
 */

export interface CreateOfficeResult {
  ok: boolean;
  error?: string;
  officeName?: string;
}

export type ResetPinErrorCode = 'answers' | 'invalid-pin' | 'storage' | 'unavailable';

export interface ResetPinResult {
  ok: boolean;
  error?: ResetPinErrorCode;
  /** الإعدادات بعد تحديث رمز المدير — تُستخدم لمزامنة حالة التطبيق في الذاكرة */
  settings?: OfficeSettings;
}

export interface AuthProviderOptions {
  showSuccess?: (message: string, duration?: number) => void;
  showInfo?: (message: string, duration?: number) => void;
}

interface AuthContextValue {
  session: AuthSession | null;
  isAuthLoading: boolean;
  role: 'admin' | 'employee' | null;
  activeEmployeeId: string;
  setSession: (session: AuthSession | null) => void;
  setRole: (role: 'admin' | 'employee' | null) => void;
  setActiveEmployeeId: (id: string) => void;
  selectActiveEmployee: (empId: string) => void;
  loginAsEmployee: (
    employeeId: string,
    pin: string,
    employees: Employee[],
    settings?: OfficeSettings
  ) => Promise<boolean>;
  verifyEmployeePin: (employeeId: string, pin: string, employees: Employee[]) => Promise<boolean>;
  loginAsAdmin: (adminPin: string, settings?: OfficeSettings) => Promise<boolean>;
  verifySecurityAnswers: (
    answers: Array<{ questionId: string; answer: string }>,
    settings?: OfficeSettings
  ) => Promise<{ valid: boolean; error?: ResetPinErrorCode }>;
  resetAdminPin: (
    answers: Array<{ questionId: string; answer: string }>,
    newPin: string,
    settings?: OfficeSettings
  ) => Promise<ResetPinResult>;
  logout: () => Promise<void>;
  createOffice: (data: OfficeRegistrationInput) => Promise<CreateOfficeResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook للوصول لسياق المصادقة (يرمي إن استُخدم خارج Provider).
 * @returns {AuthContextValue} سياق المصادقة
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}

/**
 * مُقدِّم سياق المصادقة — يحمل الجلسة المخزنة، يدير تسجيل دخول مدير/موظف،
 * إنشاء مكتب جديد (مع تحقق `validateOfficeRegistration`، توليد رمز مزامنة، PINs مشفرة)،
 * والخروج مع مسح التخزين.
 * @component
 * @param {AuthProviderOptions} props - خيارات التوست
 * @param {React.ReactNode} props.children - شجرة المكونات الفرعية
 */
export const AuthProvider: React.FC<AuthProviderOptions & { children: React.ReactNode }> = ({
  children,
  showSuccess,
  showInfo,
}) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // تحميل الجلسة المخزنة عند بدء التشغيل
  useEffect(() => {
    async function loadSession() {
      try {
        const stored = await loadAuthSessionElectron();
        if (stored) {
          setSession(stored);
          setRole(stored.role);
          if (stored.role === 'employee') {
            setActiveEmployeeId(stored.employeeId || '');
          }
        }
      } catch (error) {
        console.error('Failed to load auth session:', error);
      } finally {
        setIsAuthLoading(false);
      }
    }
    loadSession();
  }, []);

  const selectActiveEmployee = useCallback((empId: string) => {
    setActiveEmployeeId(empId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('active_employee_id', empId);
    }
  }, []);

  const loginAsEmployee = useCallback(
    async (
      employeeId: string,
      pin: string,
      employees: Employee[],
      settings?: OfficeSettings
    ): Promise<boolean> => {
      const targetEmp = employees.find((emp) => emp.id === employeeId);
      if (!targetEmp) return false;

      const { valid, upgradable } = await verifyCredential(targetEmp.passwordPin, pin);
      if (!valid) return false;

      if (upgradable) {
        // ترقية صامتة: حفظ الموظف الفردي فقط (وليس القائمة كاملة) بصيغة hash الفردي
        const upgraded: Employee = { ...targetEmp, passwordPin: await hashCredential(pin) };
        await saveEmployeeElectron(upgraded);
      }

      const nextSession = createSession({
        role: 'employee',
        officeName: settings?.officeName || '',
        employeeId: targetEmp.id,
        employeeName: targetEmp.name,
      });
      await saveAuthSessionElectron(nextSession);
      setSession(nextSession);
      setRole('employee');
      setActiveEmployeeId(targetEmp.id);
      if (showSuccess) showSuccess(`مرحباً بك، ${targetEmp.name}!`);
      return true;
    },
    [showSuccess]
  );

  const loginAsAdmin = useCallback(
    async (adminPin: string, settings?: OfficeSettings): Promise<boolean> => {
      const storedPin = settings?.adminPasswordPin;
      if (!storedPin) return false;

      const { valid, upgradable } = await verifyCredential(storedPin, adminPin);
      if (!valid) return false;

      if (upgradable && settings) {
        // ترقية صامتة: حفظ رمز المدير المشفر بصيغة hash الفردي فوراً
        const upgradedHash = await hashCredential(adminPin);
        await saveSettingsElectron({ ...settings, adminPasswordPin: upgradedHash });
      }

      const nextSession = createSession({
        role: 'admin',
        officeName: settings?.officeName || '',
      });
      await saveAuthSessionElectron(nextSession);
      setSession(nextSession);
      setRole('admin');
      // لا نُبقي موظفاً مختاراً من جلسة سابقة على بوابة الموظف بعد دخول المدير
      setActiveEmployeeId('');
      if (showSuccess) showSuccess('مرحباً بك في لوحة الإدارة!');
      return true;
    },
    [showSuccess]
  );

  // التحقق من الرمز السري لموظف دون إنشاء جلسة (يُستخدم عند تبديل الحساب من بوابة الموظف)
  const verifyEmployeePin = useCallback(
    async (employeeId: string, pin: string, employees: Employee[]): Promise<boolean> => {
      const targetEmp = employees.find((emp) => emp.id === employeeId);
      if (!targetEmp) return false;
      const { valid } = await verifyCredential(targetEmp.passwordPin, pin);
      return valid;
    },
    []
  );

  // استرداد كلمة مرور المدير عبر أسئلة الأمان المحفوظة في الإعدادات:
  // التحقق من كل الإجابات بالترتيب المحفوظ دون كشف أي سؤال خاطئ بعينه.
  const verifySecurityAnswers = useCallback(
    async (
      answers: Array<{ questionId: string; answer: string }>,
      settings?: OfficeSettings
    ): Promise<{ valid: boolean; error?: ResetPinErrorCode }> => {
      const saved = settings?.securityQuestions;
      if (!saved || saved.length === 0) {
        return { valid: false, error: 'unavailable' };
      }
      if (answers.length < saved.length) {
        return { valid: false, error: 'answers' };
      }
      for (let i = 0; i < saved.length; i++) {
        const expected = answers[i];
        if (!expected || expected.questionId !== saved[i].questionId) {
          return { valid: false, error: 'answers' };
        }
        const { valid } = await verifyAnswer(saved[i].answerHash, expected.answer);
        if (!valid) {
          return { valid: false, error: 'answers' };
        }
      }
      return { valid: true };
    },
    []
  );

  // إعادة تعيين كلمة مرور المدير: يعيد التحقق من الإجابات مرة أخرى (لا يثق في الواجهة)
  // ثم يحفظ PIN جديد مشفّر في الإعدادات.
  const resetAdminPin = useCallback(
    async (
      answers: Array<{ questionId: string; answer: string }>,
      newPin: string,
      settings?: OfficeSettings
    ): Promise<ResetPinResult> => {
      if (!isValidSetupPin(newPin)) {
        return { ok: false, error: 'invalid-pin' };
      }
      const check = await verifySecurityAnswers(answers, settings);
      if (!check.valid) {
        return { ok: false, error: check.error || 'answers' };
      }
      try {
        const newHash = await hashCredential(newPin);
        const updated: OfficeSettings = { ...settings, adminPasswordPin: newHash };
        await saveSettingsElectron(updated);
        if (showInfo) showInfo('تم تعيين كلمة مرور مدير جديدة بنجاح');
        return { ok: true, settings: updated };
      } catch (error) {
        console.error('Failed to reset admin PIN:', error);
        return { ok: false, error: 'storage' };
      }
    },
    [verifySecurityAnswers, showInfo]
  );

  const logout = useCallback(async () => {
    await saveAuthSessionElectron(null);
    setSession(null);
    setRole(null);
    setActiveEmployeeId('');
    if (showInfo) showInfo('تم تسجيل الخروج بنجاح');
  }, [showInfo]);  const createOffice = useCallback(
    async (data: OfficeRegistrationInput): Promise<CreateOfficeResult> => {
      const validation = validateOfficeRegistration(data);
      if (!validation.ok) {
        return { ok: false, error: 'validation' };
      }

      try {
        // مسح أي بيانات لمكتب سابق لضمان بداية نظيفة، وبعد نجاح التحقق فقط
        await clearAllDataElectron();

        const adminHash = await hashCredential(data.adminPin);
        const securityQuestions = await Promise.all(
          data.securityQuestions.map(async (q) => ({
            questionId: q.questionId,
            answerHash: await hashAnswer(q.answer),
          }))
        );

        const newSettings: OfficeSettings = {
          officeName: data.officeName.trim(),
          licenseNumber: data.licenseNumber.trim(),
          phone: data.phone.trim(),
          address: data.address.trim(),
          taxNumber: data.taxNumber.trim(),
          currency: data.currency.trim() || DEFAULT_CURRENCY,
          adminPasswordPin: adminHash,
          networkSyncCode: generateSyncCode(),
          theme: 'light',
          language: 'ar',
          autoLockClosedDays: true,
          soundEffects: true,
          securityQuestions,
        };

        const nextSession = createSession({ role: 'admin', officeName: newSettings.officeName });
        await saveAuthSessionElectron(nextSession);
        setSession(nextSession);
        setRole('admin');

        await saveSettingsElectron(newSettings);

        if (showSuccess) showSuccess(`تم إنشاء مكتب "${newSettings.officeName}" بنجاح!`, 6000);
        return { ok: true, officeName: newSettings.officeName };
      } catch (error) {
        console.error('Failed to create office:', error);
        return { ok: false, error: 'storage' };
      }
    },
    [showSuccess]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthLoading,
      role,
      activeEmployeeId,
      setSession,
      setRole,
      setActiveEmployeeId,
      selectActiveEmployee,
      loginAsEmployee,
      verifyEmployeePin,
      loginAsAdmin,
      verifySecurityAnswers,
      resetAdminPin,
      logout,
      createOffice,
    }),
    [session, isAuthLoading, role, activeEmployeeId, selectActiveEmployee, loginAsEmployee, verifyEmployeePin, loginAsAdmin, verifySecurityAnswers, resetAdminPin, logout, createOffice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

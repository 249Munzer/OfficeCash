import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Employee, AuthSession, OfficeSettings } from '../types';
import {
  loadAuthSession as loadAuthSessionElectron,
  saveAuthSession as saveAuthSessionElectron,
  saveSettings as saveSettingsElectron,
  saveEmployees as saveEmployeesElectron,
  clearAllData as clearAllDataElectron,
} from '../lib/electron-storage';
import { hashCredential, verifyCredential } from '../lib/auth/credentials';
import { createSession } from '../lib/auth/session';
import { generateSyncCode } from '../lib/syncCode';
import { OfficeRegistrationInput, validateOfficeRegistration } from '../lib/auth/registration';
import { saveEmployee as saveEmployeeElectron } from '../lib/electron-storage';

export interface CreateOfficeResult {
  ok: boolean;
  error?: string;
  officeName?: string;
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
  logout: () => Promise<void>;
  createOffice: (data: OfficeRegistrationInput) => Promise<CreateOfficeResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}

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

  const logout = useCallback(async () => {
    await saveAuthSessionElectron(null);
    setSession(null);
    setRole(null);
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
        const newSettings: OfficeSettings = {
          officeName: data.officeName.trim(),
          licenseNumber: data.licenseNumber.trim(),
          adminPasswordPin: adminHash,
          networkSyncCode: generateSyncCode(),
          currency: 'ر.ق',
          phone: '',
          address: '',
          taxNumber: '',
          theme: 'light',
          language: 'ar',
          autoLockClosedDays: true,
          soundEffects: true,
        };

        const nextSession = createSession({ role: 'admin', officeName: newSettings.officeName });
        await saveAuthSessionElectron(nextSession);
        setSession(nextSession);
        setRole('admin');

        await saveSettingsElectron(newSettings);

        const employeesToSave: Employee[] = [];
        for (let i = 0; i < data.employees.length; i++) {
          const emp = data.employees[i];
          if (!emp.name.trim() || !emp.pin.trim()) continue;
          employeesToSave.push({
            id: `emp-${Date.now()}-${i}`,
            name: emp.name.trim(),
            username: emp.username.trim() || `emp${i + 1}`,
            passwordPin: await hashCredential(emp.pin),
            color: '#2563eb',
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        }
        if (employeesToSave.length > 0) {
          await saveEmployeesElectron(employeesToSave);
        }

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
      logout,
      createOffice,
    }),
    [session, isAuthLoading, role, activeEmployeeId, selectActiveEmployee, loginAsEmployee, verifyEmployeePin, loginAsAdmin, logout, createOffice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

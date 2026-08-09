/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Electron Storage Layer
 * يوفر طبقة وسيطة للاتصال بـ Electron API مع fallback إلى localStorage
 * هذا يسمح للتطبيق بالعمل في كل من البيئتين: المتصفح و Electron.
 * @module lib/electron-storage
 */

import {
  Employee,
  Service,
  FinancialEntry,
  Expense,
  DayClosing,
  OfficeSettings,
  AuthSession,
  AttendanceRecord,
  Settlement,
} from '../types';
import { hashPin, isPlainPin } from './crypto';
import { DEFAULT_CURRENCY } from './formatters';

export interface SyncStatus {
  code: string;
  connected: boolean;
  peerCount: number;
  peers: Array<{ id: string; name: string }>;
  serverListening: boolean;
  serverPort: number;
  serverError: string | null;
}

// تعريف نوع لـ electronAPI
declare global {
  interface Window {
    electronAPI?: {
      getEntries: () => Promise<FinancialEntry[]>;
      addEntry: (data: FinancialEntry) => Promise<boolean>;
      updateEntry: (data: FinancialEntry) => Promise<boolean>;
      deleteEntry: (id: string) => Promise<boolean>;
      replaceEntries: (entries: FinancialEntry[]) => Promise<boolean>;
      getExpenses: () => Promise<Expense[]>;
      addExpense: (data: Expense) => Promise<boolean>;
      deleteExpense: (id: string) => Promise<boolean>;
      replaceExpenses: (expenses: Expense[]) => Promise<boolean>;
      getEmployees: () => Promise<Employee[]>;
      saveEmployee: (data: Employee) => Promise<boolean>;
      deleteEmployee: (id: string) => Promise<boolean>;
      replaceEmployees: (employees: Employee[]) => Promise<boolean>;
      getServices: () => Promise<Service[]>;
      saveService: (data: Service) => Promise<boolean>;
      deleteService: (id: string) => Promise<boolean>;
      replaceServices: (services: Service[]) => Promise<boolean>;
      getDayClosings: () => Promise<DayClosing[]>;
      saveDayClosing: (data: DayClosing) => Promise<boolean>;
      replaceDayClosings: (closings: DayClosing[]) => Promise<boolean>;
      getAttendance: () => Promise<AttendanceRecord[]>;
      replaceAttendance: (records: AttendanceRecord[]) => Promise<boolean>;
      getSettlements: () => Promise<Settlement[]>;
      replaceSettlements: (settlements: Settlement[]) => Promise<boolean>;
      getSettings: () => Promise<Partial<OfficeSettings>>;
      saveSettings: (settings: Partial<OfficeSettings>) => Promise<boolean>;
      loadAuthSession: () => Promise<AuthSession | null>;
      saveAuthSession: (session: AuthSession | null) => Promise<boolean>;
      resetToDemoData: () => Promise<boolean>;
      clearData: () => Promise<boolean>;
      deleteOffice: () => Promise<boolean>;
      syncGetState: () => Promise<SyncStatus>;
      syncJoin: (code: string) => Promise<SyncStatus & { join?: { ok: boolean; error?: string } }>;
      onSyncStatus: (callback: (status: SyncStatus) => void) => () => void;
      onP2PSync: (callback: () => void) => () => void;
      printReport: () => Promise<void>;
    };
  }
}

// Helper function للتحقق من توفر Electron API
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

// ==================== SETTINGS ====================

export async function loadSettings(): Promise<OfficeSettings> {
  if (isElectron()) {
    const data = await window.electronAPI!.getSettings();
    // دمج مع الإعدادات الافتراضية
    const defaultSettings = getDefaultSettings();
    return { ...defaultSettings, ...data } as OfficeSettings;
  }
  // Fallback to localStorage
  const data = localStorage.getItem('officecash_settings');
  if (!data) return getDefaultSettings();
  try {
    const parsed = JSON.parse(data);
    return { ...getDefaultSettings(), ...parsed };
  } catch {
    return getDefaultSettings();
  }
}

export async function saveSettings(settings: OfficeSettings): Promise<void> {
  // تشفير PIN الإدارة إذا كان نصياً واضحاً
  let securedSettings = settings;
  if (settings.adminPasswordPin && isPlainPin(settings.adminPasswordPin)) {
    securedSettings = {
      ...settings,
      adminPasswordPin: await hashPin(settings.adminPasswordPin),
    };
  }

  if (isElectron()) {
    await window.electronAPI!.saveSettings(securedSettings);
  } else {
    localStorage.setItem('officecash_settings', JSON.stringify(securedSettings));
  }
}

function getDefaultSettings(): OfficeSettings {
  return {
    officeName: '',
    licenseNumber: '',
    phone: '',
    address: '',
    currency: DEFAULT_CURRENCY,
    taxNumber: '',
    autoLockClosedDays: true,
    soundEffects: true,
    adminPasswordPin: '',
    networkSyncCode: '',
    theme: 'light',
    language: 'ar',
  };
}

// ==================== EMPLOYEES ====================

export async function loadEmployees(): Promise<Employee[]> {
  if (isElectron()) {
    return await window.electronAPI!.getEmployees();
  }
  const data = localStorage.getItem('officecash_employees');
  if (!data) {
    const initial = getInitialEmployees();
    saveEmployees(initial);
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return getInitialEmployees();
  }
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  // تشفير PINs النصية الواضحة قبل الحفظ
  const securedEmployees = await Promise.all(
    employees.map(async (emp) => {
      if (isPlainPin(emp.passwordPin)) {
        return { ...emp, passwordPin: await hashPin(emp.passwordPin) };
      }
      return emp;
    })
  );

  if (isElectron()) {
    // استبدال كامل: يضمن حذف أي موظف تمت إزالته من القائمة في قاعدة البيانات
    await window.electronAPI!.replaceEmployees(securedEmployees);
  } else {
    localStorage.setItem('officecash_employees', JSON.stringify(securedEmployees));
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  if (isElectron()) {
    await window.electronAPI!.deleteEmployee(id);
  } else {
    const employees = await loadEmployees();
    const filtered = employees.filter(e => e.id !== id);
    localStorage.setItem('officecash_employees', JSON.stringify(filtered));
  }
}

/**
 * حفظ موظف فردي فقط (upsert) دون إعادة كتابة القائمة الكاملة.
 * يُستخدم للترقية الصامتة لصيغة hash الرمز السري عند تسجيل الدخول
 * لتجنّب استبدال قائمة الموظفين كاملة مع كل دخول.
 */
export async function saveEmployee(employee: Employee): Promise<void> {
  const secured = isPlainPin(employee.passwordPin)
    ? { ...employee, passwordPin: await hashPin(employee.passwordPin) }
    : employee;

  if (isElectron()) {
    await window.electronAPI!.saveEmployee(secured);
  } else {
    const employees = await loadEmployees();
    const index = employees.findIndex((e) => e.id === employee.id);
    const next =
      index >= 0
        ? employees.map((e) => (e.id === employee.id ? secured : e))
        : [...employees, secured];
    localStorage.setItem('officecash_employees', JSON.stringify(next));
  }
}

function getInitialEmployees(): Employee[] {
  return [];
}

// ==================== SERVICES ====================

export async function loadServices(): Promise<Service[]> {
  if (isElectron()) {
    return await window.electronAPI!.getServices();
  }
  const data = localStorage.getItem('officecash_services');
  if (!data) {
    const initial = getInitialServices();
    saveServices(initial);
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return getInitialServices();
  }
}

export async function saveServices(services: Service[]): Promise<void> {
  if (isElectron()) {
    // استبدال كامل: يضمن حذف أي خدمة تمت إزالتها من القائمة في قاعدة البيانات
    await window.electronAPI!.replaceServices(services);
  } else {
    localStorage.setItem('officecash_services', JSON.stringify(services));
  }
}

export async function deleteService(id: string): Promise<void> {
  if (isElectron()) {
    await window.electronAPI!.deleteService(id);
  } else {
    const services = await loadServices();
    const filtered = services.filter(s => s.id !== id);
    localStorage.setItem('officecash_services', JSON.stringify(filtered));
  }
}

function getInitialServices(): Service[] {
  return [];
}

// ==================== ENTRIES ====================

export async function loadEntries(): Promise<FinancialEntry[]> {
  if (isElectron()) {
    return await window.electronAPI!.getEntries();
  }
  const data = localStorage.getItem('officecash_entries');
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveEntries(entries: FinancialEntry[]): Promise<void> {
  if (isElectron()) {
    // استبدال كامل ضمن معاملة واحدة: يمنع التكرار ويضمن الاتساق
    await window.electronAPI!.replaceEntries(entries);
  } else {
    localStorage.setItem('officecash_entries', JSON.stringify(entries));
  }
}

// ==================== EXPENSES ====================

export async function loadExpenses(): Promise<Expense[]> {
  if (isElectron()) {
    return await window.electronAPI!.getExpenses();
  }
  const data = localStorage.getItem('officecash_expenses');
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  if (isElectron()) {
    // استبدال كامل ضمن معاملة واحدة: يمنع التكرار ويضمن الاتساق
    await window.electronAPI!.replaceExpenses(expenses);
  } else {
    localStorage.setItem('officecash_expenses', JSON.stringify(expenses));
  }
}

// ==================== DAY CLOSINGS ====================

export async function loadDayClosings(): Promise<DayClosing[]> {
  if (isElectron()) {
    return await window.electronAPI!.getDayClosings();
  }
  const data = localStorage.getItem('officecash_day_closings');
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveDayClosings(closings: DayClosing[]): Promise<void> {
  if (isElectron()) {
    // استبدال كامل ضمن معاملة واحدة: يضمن عدم وجود إغلاق مكرر لنفس التاريخ
    await window.electronAPI!.replaceDayClosings(closings);
  } else {
    localStorage.setItem('officecash_day_closings', JSON.stringify(closings));
  }
}

// ==================== ATTENDANCE (سجلات الحضور) ====================

export async function loadAttendance(): Promise<AttendanceRecord[]> {
  if (isElectron()) {
    return await window.electronAPI!.getAttendance();
  }
  const data = localStorage.getItem('officecash_attendance');
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveAttendance(records: AttendanceRecord[]): Promise<void> {
  if (isElectron()) {
    await window.electronAPI!.replaceAttendance(records);
  } else {
    localStorage.setItem('officecash_attendance', JSON.stringify(records));
  }
}

// ==================== SETTLEMENTS (التصفية والمستحقات) ====================

export async function loadSettlements(): Promise<Settlement[]> {
  if (isElectron()) {
    return await window.electronAPI!.getSettlements();
  }
  const data = localStorage.getItem('officecash_settlements');
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveSettlements(settlements: Settlement[]): Promise<void> {
  if (isElectron()) {
    await window.electronAPI!.replaceSettlements(settlements);
  } else {
    localStorage.setItem('officecash_settlements', JSON.stringify(settlements));
  }
}

// ==================== AUTH SESSION ====================

export async function loadAuthSession(): Promise<AuthSession | null> {
  if (isElectron()) {
    // استخدام Electron API بدلاً من localStorage
    return await window.electronAPI!.loadAuthSession();
  }
  const data = localStorage.getItem('officecash_auth_session');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession | null): Promise<void> {
  if (isElectron()) {
    // استخدام Electron API بدلاً من localStorage
    await window.electronAPI!.saveAuthSession(session);
  } else {
    if (session === null) {
      localStorage.removeItem('officecash_auth_session');
    } else {
      localStorage.setItem('officecash_auth_session', JSON.stringify(session));
    }
  }
}

// ==================== RESET & BACKUP ====================

export async function resetToDemoData(): Promise<void> {
  // مسح جميع البيانات - التطبيق يبدأ فارغاً
  await saveSettings(getDefaultSettings());
  await saveEmployees([]);
  await saveServices([]);
  await saveEntries([]);
  await saveExpenses([]);
  await saveDayClosings([]);
  await saveAttendance([]);
  await saveSettlements([]);
}

/**
 * مسح جميع بيانات الأعمال (الموظفين، الخدمات، المعاملات، المصروفات، إغلاقات اليوم)
 * مع الإبقاء على إعدادات المكتب وجلسة تسجيل الدخول الحالية.
 * يُستخدم عند تسجيل مكتب جديد لضمان بداية نظيفة تماماً.
 */
export async function clearAllData(): Promise<void> {
  if (isElectron()) {
    await window.electronAPI!.clearData();
  } else {
    localStorage.removeItem('officecash_employees');
    localStorage.removeItem('officecash_services');
    localStorage.removeItem('officecash_entries');
    localStorage.removeItem('officecash_expenses');
    localStorage.removeItem('officecash_day_closings');
    localStorage.removeItem('officecash_attendance');
    localStorage.removeItem('officecash_settlements');
  }
}

/**
 * حذف المكتب نهائياً: مسح كل البيانات التشغيلية + الإعدادات + جلسة المصادقة + رمز المزامنة.
 * بعد هذه العملية يعود التطبيق لشاشة تسجيل مكتب جديد تماماً.
 */
export async function deleteOffice(): Promise<void> {
  if (isElectron()) {
    await window.electronAPI!.deleteOffice();
  } else {
    localStorage.removeItem('officecash_settings');
    localStorage.removeItem('officecash_employees');
    localStorage.removeItem('officecash_services');
    localStorage.removeItem('officecash_entries');
    localStorage.removeItem('officecash_expenses');
    localStorage.removeItem('officecash_day_closings');
    localStorage.removeItem('officecash_attendance');
    localStorage.removeItem('officecash_settlements');
    localStorage.removeItem('officecash_auth_session');
    localStorage.removeItem('active_employee_id');
  }
}

export async function exportBackupJSON(): Promise<string> {
  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    settings: await loadSettings(),
    employees: await loadEmployees(),
    services: await loadServices(),
    entries: await loadEntries(),
    expenses: await loadExpenses(),
    dayClosings: await loadDayClosings(),
    attendance: await loadAttendance(),
    settlements: await loadSettlements(),
  };
  return JSON.stringify(backup, null, 2);
}

export async function importBackupJSON(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (data.settings) await saveSettings(data.settings);
    if (Array.isArray(data.employees)) await saveEmployees(data.employees);
    if (Array.isArray(data.services)) await saveServices(data.services);
    if (Array.isArray(data.entries)) await saveEntries(data.entries);
    if (Array.isArray(data.expenses)) await saveExpenses(data.expenses);
    if (Array.isArray(data.dayClosings)) await saveDayClosings(data.dayClosings);
    if (Array.isArray(data.attendance)) await saveAttendance(data.attendance);
    if (Array.isArray(data.settlements)) await saveSettlements(data.settlements);
    return true;
  } catch (err) {
    console.error('Failed to import backup:', err);
    return false;
  }
}


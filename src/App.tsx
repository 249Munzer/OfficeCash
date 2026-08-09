/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OfficeCash — نقطة الدخول الرئيسية للتطبيق.
 * يرتب providers (Auth, Toast, ErrorBoundary)، يحمل الشاشات بـ React.lazy لتقسيم الكود،
 * ويدير الحالة العامة عبر 9 custom hooks مفصولة.
 * @module App
 */

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Employee,
  FinancialEntry,
  Expense,
  DayClosing,
  OfficeSettings,
  ViewMode,
  Settlement,
} from './types';
import { getTodayDateString } from './lib/formatters';
import { makeT } from './lib/i18n';
import { clearAllData, deleteOffice, saveAuthSession } from './lib/electron-storage';
import type { OfficeRegistrationInput } from './lib/auth/registration';
import { validateSession } from './lib/auth/session';
import { AuthProvider, useAuthContext } from './auth/AuthProvider';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LandingPage, OfficeCreationResult } from './components/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, ToastContainer, useToast } from './components/Toast';
import { SplashScreen } from './components/SplashScreen';

// Lazy-loaded screens (code-split so the main bundle stays small)
const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const FastEntryModal = lazy(() => import('./components/FastEntryModal').then((m) => ({ default: m.FastEntryModal })));
const TransactionsTable = lazy(() => import('./components/TransactionsTable').then((m) => ({ default: m.TransactionsTable })));
const ExpensesManager = lazy(() => import('./components/ExpensesManager').then((m) => ({ default: m.ExpensesManager })));
const EmployeesManager = lazy(() => import('./components/EmployeesManager').then((m) => ({ default: m.EmployeesManager })));
const ServicesManager = lazy(() => import('./components/ServicesManager').then((m) => ({ default: m.ServicesManager })));
const DayClosingManager = lazy(() => import('./components/DayClosingManager').then((m) => ({ default: m.DayClosingManager })));
const ReportsScreen = lazy(() => import('./components/ReportsScreen').then((m) => ({ default: m.ReportsScreen })));
const SettingsManager = lazy(() => import('./components/SettingsManager').then((m) => ({ default: m.SettingsManager })));
const EmployeePortal = lazy(() => import('./components/EmployeePortal').then((m) => ({ default: m.EmployeePortal })));
const SettlementsScreen = lazy(() => import('./components/SettlementsScreen').then((m) => ({ default: m.SettlementsScreen })));
const PrintableReport = lazy(() => import('./components/PrintableReport').then((m) => ({ default: m.PrintableReport })));
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));

// Custom Hooks
import { useAppState } from './hooks/useAppState';
import { useP2PSync } from './hooks/useP2PSync';
import { useNavigation } from './hooks/useNavigation';
import { useEntries } from './hooks/useEntries';
import { useExpenses } from './hooks/useExpenses';
import { useEmployees } from './hooks/useEmployees';
import { useServices } from './hooks/useServices';
import { useDayClosings } from './hooks/useDayClosings';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppInner />
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  );
}

function AppInner() {
  const { showSuccess, showInfo } = useToast();
  return (
    <AuthProvider showSuccess={showSuccess} showInfo={showInfo}>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  // State Management
  const {
    settings,
    employees,
    services,
    entries,
    expenses,
    dayClosings,
    attendance,
    settlements,
    isLoading,
    updateSettings,
    setEntries,
    setExpenses,
    setEmployees,
    setServices,
    setDayClosings,
    addEntry,
    updateEntry,
    deleteEntry,
    addExpense,
    deleteExpense,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addService,
    updateService,
    deleteService,
    addAttendance,
    updateAttendance,
    addSettlement,
    updateSettlement,
    saveDayClosing,
    reloadAll,
  } = useAppState();

  // Authentication (المصدر الوحيد لحالة الجلسة)
  const {
    session: authSession,
    isAuthLoading,
    role: currentUserRole,
    activeEmployeeId,
    setSession: setAuthSession,
    selectActiveEmployee,
    loginAsEmployee,
    loginAsAdmin,
    verifyEmployeePin,
    verifySecurityAnswers,
    resetAdminPin,
    logout: handleLogout,
    createOffice,
  } = useAuthContext();

  // فحص الأمان (مرة واحدة بعد اكتمال التحميل):
  // إبطال أي جلسة منتهية الصلاحية أو لا يتطابق مكتبها مع بيانات المكتب الحالي
  const [securityCheckDone, setSecurityCheckDone] = useState(false);
  useEffect(() => {
    if (securityCheckDone || isLoading || isAuthLoading) return;
    setSecurityCheckDone(true);
    const validation = validateSession(authSession, settings);
    if (validation.valid === false && validation.reason !== 'no-session') {
      void saveAuthSession(null).then(() => setAuthSession(null));
    }
  }, [securityCheckDone, isLoading, isAuthLoading, settings, authSession, setAuthSession]);

  // P2P Sync: إعادة تحميل البيانات عند استقبال تغيير من نافذة/تبويب آخر
  const handleP2PSync = useCallback(() => {
    void reloadAll();
  }, [reloadAll]);
  const { broadcastP2PChange, syncStatus, refreshSyncStatus } = useP2PSync(handleP2PSync);

  // Navigation
  const {
    currentView,
    setCurrentView,
    isFastEntryOpen,
    setIsFastEntryOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    searchQuery,
    setSearchQuery,
  } = useNavigation();

  // تبويب الافتتاح لنافذة الدخول الموحّدة: عند طلب التبديل للإدارة من بوابة الموظف
  // نفتح مباشرة على تبويب المدير (نافذة واحدة فقط دون تركيب نوافذ فوق بعضها)
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'employee' | 'admin'>('employee');
  const openAuthModal = useCallback(
    (tab: 'employee' | 'admin') => {
      setAuthModalInitialTab(tab);
      setIsAuthModalOpen(true);
    },
    [setIsAuthModalOpen]
  );

  // استعادة الشاشة الصحيحة عند إعادة فتح التطبيق:
  // الموظف يعود دائماً إلى بوابة الموظف (وليست لوحة تحكم الإدارة التي لا قائمة جانبية
  // فيها وبالتالي لا يمكن الوصول لزر الخروج منها)
  useEffect(() => {
    if (isLoading || isAuthLoading) return;
    if (currentUserRole === 'employee' && currentView !== 'employee_portal') {
      setCurrentView('employee_portal');
    }
  }, [isLoading, isAuthLoading, currentUserRole, currentView, setCurrentView]);

  // Entries CRUD
  const { handleAddEntry, handleUpdateEntry, handleDeleteEntry } = useEntries(
    entries,
    setEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    broadcastP2PChange
  );

  // Expenses CRUD
  const { handleAddExpense, handleDeleteExpense } = useExpenses(
    expenses,
    setExpenses,
    addExpense,
    deleteExpense,
    broadcastP2PChange
  );

  // Employees CRUD
  const { handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee } = useEmployees(
    employees,
    setEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    broadcastP2PChange
  );

  // Services CRUD
  const { handleAddService, handleUpdateService, handleDeleteService } = useServices(
    services,
    setServices,
    addService,
    updateService,
    deleteService,
    broadcastP2PChange
  );

  // Day Closings
  const { handleSaveDayClosing } = useDayClosings(
    dayClosings,
    setDayClosings,
    saveDayClosing,
    broadcastP2PChange
  );

  const t = makeT(settings?.language);
  // لا تراجع صامت لأول موظف عند غياب اختيار صريح — إن لم يُختر موظف تُعرض
  // حالة «الرجاء اختيار موظف» بدلاً من إظهار بيانات موظف آخر فوق الشاشة.
  const activeEmployee = employees.find((emp: Employee) => emp.id === activeEmployeeId) || null;

  // Wrapper functions to provide required parameters from App.tsx
  const handleLoginAsEmployeeWrapper = useCallback(async (employeeId: string, pin: string): Promise<boolean> => {
    const ok = await loginAsEmployee(employeeId, pin, employees, settings || undefined);
    if (ok) setCurrentView('employee_portal');
    return ok;
  }, [loginAsEmployee, employees, settings, setCurrentView]);

  const handleLoginAsAdminWrapper = useCallback(async (adminPin: string): Promise<boolean> => {
    const ok = await loginAsAdmin(adminPin, settings || undefined);
    if (ok) setCurrentView('dashboard');
    return ok;
  }, [loginAsAdmin, settings, setCurrentView]);

  // التحقق من أسئلة الأمان قبل تعيين رمز مدير جديد (يُستخدم من مودال الاسترداد)
  const handleVerifySecurityAnswers = useCallback(
    async (answers: Array<{ questionId: string; answer: string }>) => {
      return verifySecurityAnswers(answers, settings || undefined);
    },
    [verifySecurityAnswers, settings]
  );

  const handleResetAdminPin = useCallback(
    async (answers: Array<{ questionId: string; answer: string }>, newPin: string) => {
      const result = await resetAdminPin(answers, newPin, settings || undefined);
      // مزامنة رمز المدير الجديد مع حالة التطبيق في الذاكرة حتى يعمل فوراً عند الدخول
      if (result.ok && result.settings) {
        await updateSettings(result.settings);
      }
      return result;
    },
    [resetAdminPin, settings, updateSettings]
  );

  // التحقق من الرمز السري لموظف (يُستخدم قبل تبديل الحساب من بوابة الموظف)
  const handleVerifyEmployeePin = useCallback(async (employeeId: string, pin: string): Promise<boolean> => {
    return verifyEmployeePin(employeeId, pin, employees);
  }, [verifyEmployeePin, employees]);

  const handleNavigateWithGuard = (view: ViewMode) => {
    // If employee is logged in and trying to enter restricted Admin pages, require Admin auth
    const adminOnlyViews: ViewMode[] = ['dashboard', 'employees', 'settlements', 'expenses', 'day_closing', 'settings', 'reports'];
    if (currentUserRole === 'employee' && adminOnlyViews.includes(view)) {
      openAuthModal('admin');
      return;
    }
    setCurrentView(view);
  };

  // إنشاء مكتب جديد: تحقق كامل ثم مسح البيانات القديمة ثم إعادة تحميل الحالة من التخزين
  const handleCreateNewOfficeWrapper = useCallback(async (data: OfficeRegistrationInput): Promise<OfficeCreationResult> => {
    const result = await createOffice(data);
    if (result.ok) {
      await reloadAll();
    }
    return { ok: result.ok, error: result.error };
  }, [createOffice, reloadAll]);

  // الاقتران برمز المزامنة: الانضمام الحقيقي لشبكة المكتب + حفظ الرمز في إعدادات المكتب
  const handleJoinLAN = useCallback(async (syncCode: string): Promise<OfficeCreationResult> => {
    if (!settings) return { ok: false, error: 'لا يوجد إعدادات للمكتب الحالي' };
    const code = syncCode.trim().toUpperCase();
    // 1) التحقق من صيغة الرمز قبل بدء أي انضمام
    if (!/^P2P-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return { ok: false, error: t('lpErrLanCodeFormat') };
    }
    // 2) بدء الانضمام: الجهاز يتبنّى بيانات المكتب المضيف ولا يدفع بياناته القديمة
    if (typeof window !== 'undefined' && window.electronAPI?.syncJoin) {
      try {
        const result = await window.electronAPI.syncJoin(code);
        if (result.join && !result.join.ok) {
          return { ok: false, error: t('lpErrLanJoinFailed') };
        }
      } catch (err) {
        console.error('Failed to start LAN join:', err);
        return { ok: false, error: t('lpErrLanJoinFailed') };
      }
      // 3) نجح الانضمام: لقطة المضيف حفظت إعدادات المكتب (بما فيها رمز المزامنة) داخل التخزين،
      //    لذا نعيد تحميل الحالة بالكامل من التخزين بدلاً من كتابة الإعدادات المحلية القديمة فوقها
      await reloadAll();
    } else {
      // وضع المتصفح (بدون Electron): حفظ الرمز في الإعدادات فقط
      const updated = { ...settings, networkSyncCode: code };
      await updateSettings(updated);
    }
    await refreshSyncStatus();
    return { ok: true };
  }, [settings, updateSettings, reloadAll, refreshSyncStatus, t]);

  // Printable Report state
  const [printableData, setPrintableData] = useState<{
    title: string;
    entries: FinancialEntry[];
    expenses?: Expense[];
  } | null>(null);

  const today = getTodayDateString();
  const isTodayClosed = dayClosings.some((closing: DayClosing) => closing.date === today);

  // Today stats for Header & Sidebar
  const todayEntries = useMemo(() => entries.filter((entry: FinancialEntry) => entry.date === today), [entries, today]);
  const todayExpenses = useMemo(() => expenses.filter((expense: Expense) => expense.date === today), [expenses, today]);
  const todayRevenue = useMemo(() => todayEntries.reduce((sum: number, entry: FinancialEntry) => sum + entry.amount, 0), [todayEntries]);

  // إشعارات المستحقات: للمكتب عدد التصفيات المعلّقة (قيد الانتظار/بانتظار الصرف)، وللموظف ما ينتظر تأكيده هو
  const pendingSettlementsCount = useMemo(
    () => settlements.filter((s: Settlement) => s.status === 'pending').length,
    [settlements]
  );
  const myPendingSettlementsCount = useMemo(
    () =>
      activeEmployee
        ? settlements.filter((s: Settlement) => s.employeeId === activeEmployee.id && s.status === 'pending').length
        : 0,
    [settlements, activeEmployee]
  );
  const notificationCount = currentUserRole === 'employee' ? myPendingSettlementsCount : pendingSettlementsCount;

  const handleOpenNotifications = useCallback(() => {
    if (currentUserRole === 'employee') {
      setCurrentView('employee_portal');
    } else {
      setCurrentView('settlements');
    }
  }, [currentUserRole, setCurrentView]);

  // Global F2 shortcut for instant Fast Entry Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsFastEntryOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsFastEntryOpen]);

  // Sync state to localStorage whenever modified
  const handleUpdateSettings = async (newSettings: OfficeSettings) => {
    await updateSettings(newSettings);
  };

  if (!authSession || !settings) {
    if (isLoading) {
      return <SplashScreen language={settings?.language} />;
    }
    return (
      <LandingPage
        settings={settings || {} as OfficeSettings}
        employees={employees}
        onLoginAsAdmin={handleLoginAsAdminWrapper}
        onLoginAsEmployee={handleLoginAsEmployeeWrapper}
        onCreateNewOffice={handleCreateNewOfficeWrapper}
        onJoinLAN={handleJoinLAN}
        onVerifyAnswers={handleVerifySecurityAnswers}
        onResetPin={handleResetAdminPin}
        syncStatus={syncStatus}
        onRefreshSyncStatus={refreshSyncStatus}
      />
    );
  }

  return (
    <div className="app-shell h-dvh min-h-dvh overflow-hidden bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Top Header Navbar */}
      <Header
        settings={settings}
        currentView={currentView}
        onNavigate={handleNavigateWithGuard}
        onOpenFastEntry={() => setIsFastEntryOpen(true)}
        todayRevenue={todayRevenue}
        todayEntriesCount={todayEntries.length}
        isTodayClosed={isTodayClosed}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        notificationCount={notificationCount}
        onOpenNotifications={handleOpenNotifications}
      />

      {/* Main Layout (Sidebar + Content Stage) */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto flex items-stretch bg-slate-50">
        {/* Navigation Sidebar (Only for Admin or when allowed) */}
        {currentUserRole === 'admin' && (
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigateWithGuard}
            todayEntriesCount={todayEntries.length}
            todayExpensesCount={todayExpenses.length}
            settlementsPendingCount={pendingSettlementsCount}
            language={settings.language}
          />
        )}

        {/* View Stage Content */}
        <main className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto">
          <Suspense
            fallback={
              <div className="min-h-40 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold">{t('appLoading')}</p>
              </div>
            }
          >
          {currentView === 'dashboard' && (
            <Dashboard
              entries={entries}
              expenses={expenses}
              employees={employees}
              settings={settings}
              isTodayClosed={isTodayClosed}
              onNavigate={setCurrentView}
              onOpenFastEntry={() => setIsFastEntryOpen(true)}
              onDeleteEntry={handleDeleteEntry}
            />
          )}

          {currentView === 'fast_entry' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border text-center space-y-3">
                <h2 className="text-lg font-bold text-slate-900">{t('fastEntryWindowTitle')}</h2>
                <p className="text-xs text-slate-500">
                  {t('fastEntryWindowHint')}
                </p>
                <button
                  onClick={() => setIsFastEntryOpen(true)}
                  className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md"
                >
                  {t('openFastEntryNow')}
                </button>
              </div>
            </div>
          )}

          {currentView === 'transactions' && (
            <TransactionsTable
              entries={entries}
              employees={employees}
              services={services}
              settings={settings}
              searchQuery={searchQuery}
              onOpenFastEntry={() => setIsFastEntryOpen(true)}
              onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
              onPrintReport={() =>
                setPrintableData({
                  title: t('printTransactionsReportTitle'),
                  entries: entries.filter((entry: FinancialEntry) => entry.date === today),
                  expenses: expenses.filter((expense: Expense) => expense.date === today),
                })
              }
            />
          )}

          {currentView === 'expenses' && (
            <ExpensesManager
              expenses={expenses}
              settings={settings}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {currentView === 'employees' && (
            <EmployeesManager
              employees={employees}
              entries={entries}
              settings={settings}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {currentView === 'services' && (
            <ServicesManager
              services={services}
              entries={entries}
              settings={settings}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onDeleteService={handleDeleteService}
            />
          )}

          {currentView === 'day_closing' && (
            <DayClosingManager
              entries={entries}
              expenses={expenses}
              dayClosings={dayClosings}
              employees={employees}
              settlements={settlements}
              settings={settings}
              onSaveDayClosing={handleSaveDayClosing}
              onAddSettlement={addSettlement}
              onPrintClosingReport={(closing: DayClosing) =>
                setPrintableData({
                  title: t('dayClosingReportTitle', { date: closing.date }),
                  entries: entries.filter((entry: FinancialEntry) => entry.date === closing.date),
                  expenses: expenses.filter((expense: Expense) => expense.date === closing.date),
                })
              }
            />
          )}

          {currentView === 'reports' && (
            <ReportsScreen
              entries={entries}
              expenses={expenses}
              employees={employees}
              services={services}
              settings={settings}
              onPrintReport={(_reportType: string, filteredEntries: FinancialEntry[], filteredExpenses: Expense[], title: string) =>
                setPrintableData({
                  title: t('financialReportTitle', { title }),
                  entries: filteredEntries,
                  expenses: filteredExpenses,
                })
              }
            />
          )}

          {currentView === 'employee_portal' && (
            <EmployeePortal
              activeEmployee={activeEmployee}
              employees={employees}
              services={services}
              entries={entries}
              settings={settings}
              attendance={attendance}
              settlements={settlements}
              isTodayClosed={isTodayClosed}
              currentRole={currentUserRole}
              onSelectEmployee={selectActiveEmployee}
              onVerifyEmployeePin={handleVerifyEmployeePin}
              onAddEntry={handleAddEntry}
              onAddAttendance={addAttendance}
              onUpdateAttendance={updateAttendance}
              onAddSettlement={addSettlement}
              onUpdateSettlement={updateSettlement}
              onSwitchToAdmin={() => {
                if (currentUserRole === 'employee') {
                  openAuthModal('admin');
                } else {
                  setCurrentView('dashboard');
                }
              }}
              onLogout={handleLogout}
            />
          )}

          {currentView === 'settlements' && (
            <SettlementsScreen
              settlements={settlements}
              employees={employees}
              settings={settings}
              onUpdateSettlement={updateSettlement}
            />
          )}

          {currentView === 'settings' && (
            <SettingsManager
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onLogout={handleLogout}
              onClearData={async () => {
                await clearAllData();
                await reloadAll();
              }}
              onDeleteOffice={async () => {
                await deleteOffice();
                await reloadAll();
              }}
            />
          )}
          </Suspense>
        </main>
      </div>

      {/* Fast Entry Modal Overlay */}
      <Suspense fallback={null}>
        <FastEntryModal
          isOpen={isFastEntryOpen}
          onClose={() => setIsFastEntryOpen(false)}
          employees={employees}
          services={services}
          settings={settings}
          isTodayClosed={isTodayClosed}
          onAddEntry={handleAddEntry}
        />
      </Suspense>

      {/* P2P Local Network & Auth Modal Overlay */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          employees={employees}
          settings={settings}
          activeEmployee={activeEmployee}
          onLoginAsEmployee={handleLoginAsEmployeeWrapper}
          onLoginAsAdmin={handleLoginAsAdminWrapper}
          onVerifyAnswers={handleVerifySecurityAnswers}
          onResetPin={handleResetAdminPin}
          onClose={() => setIsAuthModalOpen(false)}
          syncStatus={syncStatus}
          initialTab={authModalInitialTab}
        />
      </Suspense>

      {/* Printable Report Overlay */}
      <Suspense fallback={null}>
        {printableData && (
          <PrintableReport
            settings={settings}
            title={printableData.title}
            entries={printableData.entries}
            expenses={printableData.expenses}
            onClosePrint={() => setPrintableData(null)}
              employees={employees}
          />
        )}
      </Suspense>
    </div>
  );
}

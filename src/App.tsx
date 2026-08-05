/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Employee,
  FinancialEntry,
  Expense,
  DayClosing,
  OfficeSettings,
  ViewMode,
} from './types';
import { getTodayDateString } from './lib/formatters';
import { makeT } from './lib/i18n';
import { clearAllData, saveAuthSession } from './lib/electron-storage';
import type { OfficeRegistrationInput } from './lib/auth/registration';
import { validateSession } from './lib/auth/session';
import { AuthProvider, useAuthContext } from './auth/AuthProvider';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { FastEntryModal } from './components/FastEntryModal';
import { TransactionsTable } from './components/TransactionsTable';
import { ExpensesManager } from './components/ExpensesManager';
import { EmployeesManager } from './components/EmployeesManager';
import { ServicesManager } from './components/ServicesManager';
import { DayClosingManager } from './components/DayClosingManager';
import { ReportsScreen } from './components/ReportsScreen';
import { SettingsManager } from './components/SettingsManager';
import { PrintableReport } from './components/PrintableReport';
import { EmployeePortal } from './components/EmployeePortal';
import { AuthModal } from './components/AuthModal';
import { LandingPage, OfficeCreationResult } from './components/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, ToastContainer, useToast } from './components/Toast';

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
    saveDayClosing,
    resetToDemoData,
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
  const activeEmployee = employees.find((emp: Employee) => emp.id === activeEmployeeId) || employees[0] || null;

  // Wrapper functions to provide required parameters from App.tsx
  const handleLoginAsEmployeeWrapper = useCallback(async (employeeId: string, pin: string): Promise<boolean> => {
    return loginAsEmployee(employeeId, pin, employees, settings || undefined);
  }, [loginAsEmployee, employees, settings]);

  const handleLoginAsAdminWrapper = useCallback(async (adminPin: string): Promise<boolean> => {
    return loginAsAdmin(adminPin, settings || undefined);
  }, [loginAsAdmin, settings]);

  // التحقق من الرمز السري لموظف (يُستخدم قبل تبديل الحساب من بوابة الموظف)
  const handleVerifyEmployeePin = useCallback(async (employeeId: string, pin: string): Promise<boolean> => {
    return verifyEmployeePin(employeeId, pin, employees);
  }, [verifyEmployeePin, employees]);

  const handleNavigateWithGuard = (view: ViewMode) => {
    // If employee is logged in and trying to enter restricted Admin pages, require Admin auth
    const adminOnlyViews: ViewMode[] = ['dashboard', 'employees', 'expenses', 'day_closing', 'settings', 'reports'];
    if (currentUserRole === 'employee' && adminOnlyViews.includes(view)) {
      setIsAuthModalOpen(true);
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
      return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-600">{t('appLoading')}</p>
          </div>
        </div>
      );
    }
    return (
      <LandingPage
        settings={settings || {} as OfficeSettings}
        employees={employees}
        onLoginAsAdmin={handleLoginAsAdminWrapper}
        onLoginAsEmployee={handleLoginAsEmployeeWrapper}
        onCreateNewOffice={handleCreateNewOfficeWrapper}
        onJoinLAN={handleJoinLAN}
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
            language={settings.language}
          />
        )}

        {/* View Stage Content */}
        <main className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto">
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
              settings={settings}
              onSaveDayClosing={handleSaveDayClosing}
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
              isTodayClosed={isTodayClosed}
              currentRole={currentUserRole}
              onSelectEmployee={selectActiveEmployee}
              onVerifyEmployeePin={handleVerifyEmployeePin}
              onAddEntry={handleAddEntry}
              onSwitchToAdmin={() => {
                if (currentUserRole === 'employee') {
                  setIsAuthModalOpen(true);
                } else {
                  setCurrentView('dashboard');
                }
              }}
              onLogout={handleLogout}
            />
          )}

          {currentView === 'settings' && (
            <SettingsManager
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetDemoData={resetToDemoData}
              onClearData={async () => {
                await clearAllData();
                await reloadAll();
              }}
            />
          )}
        </main>
      </div>

      {/* Fast Entry Modal Overlay */}
      <FastEntryModal
        isOpen={isFastEntryOpen}
        onClose={() => setIsFastEntryOpen(false)}
        employees={employees}
        services={services}
        settings={settings}
        isTodayClosed={isTodayClosed}
        onAddEntry={handleAddEntry}
      />

      {/* P2P Local Network & Auth Modal Overlay */}
      <AuthModal
        isOpen={isAuthModalOpen}
        employees={employees}
        settings={settings}
        activeEmployee={activeEmployee}
        onLoginAsEmployee={handleLoginAsEmployeeWrapper}
        onLoginAsAdmin={handleLoginAsAdminWrapper}
        onClose={() => setIsAuthModalOpen(false)}
        syncStatus={syncStatus}
      />

      {/* Printable Report Overlay */}
      {printableData && (
        <PrintableReport
          settings={settings}
          title={printableData.title}
          entries={printableData.entries}
          expenses={printableData.expenses}
          onClosePrint={() => setPrintableData(null)}
        />
      )}
    </div>
  );
}

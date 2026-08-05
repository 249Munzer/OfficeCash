import React, { useState } from 'react';
import {
  UserCheck,
  PlusCircle,
  Receipt,
  Clock,
  Banknote,
  CreditCard,
  Search,
  Users,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Employee, Service, FinancialEntry, PaymentMethod, OfficeSettings } from '../types';
import {
  formatCurrency,
  formatTimeArabic,
  getPaymentMethodLabel,
  getTodayDateString,
} from '../lib/formatters';
import { makeT } from '../lib/i18n';
import { useToast } from './Toast';

interface EmployeePortalProps {
  activeEmployee: Employee | null;
  employees: Employee[];
  services: Service[];
  entries: FinancialEntry[];
  settings: OfficeSettings;
  isTodayClosed: boolean;
  currentRole: 'admin' | 'employee' | null;
  onSelectEmployee: (empId: string) => void;
  onVerifyEmployeePin: (employeeId: string, pin: string) => Promise<boolean>;
  onAddEntry: (data: {
    employeeId: string;
    employeeName: string;
    serviceId: string;
    serviceName: string;
    amount: number;
    paymentMethod: PaymentMethod;
    statement?: string;
    notes?: string;
  }) => void;
  onSwitchToAdmin: () => void;
  onLogout?: () => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  activeEmployee,
  employees,
  services,
  entries,
  settings,
  isTodayClosed,
  currentRole,
  onSelectEmployee,
  onVerifyEmployeePin,
  onAddEntry,
  onSwitchToAdmin,
  onLogout,
}) => {
  const today = getTodayDateString();
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  // Selected Service & Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [statement, setStatement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [searchMyEntries, setSearchMyEntries] = useState<string>('');
  const [showEmployeeSwitcherModal, setShowEmployeeSwitcherModal] = useState<boolean>(!activeEmployee);
  // حالة التحقق من الرمز عند تبديل الحساب من قبل موظف مسجّل دخوله
  const [pendingSwitchEmp, setPendingSwitchEmp] = useState<Employee | null>(null);
  const [switchPin, setSwitchPin] = useState<string>('');
  const [switchPinError, setSwitchPinError] = useState<string | null>(null);
  const [switchSubmitting, setSwitchSubmitting] = useState<boolean>(false);
  const { showSuccess, showError } = useToast();

  // التبديل لأي موظف: المدير يبدّل بحرية، أما الموظف فيجب إدخال الرمز السري للموظف المستهدف
  const handleEmployeeCardClick = (emp: Employee) => {
    setSwitchPinError(null);
    setSwitchPin('');
    if (activeEmployee?.id === emp.id) {
      setShowEmployeeSwitcherModal(false);
      setPendingSwitchEmp(null);
      return;
    }
    if (currentRole === 'admin') {
      onSelectEmployee(emp.id);
      setShowEmployeeSwitcherModal(false);
      return;
    }
    setPendingSwitchEmp(emp);
  };

  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSwitchEmp) return;
    setSwitchPinError(null);
    if (!switchPin.trim()) {
      setSwitchPinError(t('switchEmpPinError'));
      return;
    }
    setSwitchSubmitting(true);
    try {
      const ok = await onVerifyEmployeePin(pendingSwitchEmp.id, switchPin);
      if (ok) {
        onSelectEmployee(pendingSwitchEmp.id);
        setPendingSwitchEmp(null);
        setSwitchPin('');
        setShowEmployeeSwitcherModal(false);
      } else {
        setSwitchPinError(t('switchEmpPinError'));
      }
    } finally {
      setSwitchSubmitting(false);
    }
  };

  // Active services
  const activeServices = services.filter((s) => s.isActive);
  const activeEmployeesList = employees.filter((e) => e.isActive);

  // Filter entries to ONLY THIS EMPLOYEE for TODAY
  const myTodayEntries = entries.filter(
    (e) => e.date === today && activeEmployee && e.employeeId === activeEmployee.id
  );

  // Employee stats for today
  const myTodayRevenue = myTodayEntries.reduce((sum, e) => sum + e.amount, 0);
  const myTodayCash = myTodayEntries
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);
  const myTodayCard = myTodayEntries
    .filter((e) => e.paymentMethod === 'card')
    .reduce((sum, e) => sum + e.amount, 0);

  // Handle selecting a service card
  const handleSelectService = (srv: Service) => {
    setSelectedServiceId(srv.id);
    setAmount(srv.defaultPrice.toString());
  };

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeEmployee) {
      showError(t('alertSelectEmployee'));
      setShowEmployeeSwitcherModal(true);
      return;
    }

    if (isTodayClosed && settings.autoLockClosedDays !== false) {
      showError(t('alertDayClosed'));
      return;
    }

    const srv = services.find((s) => s.id === selectedServiceId);
    if (!srv) {
      showError(t('alertChooseService'));
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError(t('alertValidAmount'));
      return;
    }

    onAddEntry({
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.name,
      serviceId: srv.id,
      serviceName: srv.name,
      amount: numAmount,
      paymentMethod,
      statement: statement.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset Form
    setSelectedServiceId('');
    setAmount('');
    setStatement('');
    setNotes('');

    showSuccess(
      t('entrySavedToast', {
        name: srv.name,
        amount: formatCurrency(numAmount, settings.currency, lang),
      })
    );
  };

  // Filtered personal entries by search
  const filteredMyEntries = myTodayEntries.filter(
    (e) =>
      e.serviceName.toLowerCase().includes(searchMyEntries.toLowerCase()) ||
      (e.statement && e.statement.toLowerCase().includes(searchMyEntries.toLowerCase())) ||
      e.amount.toString().includes(searchMyEntries)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Employee Switcher Bar */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-lg border-2 border-white/20 text-white"
              style={{ backgroundColor: activeEmployee?.color || 'var(--oc-blue-600)' }}
            >
              {activeEmployee ? activeEmployee.name.charAt(0) : '?'}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">
                {activeEmployee ? t('welcomeBack', { name: activeEmployee.name }) : t('pleaseSelectEmployee')}
              </h1>
              <p className="text-xs text-blue-100/80 mt-1">
                {t('portalSubtitle')}
              </p>
            </div>
          </div>

          {/* Single Icon/Button for Switching Accounts & Administration */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEmployeeSwitcherModal(true)}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xs shadow-xs"
              title={t('switchAccount')}
            >
              <UserCheck className="w-4.5 h-4.5 text-blue-200" />
              <span>{t('switchAccount')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Employee Personal Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">{t('mySalesToday')}</span>
            <div className="text-xl font-extrabold text-slate-900 dir-ltr text-right">
              {formatCurrency(myTodayRevenue, settings.currency, lang)}
            </div>
            <span className="text-xs text-emerald-600 font-bold block">
              {t('totalEntriesToday', { count: myTodayEntries.length })}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">{t('cashWithMe')}</span>
            <div className="text-xl font-extrabold text-slate-900 dir-ltr text-right">
              {formatCurrency(myTodayCash, settings.currency, lang)}
            </div>
            <span className="text-xs text-slate-400 font-medium block">{t('cashHandover')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">{t('cardTransfersCollected')}</span>
            <div className="text-xl font-extrabold text-slate-900 dir-ltr text-right">
              {formatCurrency(myTodayCard, settings.currency, lang)}
            </div>
            <span className="text-xs text-slate-400 font-medium block">{t('transfersCardHint')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Form for Entry + My Personal Entries Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Main Column: Entry Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">{t('newEntryTitle')}</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {t('responsibleEmployee', { name: activeEmployee?.name || t('notSelected') })}
            </span>
          </div>

          <form onSubmit={handleSubmitEntry} className="space-y-5">
            {/* Quick Service Selector Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{t('chooseService')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {activeServices.map((srv) => {
                  const isSelected = selectedServiceId === srv.id;
                  return (
                    <button
                      type="button"
                      key={srv.id}
                      onClick={() => handleSelectService(srv)}
                      className={`p-3 rounded-2xl text-right border transition-all cursor-pointer flex flex-col justify-between h-20 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-400 ring-2 ring-blue-500/40 text-white shadow-md'
                          : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <span className="text-xs font-bold line-clamp-1 text-slate-900">{srv.name}</span>
                      <span className="text-xs font-extrabold text-blue-600 dir-ltr text-right">
                        {formatCurrency(srv.defaultPrice, settings.currency, lang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{t('amountWithCurrency', { currency: settings.currency })}</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-blue-950/80 border border-slate-200 dark:border-blue-900 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{t('paymentMethodColon')}</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-blue-950/90 border border-transparent dark:border-blue-900 p-1 rounded-xl">
                  {(['cash', 'card', 'transfer'] as PaymentMethod[]).map((pm) => (
                    <button
                      type="button"
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        paymentMethod === pm
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-blue-200 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{getPaymentMethodLabel(pm, lang)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Statement / Customer Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{t('statementOptionalLabel')}</label>
              <input
                type="text"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder={t('portalStatementPlaceholder')}
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-blue-950/80 border border-slate-200 dark:border-blue-900 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isTodayClosed}
              className={`w-full py-3.5 rounded-xl text-xs font-extrabold text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isTodayClosed
                  ? 'bg-slate-400 dark:bg-slate-700 shadow-none cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 active:scale-98'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('recordInMyName')}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Personal Entries Log (Only Active Employee Records) */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('myEntriesTitle')}</h3>
              <p className="text-xs text-slate-400">{t('myEntriesSubtitle')}</p>
            </div>
            <span className="bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-200 text-xs font-bold px-2.5 py-1 rounded-full border border-transparent dark:border-blue-900">
              {t('entriesCountBadge', { count: myTodayEntries.length })}
            </span>
          </div>

          {/* Search Bar for personal entries */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchMyEntries}
              onChange={(e) => setSearchMyEntries(e.target.value)}
              placeholder={t('searchMyEntries')}
              className="w-full pl-3 pr-8 py-2 bg-slate-100 dark:bg-blue-950/80 border border-slate-200 dark:border-blue-900 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Table / List of Personal Entries */}
          {filteredMyEntries.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-blue-900/60 rounded-2xl">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 dark:text-blue-300" />
              <p className="text-xs font-medium">{t('noEntriesYet')}</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredMyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 bg-blue-950/50 dark:bg-blue-950/70 hover:bg-blue-900/60 rounded-2xl border border-blue-900/60 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{entry.serviceName}</span>
                      <span className="text-xs bg-blue-900/80 border border-blue-700/60 text-blue-100 px-2 py-0.5 rounded-full font-medium">
                        {getPaymentMethodLabel(entry.paymentMethod, lang)}
                      </span>
                    </div>
                    {entry.statement && (
                      <p className="text-xs text-blue-200/80 line-clamp-1">{entry.statement}</p>
                    )}
                    <span className="text-xs text-blue-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeArabic(entry.time, lang)}
                    </span>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-sm font-extrabold text-white dir-ltr block">
                      {formatCurrency(entry.amount, settings.currency, lang)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Employee Switcher Modal */}
      {showEmployeeSwitcherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t('switchEmpTitle')}</h3>
              <p className="text-xs text-slate-500">
                {t('switchEmpSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
              {activeEmployeesList.map((emp) => {
                const isCurrent = activeEmployee?.id === emp.id;
                const isPending = pendingSwitchEmp?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleEmployeeCardClick(emp)}
                    className={`p-4 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : isPending
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs"
                      style={{ backgroundColor: emp.color || 'var(--oc-blue-600)' }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{emp.name}</h4>
                      <span className="text-xs text-slate-400 block">
                        {isCurrent
                          ? t('registeredEmployee')
                          : currentRole === 'admin'
                          ? t('switchEmpQuick')
                          : t('switchEmpNeedsPin')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PIN Verification Gate: يظهر فقط عند محاولة موظف تبديل حساب آخر */}
            {pendingSwitchEmp && currentRole !== 'admin' && (
              <form onSubmit={handleConfirmSwitch} className="bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    {t('switchEmpPinTitle', { name: pendingSwitchEmp.name })}
                  </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('switchEmpPinSubtitle')}
                </p>
                <input
                  type="password"
                  dir="ltr"
                  inputMode="numeric"
                  autoFocus
                  value={switchPin}
                  onChange={(e) => {
                    setSwitchPin(e.target.value);
                    setSwitchPinError(null);
                  }}
                  placeholder={t('empPinPlaceholder')}
                  className="w-full px-4 py-2.5 bg-white border border-amber-300 dark:bg-slate-950 dark:border-amber-800 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {switchPinError && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 block font-bold">{switchPinError}</span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={switchSubmitting}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-60"
                  >
                    {t('switchEmpPinBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingSwitchEmp(null);
                      setSwitchPin('');
                      setSwitchPinError(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-3 flex items-center justify-between border-t border-slate-100 gap-2">
              <button
                onClick={onSwitchToAdmin}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 py-2 px-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>{t('switchToAdmin')}</span>
              </button>
              <div className="flex items-center gap-2">
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200 px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title={t('logoutTooltip')}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('logout')}</span>
                  </button>
                )}
                {activeEmployee && (
                  <button
                    onClick={() => setShowEmployeeSwitcherModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {t('close')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

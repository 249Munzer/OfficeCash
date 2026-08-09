/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * بوابة الموظف السريعة — واجهة مبسطة لتسجيل المعاملات باسم الموظف الحالي فقط.
 * اختيار خدمة، مبلغ (تلقائي من الخدمة)، طريقة دفع، بيان اختياري، حفظ بـ Enter.
 * يعرض سجل معاملات الموظف اليوم، إجماليات نقد/شبكة، بحث، وتبديل حساب (مدير حر/موظف PIN).
 * @component
 * @param {Object} props
 * @param {Employee|null} props.activeEmployee - الموظف المسجل دخوله
 * @param {Employee[]} props.employees - للتبديل (مدير)
 * @param {Service[]} props.services - قائمة الخدمات
 * @param {FinancialEntry[]} props.entries - سجل المعاملات (مفلتر بالموظف)
 * @param {OfficeSettings} props.settings - لغة/عملة/قفل
 * @param {Function} props.onAddEntry - إضافة معاملة
 * @param {Function} props.onSwitchEmployee - تبديل موظف (مع PIN)
 * @param {Function} props.onLoginAsAdmin - دخول وضع مدير
 * @param {Function} props.onLogout - خروج للصفحة الرئيسية
 * @param {Object} props.syncStatus - حالة المزامنة للعرض
 */
import React, { useState, useEffect } from 'react';
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
  LogIn,
  Coffee,
  CalendarCheck2,
  PiggyBank,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Employee, Service, FinancialEntry, PaymentMethod, OfficeSettings, AttendanceRecord, Settlement } from '../types';
import {
  formatCurrency,
  formatTimeArabic,
  getPaymentMethodLabel,
  getTodayDateString,
} from '../lib/formatters';
import {
  attendanceForDay,
  clockInFor,
  startBreak,
  endBreak,
  finishDay,
  workedMinutes,
  formatWorkedDuration,
} from '../lib/attendance';
import {
  computeCommission,
  commissionRateForEmployee,
  isEligibleForDailyCommission,
  buildDailySettlement,
  nextVoucherNo,
  hasPendingDailySettlement,
  employeeWallet,
} from '../lib/settlement';
import { makeT, validationMessage } from '../lib/i18n';
import { validateAmount } from '../lib/validation';
import { useToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';

interface EmployeePortalProps {
  activeEmployee: Employee | null;
  employees: Employee[];
  services: Service[];
  entries: FinancialEntry[];
  settings: OfficeSettings;
  attendance: AttendanceRecord[];
  settlements: Settlement[];
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
  onAddAttendance: (record: AttendanceRecord) => void;
  onUpdateAttendance: (record: AttendanceRecord) => void;
  onAddSettlement: (settlement: Settlement) => void;
  onUpdateSettlement: (settlement: Settlement) => void;
  onSwitchToAdmin: () => void;
  onLogout?: () => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  activeEmployee,
  employees,
  services,
  entries,
  settings,
  attendance,
  settlements,
  isTodayClosed,
  currentRole,
  onSelectEmployee,
  onVerifyEmployeePin,
  onAddEntry,
  onAddAttendance,
  onUpdateAttendance,
  onAddSettlement,
  onUpdateSettlement,
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

  // اليوم الموثّق: تسجيل دخول، استراحة، إنهاء الدوام، وتأكيد استلام المستحقات
  const [confirmFinishDay, setConfirmFinishDay] = useState<boolean>(false);
  const [pendingSettlement, setPendingSettlement] = useState<Settlement | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const myAttendanceToday = activeEmployee
    ? attendanceForDay(attendance, activeEmployee.id, today)
    : null;
  const showWorkdayBar =
    !!activeEmployee &&
    (!!activeEmployee.contract?.requiresAttendance || isEligibleForDailyCommission(activeEmployee));
  const rate = activeEmployee ? commissionRateForEmployee(activeEmployee) : 0;
  const eligibleForCommission = !!activeEmployee && isEligibleForDailyCommission(activeEmployee);

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
  const todayEarned = eligibleForCommission ? computeCommission(myTodayEntries, rate) : 0;
  const wallet = activeEmployee
    ? employeeWallet(settlements, activeEmployee.id)
    : { earnedTotal: 0, pendingTotal: 0, confirmedTotal: 0, paidTotal: 0, pendingCount: 0 };
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

  // ===== اليوم الموثّق: تسجيل دخول / استراحة / إنهاء الدوام =====
  const handleClockIn = () => {
    if (!activeEmployee) {
      showError(t('alertSelectEmployee'));
      setShowEmployeeSwitcherModal(true);
      return;
    }
    if (myAttendanceToday) {
      showError(t('alreadySettledToday'));
      return;
    }
    const rec = clockInFor(activeEmployee.id, today);
    onAddAttendance(rec);
    showSuccess(t('clockInDoneToast'));
  };

  const handleToggleBreak = () => {
    if (!activeEmployee || !myAttendanceToday) {
      showError(t('needClockInFirst'));
      return;
    }
    if (myAttendanceToday.status === 'break') {
      onUpdateAttendance(endBreak(myAttendanceToday));
    } else if (myAttendanceToday.status === 'working') {
      onUpdateAttendance(startBreak(myAttendanceToday));
    }
  };

  const handleConfirmFinishDay = () => {
    if (!activeEmployee || !myAttendanceToday) {
      showError(t('needClockInFirst'));
      return;
    }
    setConfirmFinishDay(false);
    const finished = finishDay(myAttendanceToday);
    const exists = attendance.some((r) => r.id === myAttendanceToday.id);
    if (exists) {
      onUpdateAttendance(finished);
    } else {
      onAddAttendance(finished);
    }
    showSuccess(t('dayFinishedToast'));

    if (eligibleForCommission && myTodayRevenue > 0) {
      if (!hasPendingDailySettlement(settlements, activeEmployee.id, today)) {
        const newSettlement = buildDailySettlement({
          employee: activeEmployee,
          entries: myTodayEntries,
          date: today,
          voucherNo: nextVoucherNo(today, settlements),
          createdAt: new Date().toISOString(),
        });
        onAddSettlement(newSettlement);
        showSuccess(t('settlementCreatedToast', { name: activeEmployee.name }));
        setPendingSettlement(newSettlement);
      }
    } else if (eligibleForCommission && myTodayRevenue === 0) {
      showError(t('noEntriesTodayCannotSettle'));
    }
  };

  const handleConfirmReceipt = () => {
    if (!pendingSettlement) return;
    onUpdateSettlement({
      ...pendingSettlement,
      status: 'confirmed',
      employeeConfirmedAt: new Date().toISOString(),
    });
    setPendingSettlement(null);
    showSuccess(t('receiptConfirmedToast'));
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

    const amountResult = validateAmount(amount);
    if (!amountResult.isValid) {
      showError(validationMessage(amountResult.code, t) || t('alertValidAmount'));
      return;
    }
    const numAmount = parseFloat(amount);

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

      {/* Workday Bar: attendance + live wallet */}
      {showWorkdayBar && activeEmployee && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-black text-slate-900">{t('myWorkdayTitle')}</h2>
                {myAttendanceToday ? (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      myAttendanceToday.status === 'done'
                        ? 'bg-slate-100 text-slate-500'
                        : myAttendanceToday.status === 'break'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {myAttendanceToday.status === 'done'
                      ? t('statusDayDone')
                      : myAttendanceToday.status === 'break'
                        ? t('statusOnBreak')
                        : t('statusWorking')}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-50 text-slate-400">
                    {t('statusNotStarted')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {myAttendanceToday ? (
                    <>
                      {t('clockedInAt')} {formatTimeArabic(myAttendanceToday.clockIn)}
                    </>
                  ) : (
                    t('notClockedInYet')
                  )}
                </span>
                {myAttendanceToday && (
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <CalendarCheck2 className="w-3.5 h-3.5 text-blue-500" />
                    {t('workedHoursLabel')}: {formatWorkedDuration(workedMinutes(myAttendanceToday, new Date(nowTick)))}
                  </span>
                )}
                {eligibleForCommission && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <PiggyBank className="w-3.5 h-3.5 text-blue-500" />
                      {t('myCommissionRate')}: <b className="text-blue-700">{(rate * 100).toFixed(0)}%</b>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                      {t('myTodayEarned')}:
                      <b className="text-emerald-600 dir-ltr">{formatCurrency(todayEarned, settings.currency, lang)}</b>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!myAttendanceToday && (
                <button
                  onClick={handleClockIn}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  {t('clockInBtn')}
                </button>
              )}
              {myAttendanceToday && myAttendanceToday.status !== 'done' && (
                <>
                  <button
                    onClick={handleToggleBreak}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                      myAttendanceToday.status === 'break'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Coffee className="w-4 h-4" />
                    {myAttendanceToday.status === 'break' ? t('endBreakBtn') : t('startBreakBtn')}
                  </button>
                  <button
                    onClick={() => setConfirmFinishDay(true)}
                    disabled={isTodayClosed}
                    className="px-4 py-2.5 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CalendarCheck2 className="w-4 h-4" />
                    {t('finishDayBtn')}
                  </button>
                </>
              )}
              {myAttendanceToday && myAttendanceToday.status === 'done' && (
                <span className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('dayFinishedBadge')}
                </span>
              )}
            </div>
          </div>

          {/* Live Wallet Summary */}
          {eligibleForCommission && (
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
              <div className="bg-slate-50 rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-100 shadow-xs rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">{t('myTodayEarned')}</span>
                    <div className="text-lg font-extrabold text-blue-700 dir-ltr">{formatCurrency(todayEarned, settings.currency, lang)}</div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <PiggyBank className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="bg-white border border-slate-100 shadow-xs rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">{t('walletPending')}</span>
                    <div className="text-lg font-extrabold text-amber-600 dir-ltr">{formatCurrency(wallet.pendingTotal, settings.currency, lang)}</div>
                    {wallet.pendingCount > 0 && (
                      <span className="text-[11px] text-amber-500 font-bold">{t('waitingConfirmationBadge', { count: wallet.pendingCount })}</span>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="bg-white border border-slate-100 shadow-xs rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">{t('walletConfirmedPaid')}</span>
                    <div className="text-lg font-extrabold text-emerald-600 dir-ltr">{formatCurrency(wallet.confirmedTotal + wallet.paidTotal, settings.currency, lang)}</div>
                    <span className="text-[11px] text-slate-400 font-medium">{t('totalEarnedEver', { total: formatCurrency(wallet.earnedTotal, settings.currency, lang) })}</span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                onClick={() => {
                  setShowEmployeeSwitcherModal(false);
                  setPendingSwitchEmp(null);
                  setSwitchPin('');
                  onSwitchToAdmin();
                }}
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
      {/* Finish Day Confirmation */}
      {confirmFinishDay && (
        <ConfirmModal
          isOpen={confirmFinishDay}
          title={t('confirmFinishDayTitle')}
          message={t('confirmFinishDayMessage')}
          confirmText={t('finishDayBtn')}
          onConfirm={handleConfirmFinishDay}
          onClose={() => setConfirmFinishDay(false)}
          isDanger={false}
        />
      )}

      {/* Receipt Confirmation Modal: المستحقات قيد الانتظار حتى يؤكد الموظف الاستلام */}
      {pendingSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <PiggyBank className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t('confirmReceiptTitle')}</h3>
              <p className="text-xs text-slate-500">{t('confirmReceiptSubtitle')}</p>
            </div>

            <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-2xl p-5 text-white text-center shadow-lg relative overflow-hidden">
              <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <span className="text-xs text-blue-100/80 font-medium block">{t('receiptVoucher')}</span>
              <span className="text-lg font-black block mt-0.5 dir-ltr">{pendingSettlement.voucherNo}</span>
              <div className="mt-3 text-3xl font-black dir-ltr">{formatCurrency(pendingSettlement.amount, settings.currency, lang)}</div>
              <span className="text-[11px] text-blue-100/80 mt-1 block">
                {t('commissionFor', { name: activeEmployee?.name || '' })} — {(rate * 100).toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmReceipt}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-5 h-5" />
                {t('confirmReceiptBtn')}
              </button>
              <button
                onClick={() => setPendingSettlement(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                {t('confirmLaterBtn')}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">{t('receiptConfirmNote')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
